import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './auth.page.css',
})
export class LoginPage {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected username = '';
  protected password = '';
  protected loading = false;
  protected error = '';

  protected submit() {
    if (this.loading || !this.username.trim() || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login({ username: this.username.trim(), password: this.password }).subscribe({
      next: () => void this.router.navigateByUrl('/catalogo'),
      error: (error: { error?: { message?: string | string[] } }) => {
        const message = error.error?.message;
        this.error = Array.isArray(message)
          ? message.join(' ')
          : message || 'No se pudo iniciar sesión. Revisa tus datos e inténtalo otra vez.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
