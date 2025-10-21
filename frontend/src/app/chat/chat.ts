import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { ActivatedRoute } from '@angular/router';

type SignalMessage =
  | { signalType: 'offer' | 'answer'; sdp: any; user: string }
  | { signalType: 'candidate'; candidate: any; user: string }
  | { signalType: 'hangup'; user: string };

@Component({
  standalone: true,
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  // IMPORTANTE: aquí añadimos los módulos que proveen ngClass/ngStyle/ngModel/pipes
  imports: [CommonModule, FormsModule]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('remoteAudio') remoteAudioRef!: ElementRef<HTMLAudioElement>;

  roomId = 'general';
  username = '';
  message = '';
  messages: { user: string; message: string }[] = [];

  // WebRTC
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  inCall = false;

  constructor(private chatService: ChatService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // snapshot.queryParams es un objeto indexado (Params). Para evitar el error de TS hacemos un 'as any'
    const qp = this.route.snapshot.queryParams as any;
    // ahora accedemos con propiedades normales
    this.username = qp['username'] ?? this.username;
    this.roomId = qp['roomId'] ?? this.roomId;

    // Conectar al chat (mensajes chat y señalización)
    this.chatService.connect(this.roomId, (msg: any) => {
      console.log('[DBG] msg recibido desde topic:', msg);
      // Mensaje chat normal
      if (msg && typeof msg.message === 'string' && typeof msg.user === 'string') {
        this.messages.push({ user: msg.user, message: msg.message });
        return;
      }
      // Señalización WebRTC
      if (msg && (msg.signalType || msg.candidate)) {
        this.handleSignalMessage(msg as SignalMessage).catch(e => console.warn('signal handler error', e));
      }
    });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
    this.endCall(); // cleanup
  }

  sendMessage(): void {
    if (!this.message.trim()) return;
    this.chatService.sendMessage(this.roomId, { user: this.username, message: this.message });
    this.message = '';
  }

  // ----- LLAMADAS -----
  async startCall(): Promise<void> {
    if (this.inCall) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('getUserMedia no soportado');
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // crear pc y añadir tracks
      this.createPeerConnection();
      if (!this.pc) throw new Error('pc no creada');
      this.localStream.getAudioTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('[Call] offer creada', offer);

      // enviamos la señal (usa el mismo mecanismo de mensajes que ya tienes)
      this.chatService.sendMessage(this.roomId, { signalType: 'offer', sdp: offer, user: this.username } as any);
      this.inCall = true;
    } catch (err) {
      console.error('[Call] error startCall', err);
      alert('No se pudo iniciar la llamada. Revisa permisos y consola.');
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.pc) {
        this.pc.close();
        this.pc = null;
      }
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
        this.localStream = null;
      }
      this.inCall = false;
      // opcional: avisar al resto
      this.chatService.sendMessage(this.roomId, { signalType: 'hangup', user: this.username } as any);
      console.log('[Call] llamada finalizada');
    } catch (err) {
      console.warn('[Call] error endCall', err);
    }
  }

  // ----- Peer connection y eventos -----
  private createPeerConnection(): void {
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }

    const config: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.chatService.sendMessage(this.roomId, { signalType: 'candidate', candidate: ev.candidate, user: this.username } as any);
      }
    };

    this.pc.ontrack = (ev) => {
      console.log('[Call] ontrack', ev);
      const el = this.remoteAudioRef?.nativeElement;
      if (!el) return;
      if (ev.streams && ev.streams[0]) {
        el.srcObject = ev.streams[0];
      } else {
        const ms = new MediaStream();
        if (ev.track) ms.addTrack(ev.track);
        el.srcObject = ms;
      }
      el.play().catch(e => console.warn('audio play error', e));
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[Call] connectionState', this.pc?.connectionState);
    };
  }

  // ----- Señales entrantes -----
  private async handleSignalMessage(msg: SignalMessage) {
    // evita procesar tus propias señales (opcional)
    if ((msg as any).user === this.username) return;

    console.log('[Call] signal recibido', msg);

    if (msg.signalType === 'offer') {
      // callee: aseguramos stream y pc
      if (!this.localStream) {
        try { this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
        catch (e) { console.warn('No microphone for answer', e); return; }
      }
      if (!this.pc) this.createPeerConnection();
      this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.chatService.sendMessage(this.roomId, { signalType: 'answer', sdp: answer, user: this.username } as any);
      this.inCall = true;
      return;
    }

    if (msg.signalType === 'answer') {
      if (!this.pc) { console.warn('answer recibido pero pc null'); return; }
      await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      return;
    }

    if (msg.signalType === 'candidate') {
      if (!this.pc) { console.warn('candidate recibido pero pc null'); return; }
      try { await this.pc.addIceCandidate(new RTCIceCandidate((msg as any).candidate)); }
      catch (e) { console.warn('error addIceCandidate', e); }
      return;
    }

    if (msg.signalType === 'hangup') {
      this.endCall();
      return;
    }
  }

  // helper avatar color
  getAvatarColor(user: string) {
    const colors = ['#e57373', '#f06292', '#ba68c8', '#9575cd', '#64b5f6', '#4db6ac', '#dce775', '#ffb74d'];
    const idx = Math.abs(this.hashCode(user)) % colors.length;
    return colors[idx];
  }
  private hashCode(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
    return h;
  }
}
