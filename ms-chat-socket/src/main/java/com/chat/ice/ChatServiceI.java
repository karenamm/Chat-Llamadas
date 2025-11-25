package com.chat.ice;

import chat.*;
import com.zeroc.Ice.Current;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementación del servicio ICE que usa almacenamiento en memoria.
 * Aquí luego puedes conectar tu lógica real de backend si quieres.
 */
public class ChatServiceI implements ChatService {

    // Callbacks registrados: userId -> proxy del cliente
    private final Map<String, ChatClientPrx> clients = new ConcurrentHashMap<>();

    // Historial en memoria
    private final Map<String, List<Message>> groupHistory = new ConcurrentHashMap<>();
    private final Map<String, List<Message>> userHistory  = new ConcurrentHashMap<>();

    // Buffer de streams de audio
    private static class AudioBuffer {
        final String toType;
        final String to;
        final String fromUser;
        final String mimeType;
        final List<byte[]> parts = new ArrayList<>();
        int total = -1;

        AudioBuffer(String toType, String to, String fromUser, String mimeType) {
            this.toType = toType;
            this.to = to;
            this.fromUser = fromUser;
            this.mimeType = mimeType;
        }
    }

    private final Map<String, AudioBuffer> streams = new ConcurrentHashMap<>();

    @Override
    public void registerClient(String userId, ChatClientPrx cb, Current current) {
        clients.put(userId, cb);
        System.out.println("[ICE] registerClient user=" + userId);
    }

    @Override
    public void unregisterClient(String userId, Current current) {
        clients.remove(userId);
        System.out.println("[ICE] unregisterClient user=" + userId);
    }

    @Override
    public String createGroup(String name, String[] members, Current current) {
        groupHistory.putIfAbsent(name, Collections.synchronizedList(new ArrayList<>()));
        System.out.println("[ICE] createGroup " + name + " members=" + Arrays.toString(members));
        return name;
    }

    @Override
    public void sendText(String toType, String to, String fromUser, String text, Current current) {
        String scope = "group".equalsIgnoreCase(toType) ? "group" : "user";

        Message msg = new Message(
                UUID.randomUUID().toString(),
                fromUser,
                to,
                scope,
                MessageType.TEXT,
                text,
                "",
                System.currentTimeMillis(),
                "",
                0.0
        );

        storeMessage(msg);
        broadcastMessage(msg);
    }

    @Override
    public Message[] getHistory(String scope, String id, Current current) {
        List<Message> list;
        if ("group".equalsIgnoreCase(scope)) {
            list = groupHistory.getOrDefault(id, List.of());
        } else {
            list = userHistory.getOrDefault(id, List.of());
        }
        return list.toArray(Message[]::new);
    }

    @Override
    public String beginAudio(String toType, String to, String fromUser, String mimeType, Current current) {
        String sid = UUID.randomUUID().toString();
        streams.put(sid, new AudioBuffer(toType, to, fromUser, mimeType));
        System.out.println("[ICE] beginAudio streamId=" + sid + " from=" + fromUser + " to=" + to);
        return sid;
    }

    @Override
    public void sendAudioChunk(String streamId, int index, int total, byte[] data, Current current) {
        AudioBuffer buf = streams.get(streamId);
        if (buf == null) {
            System.out.println("[ICE] sendAudioChunk: stream no encontrado " + streamId);
            return;
        }
        buf.total = total;

        // Aseguramos tamaño de la lista
        while (buf.parts.size() <= index) {
            buf.parts.add(null);
        }
        buf.parts.set(index, data);

        // Enviar chunk en tiempo real a todos los clientes
        for (ChatClientPrx cb : clients.values()) {
            try {
                cb.onAudioChunk(streamId, index, total, data, buf.mimeType);
            } catch (Exception e) {
                System.out.println("[ICE] error onAudioChunk: " + e.getMessage());
            }
        }
    }

    @Override
    public void endAudio(String streamId, double duration, Current current) {
        AudioBuffer buf = streams.remove(streamId);
        if (buf == null) {
            System.out.println("[ICE] endAudio: stream no encontrado " + streamId);
            return;
        }

        String scope = "group".equalsIgnoreCase(buf.toType) ? "group" : "user";

        // Guardamos un mensaje de tipo AUDIO en el historial
        Message msg = new Message(
                UUID.randomUUID().toString(),
                buf.fromUser,
                buf.to,
                scope,
                MessageType.AUDIO,
                "",
                "", // aquí podrías poner una URL si decides guardar el archivo real
                System.currentTimeMillis(),
                buf.mimeType,
                duration
        );
        storeMessage(msg);

        // Notificar fin de audio
        for (ChatClientPrx cb : clients.values()) {
            try {
                cb.onAudioEnd(streamId, buf.to, buf.fromUser, buf.mimeType, duration);
            } catch (Exception e) {
                System.out.println("[ICE] error onAudioEnd: " + e.getMessage());
            }
        }

        // Opcional: también podemos notificar el mensaje como tal
        broadcastMessage(msg);
    }

    // ----- helpers -----

    private void storeMessage(Message m) {
        if ("group".equalsIgnoreCase(m.scope)) {
            groupHistory
                    .computeIfAbsent(m.to, k -> Collections.synchronizedList(new ArrayList<>()))
                    .add(m);
        } else {
            userHistory
                    .computeIfAbsent(m.to, k -> Collections.synchronizedList(new ArrayList<>()))
                    .add(m);
        }
    }

    private void broadcastMessage(Message m) {
        for (ChatClientPrx cb : clients.values()) {
            try {
                cb.onMessage(m);
            } catch (Exception e) {
                System.out.println("[ICE] error onMessage: " + e.getMessage());
            }
        }
    }
}
