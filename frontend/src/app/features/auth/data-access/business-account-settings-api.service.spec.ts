import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BusinessAccountSettingsApiService } from './business-account-settings-api.service';

describe('BusinessAccountSettingsApiService', () => {
  let api: BusinessAccountSettingsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(BusinessAccountSettingsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current session business account without accepting an account id', () => {
    api.getMyBusinessAccount().subscribe();
    const request = http.expectOne('/api/auth/identity/me/business-account');
    expect(request.request.method).toBe('GET');
    request.flush({ business_account_id: 'account-1', user_id: 'user-1', nombre_comercial: 'Sureño' });
  });

  it('patches only the commercial name and supports clearing it', () => {
    api.updateCommercialName(null).subscribe();
    const request = http.expectOne('/api/auth/identity/me/business-account');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nombre_comercial: null });
    request.flush({ business_account_id: 'account-1', user_id: 'user-1', nombre_comercial: null });
  });
});
