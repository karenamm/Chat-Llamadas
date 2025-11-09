package com.chat.socket.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
public class UploadController {

    private static final String UPLOAD_DIR = "uploads"; // carpeta relativa al working dir

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "ext", required = false) String ext) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "file empty"));
            }
            String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
            String safeExt = (ext != null && !ext.isBlank())
                    ? ext.replaceAll("[^a-zA-Z0-9.]", "")
                    : (original.contains(".") ? original.substring(original.lastIndexOf('.') + 1) : "webm");

            Files.createDirectories(Paths.get(UPLOAD_DIR));
            String id = UUID.randomUUID().toString();
            String filename = id + "_" + Instant.now().toEpochMilli() + "." + safeExt;
            Path target = Paths.get(UPLOAD_DIR, filename);

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            // La URL pública que servimos por StaticResourceConfig
            String url = "/media/" + filename;

            Map<String, Object> resp = new HashMap<>();
            resp.put("url", url);
            resp.put("filename", filename);
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "upload failed", "message", e.getMessage()));
        }
    }
}
