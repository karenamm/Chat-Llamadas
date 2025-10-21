// src/app/home/home.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  username = '';
  isRegistered = false; // Usuario registrado
  chatType: 'group' | 'private' = 'group';
  roomId = '';
  targetUser = '';

  existingRooms: string[] = ['room1', 'room2'];
  connectedUsers: string[] = [];

  constructor(private router: Router, private userService: UserService) {}

  ngOnInit(): void {
    // Refresca la lista de usuarios cada 3 segundos solo si está registrado
    interval(3000).subscribe(() => {
      if (this.isRegistered) this.loadConnectedUsers();
    });
  }

  registerUser(): void {
    if (!this.username.trim() || this.isRegistered) return;

    console.log('Intentando registrar usuario:', this.username);

    this.userService.connectUser(this.username).subscribe({
      next: () => {
        console.log('Usuario registrado');
        this.isRegistered = true;
        this.loadConnectedUsers();
      },
      error: (err) => {
        console.error('Error al registrar usuario:', err);
        alert('No se pudo registrar el usuario. Revisa la consola.');
      }
    });
  }

  loadConnectedUsers(): void {
    this.userService.getConnectedUsers().subscribe(users => {
      this.connectedUsers = users.filter(u => u !== this.username);
    });
  }

  createRoom(newRoomId: string): void {
    if (newRoomId && !this.existingRooms.includes(newRoomId)) {
      this.existingRooms.push(newRoomId);
    }
    this.roomId = newRoomId;
  }

  canEnterPrivateChat(): boolean {
    return this.connectedUsers.length > 0;
  }

  enterChat(): void {
    if (!this.username.trim() || !this.isRegistered) {
      alert('Debes registrar tu nombre antes de entrar al chat.');
      return;
    }

    if (this.chatType === 'group') {
      if (!this.roomId.trim()) {
        alert('Debes seleccionar o crear un grupo.');
        return;
      }
      this.router.navigate(['/chat'], {
        queryParams: { username: this.username, chatType: 'group', roomId: this.roomId }
      });
      return;
    }

    if (this.chatType === 'private') {
      if (!this.canEnterPrivateChat()) {
        alert('No hay usuarios disponibles. Debes usar un chat grupal.');
        return;
      }
      if (!this.targetUser) {
        alert('Debes seleccionar un usuario para el chat privado.');
        return;
      }
      const roomId = this.generatePrivateRoomId(this.username, this.targetUser);
      this.router.navigate(['/chat'], {
        queryParams: { username: this.username, chatType: 'private', targetUser: this.targetUser, roomId }
      });
    }
  }

  generatePrivateRoomId(user1: string, user2: string): string {
    return [user1, user2].sort().join('-');
  }
}
