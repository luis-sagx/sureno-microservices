import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessRegistrationPayload, LoginPayload, LoginResponse, RegistrationPayload } from '../models/auth.models';

const AUTH_API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${AUTH_API}/sessions`, payload, {
      withCredentials: true,
    });
  }

  currentSession() {
    return this.http.get<{
      userId: string;
      username: string;
      roles: string[];
      estado_verificacion: string;
      estado_solicitud: string | null;
    }>(`${AUTH_API}/sessions/me`, { withCredentials: true });
  }

  logout() {
    return this.http.post<void>(`${AUTH_API}/sessions/logout`, null, {
      withCredentials: true,
    });
  }

  registerIndividual(payload: RegistrationPayload) {
    return this.http.post(`${AUTH_API}/identity/individuals`, payload);
  }

  requestBusinessAccount(payload: BusinessRegistrationPayload) {
    return this.http.post(`${AUTH_API}/identity/business-requests`, payload);
  }
}
