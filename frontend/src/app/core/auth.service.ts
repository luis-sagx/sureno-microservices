import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthUser, LoginPayload } from './session.models';
import { SessionApiService } from './session-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(SessionApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly resolving = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly restoring = this.resolving.asReadonly();

  restoreSession() {
    if (!this.isBrowser || this.resolving()) return;
    this.resolving.set(true);
    this.api
      .currentSession()
      .pipe(
        tap((user) => this.currentUser.set(user)),
        catchError(() => {
          this.currentUser.set(null);
          return of(null);
        }),
      )
      .subscribe(() => this.resolving.set(false));
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.api.login(payload).pipe(
      map((result) => ({
        userId: result.user_id,
        username: result.username,
        roles: result.roles,
        estado_verificacion: result.estado_verificacion,
        estado_solicitud: result.estado_solicitud ?? null,
      })),
      tap((user) => this.currentUser.set(user)),
    );
  }

  logout() {
    return this.api.logout().pipe(tap(() => this.currentUser.set(null)));
  }

  isApprovedBusiness(): boolean {
    return (
      this.currentUser()?.roles.includes('CUSTOMER_B2B') === true &&
      this.currentUser()?.estado_solicitud === 'APPROVED'
    );
  }
}
