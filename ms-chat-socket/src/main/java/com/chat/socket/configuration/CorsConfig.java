// src/main/java/com/chat/socket/configuration/CorsConfig.java
package com.chat.socket.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowCredentials(true);

        // Para desarrollo en LAN: permite cualquier origen http en rangos típicos y también cualquier host.
        // Si quieres ser menos permisivo, elimina "*".
        cfg.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://10.*:*",
                "http://172.*:*",
                "http://192.168.*:*",
                "*" // <-- útil cuando no sabes qué IP tendrá el cliente en clase/lab
        ));

        // Métodos, incluye OPTIONS por el preflight
        cfg.setAllowedMethods(Arrays.asList("GET","POST","PUT","DELETE","PATCH","OPTIONS"));

        // Cabeceras más comunes que envía Angular/Fetch
        cfg.setAllowedHeaders(Arrays.asList(
                "Authorization","Content-Type","X-Requested-With","Accept","Origin"
        ));

        // Cabeceras que puede leer el frontend de la respuesta
        cfg.setExposedHeaders(Arrays.asList("Authorization","Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return new CorsFilter(source);
    }
}
