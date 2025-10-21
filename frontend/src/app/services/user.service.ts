import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../enviroments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = environment.apiBaseUrl || '';

  constructor(private http: HttpClient) {}

  getConnectedUsers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/users`).pipe(
      catchError(err => {
        console.error('Error al obtener usuarios', err);
        return throwError(() => err);
      })
    );
  }

  connectUser(username: string): Observable<void> {
    const u = encodeURIComponent(username);
    return this.http.post<void>(`${this.baseUrl}/users/connect?username=${u}`, {}).pipe(
      catchError(err => {
        console.error('Error al registrar usuario', err);
        return throwError(() => err);
      })
    );
  }
}
