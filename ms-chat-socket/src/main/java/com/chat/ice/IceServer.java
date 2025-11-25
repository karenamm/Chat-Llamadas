package com.chat.ice;

import chat.ChatService;
import com.zeroc.Ice.*;

import java.lang.Exception;

public class IceServer {

    private Communicator communicator;

    public void start() {
        try {
            InitializationData initData = new InitializationData();
            initData.properties = Util.createProperties();
            // aumentar tamaño máximo por temas de audio
            initData.properties.setProperty("Ice.MessageSizeMax", "20480");

            communicator = Util.initialize(initData);

            // Adaptador con endpoint WebSocket
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    "ChatAdapter",
                    "ws -p 10000 -h 0.0.0.0"
            );

            ChatService servant = new ChatServiceI();
            adapter.add(servant, Util.stringToIdentity("ChatService"));

            adapter.activate();

            System.out.println("[ICE] ChatAdapter listening on ws://localhost:10000 (obj=ChatService)");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void stop() {
        if (communicator != null) {
            communicator.destroy();
        }
    }
}
