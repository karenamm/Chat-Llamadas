package com.chat.socket.controller;

import com.chat.socket.dto.ChatMessage;
import com.chat.socket.service.ConnectedUsersService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.context.event.EventListener;

@Controller
public class WebSocketController {

    private final ConnectedUsersService connectedUsersService;
    private final SimpMessagingTemplate template;

    public WebSocketController(ConnectedUsersService connectedUsersService,
                               SimpMessagingTemplate template) {
        this.connectedUsersService = connectedUsersService;
        this.template = template;
    }

    @MessageMapping("/chat/{roomId}")
    public void chat(@DestinationVariable String roomId, ChatMessage message,
                     SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("[WS] RECEIVED /app/chat/" + roomId + " -> " + message.getUser() + ": " + message.getMessage()
                + "  sessionId=" + headerAccessor.getSessionId());
        if (!connectedUsersService.getUsers().contains(message.getUser())) {
            connectedUsersService.addUser(message.getUser());
        }
        // reenvía al topic (broadcast)
        template.convertAndSend("/topic/" + roomId, message);
        System.out.println("[WS] SENT to /topic/" + roomId + " : " + message);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        System.out.println("[WS] Disconnect sessionId=" + event.getSessionId());
    }
}
