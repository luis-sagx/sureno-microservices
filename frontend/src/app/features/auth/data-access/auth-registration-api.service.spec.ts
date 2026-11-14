import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthRegistrationApiService } from './auth-registration-api.service';

describe('AuthRegistrationApiService', () => {
  let api: AuthRegistrationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuthRegistrationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps individual and business registration endpoints under the auth feature', () => {
    api.registerIndividual({} as never).subscribe();
    const individual = http.expectOne('/api/auth/identity/individuals');
    expect(individual.request.method).toBe('POST');
    individual.flush({});

    api.requestBusinessAccount({} as never).subscribe();
    const business = http.expectOne('/api/auth/identity/business-requests');
    expect(business.request.method).toBe('POST');
    business.flush({});
  });
});
