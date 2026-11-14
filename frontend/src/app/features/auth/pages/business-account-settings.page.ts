import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
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
export class BusinessAccountSettingsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly api = inject(BusinessAccountSettingsApiService);

  protected loading = true;
  protected saving = false;
  protected hasBusinessAccount = false;
  protected businessAccountMissing = false;
  protected nombreComercial = '';
  protected error = '';
  protected success = '';

  ngOnInit() {
    if (!this.auth.user()) {
      this.loading = false;
      return;
    }
    this.api
      .getMyBusinessAccount()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (account) => {
          this.hasBusinessAccount = true;
          this.nombreComercial = account.nombre_comercial ?? '';
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.businessAccountMissing = true;
            return;
          }
          this.error = 'No se pudo cargar la configuración de tu cuenta. Intenta nuevamente.';
        },
      });
  }

  protected save() {
    if (!this.hasBusinessAccount || this.saving) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    const nombreComercial = this.nombreComercial.trim() || null;
    this.api
      .updateCommercialName(nombreComercial)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (account) => {
          this.nombreComercial = account.nombre_comercial ?? '';
          this.success = 'Se guardaron los cambios';
        },
        error: () => {
          this.error = 'No se pudo guardar el nombre comercial.';
        },
      });
  }

  protected get businessAccountUnavailable() {
    return !this.loading && this.businessAccountMissing && !!this.auth.user();
  }
}
