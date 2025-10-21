package com.chat.socket.controller;

import com.chat.socket.service.ConnectedUsersService;
import org.springframework.web.bind.annotation.*;
import java.util.Set;

@RestController
// Puedes quitar esta línea y usar CorsConfig global.
// @CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    private final ConnectedUsersService connectedUsersService;

    public UserController(ConnectedUsersService connectedUsersService) {
        this.connectedUsersService = connectedUsersService;
    }

    @GetMapping("/users")
    public Set<String> getConnectedUsers() {
        return connectedUsersService.getUsers();
    }

    @PostMapping("/users/connect")
    public void connectUser(@RequestParam String username) {
        connectedUsersService.addUser(username);
    }
}
