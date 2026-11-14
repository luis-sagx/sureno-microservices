import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BusinessRegistrationPayload, RegistrationPayload } from '../models/registration.models';

const AUTH_API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthRegistrationApiService {
  private readonly http = inject(HttpClient);

  registerIndividual(payload: RegistrationPayload) {
    return this.http.post(`${AUTH_API}/identity/individuals`, payload);
  }

  requestBusinessAccount(payload: BusinessRegistrationPayload) {
    return this.http.post(`${AUTH_API}/identity/business-requests`, payload);
  }
}
