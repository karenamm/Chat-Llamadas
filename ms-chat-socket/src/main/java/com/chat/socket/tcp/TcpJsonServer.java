package com.chat.socket.tcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import org.springframework.stereotype.Component;


import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * Adaptador TCP muy simple:
 * - Lee UNA línea JSON por conexión: {"action":"...", ...}\n
 * - Devuelve UNA línea JSON con el resultado y cierra el socket.
 *
 * Ajusta las llamadas TODO: con tus servicios reales.
 */
@Component
public class TcpJsonServer {
    // Puedes mover esto a application.properties y leerlo con @Value si quieres
    private int port = 9090;

    private final ObjectMapper M = new ObjectMapper();
    private ServerSocket server;
    private ExecutorService pool;

    // Almacen “temporal” para poder probar end-to-end si aún no conectas tu lógica real
    // Map<groupId, List<items>>
    private final Map<String, List<ObjectNode>> historyByGroup = new ConcurrentHashMap<>();
    // Map<userId,  List<items>>
    private final Map<String, List<ObjectNode>> historyByUser  = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() throws IOException {
        server = new ServerSocket();
        // Bind explícito a 127.0.0.1 para evitar problemas de ::1 (IPv6)
        server.bind(new InetSocketAddress("127.0.0.1", port));
        pool = Executors.newCachedThreadPool();
        pool.submit(this::acceptLoop);
        System.out.println("[TCP] Json server escuchando en 127.0.0.1:" + port);
    }

    @PreDestroy
    public void stop() {
        try { if (server != null && !server.isClosed()) server.close(); } catch (IOException ignored) {}
        if (pool != null) pool.shutdownNow();
        System.out.println("[TCP] Json server detenido");
    }

    private void acceptLoop() {
        while (!server.isClosed()) {
            try {
                Socket s = server.accept();
                pool.submit(() -> handleClient(s));
            } catch (IOException e) {
                if (!server.isClosed()) e.printStackTrace();
            }
        }
    }

    private void handleClient(Socket s) {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
             BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(s.getOutputStream(), StandardCharsets.UTF_8))) {

            String line = br.readLine();
            if (line == null || line.isEmpty()) {
                writeLine(bw, error("empty_request"));
                return;
            }
            JsonNode in = M.readTree(line);
            String action = in.path("action").asText("");

            ObjectNode out;
            switch (action) {
                case "createGroup":
                    out = handleCreateGroup(in);
                    break;
                case "sendMessage":
                    out = handleSendMessage(in);
                    break;
                case "getHistory":
                    out = handleGetHistory(in);
                    break;
                default:
                    out = error("unknown_action").put("action", action);
            }

            writeLine(bw, out);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try { s.close(); } catch (IOException ignored) {}
        }
    }

    private void writeLine(BufferedWriter bw, ObjectNode json) throws IOException {
        bw.write(M.writeValueAsString(json));
        bw.write("\n");
        bw.flush();
    }

    // --------- Handlers de ejemplo (reemplaza con tus servicios reales) ---------

    // createGroup: {"action":"createGroup","name":"amigos","members":["ana","karen"]}
    private ObjectNode handleCreateGroup(JsonNode in) {
        String name = in.path("name").asText(null);
        if (name == null || name.isBlank()) return error("name_required");

        // TODO: llama a tu servicio real para registrar grupo y miembros
        historyByGroup.computeIfAbsent(name, k -> Collections.synchronizedList(new ArrayList<>()));

        ObjectNode ok = ok();
        ok.put("groupId", name);
        return ok;
    }

    // sendMessage:
    // {
    //   "action":"sendMessage",
    //   "toType":"group"|"user",
    //   "to":"andrea-karen",
    //   "from":"karen",
    //   "content":{"type":"text"|"audio","text": "...", "audioUrl":"..."},
    //   "createdAt": 1731111111111
    // }
    private ObjectNode handleSendMessage(JsonNode in) {
        String toType = in.path("toType").asText();
        String to = in.path("to").asText();
        String from = in.path("from").asText();
        JsonNode content = in.path("content");
        long ts = in.path("createdAt").asLong(System.currentTimeMillis());

        if (toType.isBlank() || to.isBlank() || from.isBlank() || content.isMissingNode()) {
            return error("invalid_payload");
        }

        // TODO: persiste con tus entidades/servicios reales
        ObjectNode item = M.createObjectNode();
        item.put("from", from);
        item.put("to", to);
        item.put("type", content.path("type").asText("text"));
        if (item.path("type").asText().equals("text")) {
            item.put("text", content.path("text").asText(""));
        } else {
            item.put("audioUrl", content.path("audioUrl").asText(""));
        }
        item.put("createdAt", ts);

        if ("group".equalsIgnoreCase(toType)) {
            historyByGroup.computeIfAbsent(to, k -> Collections.synchronizedList(new ArrayList<>())).add(item);
        } else {
            historyByUser.computeIfAbsent(to, k -> Collections.synchronizedList(new ArrayList<>())).add(item);
        }
        return ok().put("stored", 1);
    }

    // getHistory: {"action":"getHistory","scope":"group"|"user","id":"andrea-karen"}
    private ObjectNode handleGetHistory(JsonNode in) {
        String scope = in.path("scope").asText();
        String id = in.path("id").asText();
        ArrayNode items = M.createArrayNode();

        // TODO: consulta a tu repositorio/servicio real
        if ("group".equalsIgnoreCase(scope)) {
            List<ObjectNode> list = historyByGroup.getOrDefault(id, List.of());
            list.forEach(items::add);
        } else if ("user".equalsIgnoreCase(scope)) {
            List<ObjectNode> list = historyByUser.getOrDefault(id, List.of());
            list.forEach(items::add);
        } else {
            return error("invalid_scope");
        }
        ObjectNode out = ok();
        out.set("items", items);
        return out;
    }

    private ObjectNode ok() {
        ObjectNode n = M.createObjectNode();
        n.put("ok", true);
        return n;
    }

    private ObjectNode error(String code) {
        ObjectNode n = M.createObjectNode();
        n.put("ok", false);
        n.put("error", code);
        return n;
    }
}
