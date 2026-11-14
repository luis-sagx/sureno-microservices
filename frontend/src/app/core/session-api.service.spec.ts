import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionApiService } from './session-api.service';

describe('SessionApiService', () => {
  let api: SessionApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(SessionApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the existing credentialed session endpoints', () => {
    api.login({ username: 'user', password: 'secret' }).subscribe();
    const login = http.expectOne('/api/auth/sessions');
    expect(login.request.method).toBe('POST');
    expect(login.request.withCredentials).toBe(true);
    login.flush({ user_id: 'user-id', username: 'user', roles: [], estado_verificacion: 'VERIFIED', session_expires_in_seconds: 300 });

    api.currentSession().subscribe();
    const current = http.expectOne('/api/auth/sessions/me');
    expect(current.request.method).toBe('GET');
    expect(current.request.withCredentials).toBe(true);
    current.flush({ userId: 'user-id', username: 'user', roles: [], estado_verificacion: 'VERIFIED', estado_solicitud: null });

    api.logout().subscribe();
    const logout = http.expectOne('/api/auth/sessions/logout');
    expect(logout.request.method).toBe('POST');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush(null);
  });
});
