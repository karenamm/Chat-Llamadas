// src/main/java/com/chat/socket/dto/ChatPayload.java
package com.chat.socket.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatPayload {
    public String id;
    public String user;
    public String message;

    // Audio
    public String audioBase64; // puede venir null
    public String mimeType;    // "audio/webm" o "audio/mp4"
    public Double duration;    // segundos

    // WebRTC señalización
    public String signalType;  // "offer" | "answer" | "candidate" | "hangup"
    public Object sdp;         // Map o String
    public Object candidate;   // Map o String

    public Long createdAt;     // epoch ms
}
