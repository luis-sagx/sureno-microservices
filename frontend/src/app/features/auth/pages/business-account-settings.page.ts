import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { BusinessAccountSettingsApiService } from '../data-access/business-account-settings-api.service';

@Component({
  selector: 'app-business-account-settings-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './business-account-settings.page.html',
  styleUrl: './auth.page.css',
})
export class BusinessAccountSettingsPage {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly api = inject(BusinessAccountSettingsApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly hasBusinessAccount = signal(false);
  protected readonly businessAccountMissing = signal(false);
  protected nombreComercial = '';
  protected readonly error = signal('');
  protected readonly success = signal('');
  private requestStarted = false;

  private readonly sessionEffect = effect(() => {
    if (this.auth.restoring()) return;
    if (!this.auth.user()) {
      this.loading.set(false);
      return;
    }
    if (this.requestStarted) return;
    this.requestStarted = true;

    this.api
      .getMyBusinessAccount()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (account) => {
          this.hasBusinessAccount.set(true);
          this.nombreComercial = account.nombre_comercial ?? '';
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.businessAccountMissing.set(true);
            return;
          }
          this.error.set('No se pudo cargar la configuración de tu cuenta. Intenta nuevamente.');
        },
      });
  });

  protected save() {
    if (!this.hasBusinessAccount() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const nombreComercial = this.nombreComercial.trim() || null;
    this.api
      .updateCommercialName(nombreComercial)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (account) => {
          this.nombreComercial = account.nombre_comercial ?? '';
          this.success.set('Se guardaron los cambios');
        },
        error: () => {
          this.error.set('No se pudo guardar el nombre comercial.');
        },
      });
  }

  protected get businessAccountUnavailable() {
    return !this.loading() && this.businessAccountMissing() && !!this.auth.user();
  }
}
