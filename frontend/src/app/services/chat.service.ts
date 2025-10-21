// src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../enviroments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private client!: Client;

  connect(roomId: string, onMessage: (msg: any) => void) {
    console.log('[ChatService] Connecting to', environment.wsUrl, 'room=', roomId);

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 3000,
    });

    this.client.onConnect = (frame) => {
      console.log('[ChatService] STOMP connected', frame);
      this.client.subscribe(`/topic/${roomId}`, (message: IMessage) => {
        try {
          const body = JSON.parse(message.body);
          console.log('[ChatService] Received', body);
          onMessage(body);
        } catch (e) {
          console.error('[ChatService] parse error', e);
        }
      });
    };

    this.client.onStompError = (err) => {
      console.error('[ChatService] STOMP error', err);
    };

    this.client.onWebSocketClose = (evt) => {
      console.warn('[ChatService] WS closed', evt);
    };

    this.client.activate();
  }

  sendMessage(roomId: string, payload: { message: string; user: string }) {
    if (!this.client || !this.client.active) {
      console.warn('[ChatService] No STOMP connection, message not sent');
      return;
    }
    const dest = `/app/chat/${roomId}`;
    console.log('[ChatService] Publishing to', dest, payload);
    this.client.publish({ destination: dest, body: JSON.stringify(payload) });
  }

  disconnect() {
    if (this.client && this.client.active) this.client.deactivate();
  }
}
