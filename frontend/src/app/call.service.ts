import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class CallService {
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;
  remoteAudio!: HTMLAudioElement;

  stompClient: any;

  constructor() {}

  async initLocalStream() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection();

    // Añadir audio local
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

    // Reproducir audio remoto
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteAudio) {
        this.remoteAudio = document.createElement('audio');
        this.remoteAudio.autoplay = true;
        document.body.appendChild(this.remoteAudio);
      }
      this.remoteAudio.srcObject = event.streams[0];
    };
  }

  connectSignaling(url: string, onMessage: (msg: any) => void) {
    const socket = new SockJS(url);
    this.stompClient = Stomp.over(socket);

    // Solo callback sin frame
    this.stompClient.connect({}, () => {
      console.log('Connected to signaling server');
      this.stompClient.subscribe('/topic/call', (message: any) => {
        onMessage(JSON.parse(message.body));
      });
    });
  }

  sendSignalingMessage(msg: any) {
    if (this.stompClient) {
      this.stompClient.send('/app/call', {}, JSON.stringify(msg));
    }
  }
}
