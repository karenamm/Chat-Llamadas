import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="topbar">
      <a routerLink="/">Home</a>
      <a routerLink="/chat">Chat</a>
    </nav>
    <router-outlet/>
  `,
  styles: [`
    .topbar{display:flex;gap:12px;padding:12px;border-bottom:1px solid #ddd}
    a{text-decoration:none}
  `]
})
export class AppComponent {}
