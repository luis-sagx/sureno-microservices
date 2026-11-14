import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface BusinessAccountSettings {
  nombre_comercial: string | null;
}

const AUTH_API = '/api/auth';
const MY_BUSINESS_ACCOUNT = `${AUTH_API}/identity/me/business-account`;

@Injectable({ providedIn: 'root' })
export class BusinessAccountSettingsApiService {
  private readonly http = inject(HttpClient);

  getMyBusinessAccount() {
    return this.http.get<BusinessAccountSettings>(MY_BUSINESS_ACCOUNT);
  }

  updateCommercialName(nombre_comercial: string | null) {
    return this.http.patch<BusinessAccountSettings>(MY_BUSINESS_ACCOUNT, { nombre_comercial });
  }
}
