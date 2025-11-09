package com.chat.socket.controller;

import com.chat.socket.service.ConnectedUsersService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Controller
public class WebSocketController {

    private final ConnectedUsersService connectedUsersService;
    private final SimpMessagingTemplate template;

    public WebSocketController(ConnectedUsersService connectedUsersService,
                               SimpMessagingTemplate template) {
        this.connectedUsersService = connectedUsersService;
        this.template = template;
    }

    // Acepta CUALQUIER JSON: texto, señalización WebRTC y audio (chunked)
    @MessageMapping("/chat/{roomId}")
    public void chat(@DestinationVariable String roomId,
                     Map<String, Object> payload,
                     SimpMessageHeaderAccessor headerAccessor) {

        String user = payload != null && payload.get("user") != null
                ? String.valueOf(payload.get("user"))
                : "anon";

        System.out.println("[WS] /app/chat/" + roomId + " <- " + user +
                " keys=" + (payload != null ? payload.keySet() : "null") +
                " session=" + headerAccessor.getSessionId());

        if (user != null && !connectedUsersService.getUsers().contains(user)) {
            connectedUsersService.addUser(user);
        }

        // 🔁 Relay "tal cual": preserva audioBase64/chunks, signalType, candidate, etc.
        template.convertAndSend("/topic/" + roomId, payload);
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        System.out.println("[WS] Disconnect session=" + event.getSessionId());
    }
}
