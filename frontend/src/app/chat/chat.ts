import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { ActivatedRoute } from '@angular/router';

type SignalMessage =
  | { signalType: 'offer' | 'answer'; sdp: any; user: string }
  | { signalType: 'candidate'; candidate: any; user: string }
  | { signalType: 'hangup'; user: string };

type AudioPayload = { url: string; mime: string; duration: number; };
type ChatMsg = {
  id: string;
  user: string;
  message?: string;
  audio?: AudioPayload;
  createdAt: number;
  isPlaying?: boolean;
  currentTime: number;
};

@Component({
  standalone: true,
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  imports: [CommonModule, FormsModule]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('remoteAudio') remoteAudioRef!: ElementRef<HTMLAudioElement>;

  roomId = 'general';
  username = '';
  message = '';

  messages: ChatMsg[] = [];
  private seenIds = new Set<string>();

  // --- WebRTC ---
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  inCall = false;

  // --- Grabación ---
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: BlobPart[] = [];
  private recordMime = 'audio/webm';
  isRecording = false;
  recordStart = 0;
  recordTimer?: any;
  recordElapsed = 0;

  // --- Estrategia de envío ---
  private readonly STOMP_THRESHOLD = 300_000; // 300 KB: debajo de esto usamos STOMP chunked; encima, HTTP upload
  private readonly AUDIO_CHUNK_SIZE = 60_000; // 60 KB por chunk STOMP

  // Ensamblado de chunks
  private incomingChunks: Record<string, {
    parts: string[];
    total: number;
    user: string;
    mime: string;
    createdAt: number;
    duration: number;
  }> = {};

  // Player
  private currentAudioEl: HTMLAudioElement | null = null;
  private currentMsgId: string | null = null;

  constructor(private chatService: ChatService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const qp = this.route.snapshot?.queryParams || {};
    this.username = qp['username'] || this.username;
    this.roomId = qp['roomId'] || this.roomId;

    this.chatService.connect(this.roomId, (msg: any) => {
      try {
        if (msg?.id && this.seenIds.has(msg.id)) return;

        // 1) Texto
        if (msg && typeof msg.message === 'string' && typeof msg.user === 'string') {
          const item: ChatMsg = {
            id: msg.id || this.uuid(),
            user: msg.user,
            message: msg.message,
            createdAt: msg.createdAt || Date.now(),
            currentTime: 0
          };
          this.seenIds.add(item.id);
          this.messages.push(item);
          return;
        }

        // 2) Audio por URL (via HTTP)
        if (msg && msg.type === 'audio-url' && msg.url && typeof msg.user === 'string') {
          const item: ChatMsg = {
            id: msg.id || this.uuid(),
            user: msg.user,
            audio: { url: msg.url, mime: msg.mimeType || 'audio/webm', duration: msg.duration || 0 },
            message: '(audio)',
            createdAt: msg.createdAt || Date.now(),
            currentTime: 0
          };
          this.seenIds.add(item.id);
          this.messages.push(item);
          // si no vino duración, intenta leerla
          if (!item.audio!.duration) {
            const tmp = new Audio(item.audio!.url);
            tmp.onloadedmetadata = () => item.audio!.duration = tmp.duration || 0;
          }
          return;
        }

        // 3) CHUNKS STOMP (robusto)
        if (msg && msg.type === 'audio-chunk' && msg.id && typeof msg.index === 'number') {
          const id = String(msg.id);
          const total = Number(msg.total || 0) || 0;

          let entry = this.incomingChunks[id];
          if (!entry) {
            entry = this.incomingChunks[id] = {
              parts: total > 0 ? new Array<string>(total) : [],
              total,
              user: msg.user || 'anon',
              mime: msg.mimeType || 'audio/webm',
              createdAt: msg.createdAt || Date.now(),
              duration: msg.duration || 0
            };
          } else {
            if (total > 0 && entry.total !== total) {
              const old = entry.parts;
              entry.parts = new Array<string>(total);
              for (let i = 0; i < old.length && i < total; i++) entry.parts[i] = old[i];
              entry.total = total;
            }
          }

          if (entry.total > 0 && msg.index >= 0 && msg.index < entry.total) {
            entry.parts[msg.index] = String(msg.chunk || '');
          }

          if (entry.total > 0 && entry.parts.length === entry.total && entry.parts.every(Boolean)) {
            this.assembleAndPushAudio(id, entry);
            delete this.incomingChunks[id];
          }
          return;
        }

        if (msg && msg.type === 'audio-end' && msg.id) {
          const id = String(msg.id);
          let entry = this.incomingChunks[id];

          if (!entry) {
            entry = this.incomingChunks[id] = {
              parts: Number(msg.total || 0) > 0 ? new Array<string>(Number(msg.total)) : [],
              total: Number(msg.total || 0) || 0,
              user: msg.user || 'anon',
              mime: msg.mimeType || 'audio/webm',
              createdAt: msg.createdAt || Date.now(),
              duration: msg.duration || 0
            };
          } else {
            if (Number(msg.total || 0) > 0) {
              const total = Number(msg.total);
              if (entry.total !== total) {
                const old = entry.parts;
                entry.parts = new Array<string>(total);
                for (let i = 0; i < old.length && i < total; i++) entry.parts[i] = old[i];
                entry.total = total;
              }
            }
            entry.mime = msg.mimeType || entry.mime;
            entry.duration = typeof msg.duration === 'number' ? msg.duration : entry.duration;
          }

          if (entry.total > 0 && entry.parts.length === entry.total && entry.parts.every(Boolean)) {
            this.assembleAndPushAudio(id, entry);
            delete this.incomingChunks[id];
          } else {
            setTimeout(() => {
              const e = this.incomingChunks[id];
              if (e && (!e.parts.length || !e.parts.every(Boolean))) {
                delete this.incomingChunks[id];
                console.warn('[audio] GC: descartado id', id);
              }
            }, 30_000);
          }
          return;
        }

        // 4) Señalización WebRTC
        if (msg && (msg.signalType || msg.candidate)) {
          this.handleSignalMessage(msg as SignalMessage).catch(e => console.warn('signal handler error', e));
          return;
        }
      } catch (e) {
        console.warn('[onMessage] error', e, msg);
      }
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.endCall();
    this.stopRecording(false);
    this.stopPlayback();
  }

  // -------- Texto --------
  sendMessage(): void {
    const text = this.message.trim();
    if (!text) return;
    const payload = { id: this.uuid(), user: this.username, message: text, createdAt: Date.now() };
    this.seenIds.add(payload.id);
    this.messages.push({ ...payload, currentTime: 0 });
    this.chatService.sendMessage(this.roomId, payload);
    this.message = '';
  }

  getAvatarColor(u: string) {
    let hash = 0;
    for (let i = 0; i < u.length; i++) hash = (hash << 5) - hash + u.charCodeAt(i);
    return `hsl(${Math.abs(hash) % 360},70%,60%)`;
  }

  // -------- Grabación push-to-talk --------
  pttDown(e: Event) { e.preventDefault(); if (!this.isRecording) this.startRecording(); }
  pttUp(e: Event)   { e.preventDefault(); if (this.isRecording) this.stopRecording(true); }
  pttCancel(_: Event) { if (this.isRecording) this.stopRecording(false); }

  private pickMime(): string {
    const c = ['audio/webm;codecs=opus','audio/webm','audio/mp4;codecs=mp4a.40.2','audio/mp4'];
    // @ts-ignore
    return window.MediaRecorder ? c.find(m => MediaRecorder.isTypeSupported(m)) || '' : '';
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const mime = this.pickMime();
      this.recordMime = mime || 'audio/webm';
      this.mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = () => stream.getTracks().forEach(t => t.stop());
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordStart = Date.now();
      this.recordElapsed = 0;
      this.recordTimer = setInterval(() => { this.recordElapsed = Date.now() - this.recordStart; }, 200);
    } catch (e) { console.warn('no mic', e); }
  }

  private async stopRecording(send: boolean) {
    if (!this.mediaRecorder) return;
    try {
      (this.mediaRecorder as any).requestData?.();
      this.mediaRecorder.stop();
      await new Promise(r => this.mediaRecorder?.addEventListener('stop', () => r(null), { once: true }));

      clearInterval(this.recordTimer);
      this.isRecording = false;

      const blob = new Blob(this.audioChunks, { type: this.recordMime });
      if (send && blob.size > 0) {
        const duration = await this.getBlobDuration(blob).catch(() => 0);
        const id = this.uuid();
        const createdAt = Date.now();

        // Eco local inmediato
        const localUrl = URL.createObjectURL(blob);
        this.messages.push({
          id, user: this.username,
          audio: { url: localUrl, mime: this.recordMime, duration },
          message: '(audio)', createdAt, currentTime: 0
        });
        this.seenIds.add(id);

        // Decide estrategia
        if (blob.size > this.STOMP_THRESHOLD) {
          // Sube por HTTP y manda URL
          const url = await this.uploadAudio(blob, this.recordMime);
          this.chatService.sendMessage(this.roomId, {
            id, type: 'audio-url', url, mimeType: this.recordMime, duration, user: this.username, createdAt
          } as any);
        } else {
          // STOMP (fragmentado)
          const base64 = await this.blobToBase64(blob);
          await this.sendAudioInChunks({ id, user: this.username, base64, mimeType: this.recordMime, duration, createdAt });
        }
      }
    } finally {
      this.mediaRecorder = null;
      this.audioChunks = [];
      clearInterval(this.recordTimer);
      this.recordTimer = undefined;
    }
  }

  private async uploadAudio(blob: Blob, mime: string): Promise<string> {
    const fd = new FormData();
    // decide extensión
    const ext = mime.includes('mp4') ? 'm4a' : 'webm';
    fd.append('file', blob, `voice.${ext}`);
    fd.append('ext', ext);
    // Ajusta la URL si tu backend corre en otro host/puerto
    const res = await fetch('/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json?.url) throw new Error('upload failed');
    return json.url as string; // p.ej. /media/uuid_...webm
  }

  private async sendAudioInChunks(p: { id: string; user: string; base64: string; mimeType: string; duration: number; createdAt: number }) {
    const total = Math.ceil(p.base64.length / this.AUDIO_CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const start = i * this.AUDIO_CHUNK_SIZE;
      const end = start + this.AUDIO_CHUNK_SIZE;
      const chunk = p.base64.slice(start, end);
      this.chatService.sendMessage(this.roomId, {
        type: 'audio-chunk',
        id: p.id, index: i, total, chunk,
        mimeType: p.mimeType, user: p.user, createdAt: p.createdAt, duration: p.duration
      } as any);
      // pequeñísimo respiro para no saturar el broker
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 2));
    }
    this.chatService.sendMessage(this.roomId, {
      type: 'audio-end',
      id: p.id, total,
      mimeType: p.mimeType, user: p.user, createdAt: p.createdAt, duration: p.duration
    } as any);
  }

  // -------- Player --------
  togglePlay(m: ChatMsg) {
    if (!m.audio) return;
    if (this.currentMsgId && this.currentMsgId !== m.id) this.stopPlayback();

    if (!this.currentAudioEl) {
      this.currentAudioEl = new Audio(m.audio.url);
      this.currentAudioEl.currentTime = m.currentTime || 0;
      this.currentAudioEl.ontimeupdate = () => m.currentTime = this.currentAudioEl!.currentTime || 0;
      this.currentAudioEl.onended = () => { m.isPlaying = false; m.currentTime = 0; this.stopPlayback(); };
      this.currentAudioEl.onpause = () => m.isPlaying = false;
      this.currentAudioEl.onplay = () => m.isPlaying = true;
      this.currentMsgId = m.id;
    }

    if (m.isPlaying) this.currentAudioEl.pause();
    else this.currentAudioEl.play().catch(e => console.warn('play error', e));
  }

  stopPlayback() {
    if (this.currentAudioEl) {
      this.currentAudioEl.pause();
      this.currentAudioEl.ontimeupdate = null;
      this.currentAudioEl.onended = null;
      this.currentAudioEl.onpause = null;
      this.currentAudioEl.onplay = null;
      this.currentAudioEl = null;
    }
    if (this.currentMsgId) {
      const m = this.messages.find(x => x.id === this.currentMsgId);
      if (m) m.isPlaying = false;
      this.currentMsgId = null;
    }
  }

  seek(m: ChatMsg, e: MouseEvent) {
    if (!m.audio) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const t = (m.audio.duration || 0) * ratio;
    if (this.currentAudioEl && this.currentMsgId === m.id) this.currentAudioEl.currentTime = t;
    m.currentTime = t;
  }

  formatTime(sec?: number) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  // -------- WebRTC --------
  async startCall(): Promise<void> {
    if (this.inCall) return;
    if (!navigator.mediaDevices?.getUserMedia) { alert('getUserMedia no soportado'); return; }

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.createPeerConnection();
    if (!this.pc) throw new Error('pc no creada');
    this.localStream.getAudioTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.chatService.sendMessage(this.roomId, { signalType: 'offer', sdp: offer, user: this.username } as any);
    this.inCall = true;
  }

  private createPeerConnection() {
    if (this.pc) return;
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (this.remoteAudioRef?.nativeElement) this.remoteAudioRef.nativeElement.srcObject = remoteStream;
    };
    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.chatService.sendMessage(this.roomId, { signalType: 'candidate', candidate: ev.candidate, user: this.username } as any);
      }
    };
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (['disconnected','failed','closed'].includes(this.pc.connectionState)) this.endCall();
    };
  }

  private async handleSignalMessage(m: SignalMessage): Promise<void> {
    if ((m as any).user === this.username) return;
    if (!this.pc) this.createPeerConnection();

    if (m.signalType === 'offer') {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.localStream.getAudioTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));
      }
      await this.pc!.setRemoteDescription(new RTCSessionDescription(m.sdp));
      const ans = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(ans);
      this.chatService.sendMessage(this.roomId, { signalType: 'answer', sdp: ans, user: this.username } as any);
      this.inCall = true;

    } else if (m.signalType === 'answer') {
      await this.pc!.setRemoteDescription(new RTCSessionDescription(m.sdp));

    } else if (m.signalType === 'candidate') {
      try { await this.pc!.addIceCandidate(new RTCIceCandidate(m.candidate)); }
      catch (e) { console.warn('addIceCandidate error', e); }

    } else if (m.signalType === 'hangup') {
      this.endCall();
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.pc) {
        this.pc.getSenders().forEach(s => this.pc!.removeTrack(s));
        this.pc.onicecandidate = null;
        this.pc.ontrack = null;
        this.pc.close();
        this.pc = null;
      }
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
        this.localStream = null;
      }
      this.inCall = false;
      this.chatService.sendMessage(this.roomId, { signalType: 'hangup', user: this.username } as any);
    } catch (err) {
      console.warn('[Call] error endCall', err);
    }
  }

  // -------- Utils --------
  private uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        res(base64);
      };
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string, mime = 'application/octet-stream'): Blob {
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNums);
    return new Blob([byteArray], { type: mime });
  }

  private getBlobDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const a = new Audio();
      const url = URL.createObjectURL(blob);
      a.src = url;
      a.addEventListener('loadedmetadata', () => {
        const d = a.duration || 0;
        URL.revokeObjectURL(url);
        resolve(isFinite(d) ? d : 0);
      });
      a.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });
  }

  private assembleAndPushAudio(id: string, entry: { parts: string[]; total: number; user: string; mime: string; createdAt: number; duration: number }) {
    try {
      const base64 = entry.parts.join('');
      const blob = this.base64ToBlob(base64, entry.mime);
      const url = URL.createObjectURL(blob);
      const item: ChatMsg = {
        id,
        user: entry.user,
        audio: { url, mime: entry.mime, duration: entry.duration || 0 },
        message: '(audio)',
        createdAt: entry.createdAt,
        currentTime: 0
      };
      this.seenIds.add(id);
      this.messages.push(item);
      if (!item.audio!.duration) {
        const tmp = new Audio(url);
        tmp.onloadedmetadata = () => { item.audio!.duration = tmp.duration || 0; };
      }
    } catch (err) {
      console.warn('[audio] ensamblado falló para id', id, err);
    }
  }
}
