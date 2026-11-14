import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthUser, LoginPayload, LoginResponse } from './session.models';

const AUTH_API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${AUTH_API}/sessions`, payload, { withCredentials: true });
  }

  currentSession(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${AUTH_API}/sessions/me`, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${AUTH_API}/sessions/logout`, null, { withCredentials: true });
  }
}
