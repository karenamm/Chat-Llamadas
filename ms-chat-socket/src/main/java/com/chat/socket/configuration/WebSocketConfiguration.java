package com.chat.socket.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfiguration implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat-socket")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                // ⬇️ Límites útiles para notas de voz usando SockJS
                .setStreamBytesLimit(1024 * 1024)   // 1 MB por stream
                .setHttpMessageCacheSize(2000)
                .setDisconnectDelay(30_000);
    }

    // ⬆️ Límites de transporte STOMP/WebSocket en el lado servidor
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        registry.setMessageSizeLimit(1024 * 1024);        // 1 MB por mensaje
        registry.setSendBufferSizeLimit(2 * 1024 * 1024); // 2 MB buffer total
        registry.setSendTimeLimit(30 * 1000);             // 30 s para enviar
    }
}
