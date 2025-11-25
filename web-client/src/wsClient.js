import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;
let currentRoomId = null;
let onMessageCallback = null;

// Conecta al backend STOMP /chat-socket y se suscribe a /topic/{roomId}
export function connectWs(roomId, onMessage) {
  currentRoomId = roomId;
  onMessageCallback = onMessage;

  stompClient = new Client({
    // Usamos SockJS en vez de brokerURL directo
    webSocketFactory: () => new SockJS("http://localhost:8080/chat-socket"),
    reconnectDelay: 5000,
    debug: (str) => console.log("[STOMP]", str)
  });

  stompClient.onConnect = () => {
    console.log("[STOMP] Conectado, suscribiendo a sala", roomId);

    stompClient.subscribe(`/topic/${roomId}`, (message) => {
      try {
        const payload = JSON.parse(message.body);
        if (onMessageCallback) onMessageCallback(payload);
      } catch (e) {
        console.error("Error parseando mensaje STOMP", e);
      }
    });
  };

  stompClient.onStompError = (frame) => {
    console.error("[STOMP] Error en frame", frame);
  };

  stompClient.activate();
}

export function sendWsMessage(roomId, payload) {
  if (!stompClient || !stompClient.connected) {
    console.warn("[STOMP] No conectado todavía");
    return;
  }
  stompClient.publish({
    destination: `/app/chat/${roomId}`,
    body: JSON.stringify(payload)
  });
}
