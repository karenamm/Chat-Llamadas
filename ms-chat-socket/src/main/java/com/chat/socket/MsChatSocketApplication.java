package com.chat.socket;

import com.chat.ice.IceServer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MsChatSocketApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsChatSocketApplication.class, args);
    }

    @Bean
    public CommandLineRunner startIceOnStartup() {
        return args -> {
            Thread iceThread = new Thread(() -> {
                IceServer server = new IceServer();
                server.start();
            }, "IceServerThread");
            iceThread.setDaemon(true);
            iceThread.start();
        };
    }
}
