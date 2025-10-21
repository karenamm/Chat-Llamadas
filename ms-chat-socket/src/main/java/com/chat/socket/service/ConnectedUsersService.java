package com.chat.socket.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Service
public class ConnectedUsersService {

    // Lista de usuarios en memoria
    private final Set<String> users = Collections.synchronizedSet(new HashSet<>());

    // Devuelve todos los usuarios conectados
    public Set<String> getUsers() {
        return users;
    }

    // Agrega un usuario
    public void addUser(String username) {
        users.add(username);
    }

    // Quita un usuario
    public void removeUser(String username) {
        users.remove(username);
    }
}
