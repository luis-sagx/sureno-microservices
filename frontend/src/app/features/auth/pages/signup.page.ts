import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '../data-access/auth-api.service';
import { BusinessRegistrationPayload, RegistrationPayload } from '../models/auth.models';
import { ThemeService } from '../../../core/theme.service';

@Component({
  selector: 'app-signup-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.page.html',
  styleUrl: './auth.page.css',
})
export class SignupPage {
  private readonly api = inject(AuthApiService);
  protected readonly theme = inject(ThemeService);
  protected accountType: 'individual' | 'business' = 'individual';
  protected loading = false;
  protected error = '';
  protected submitted = false;
  protected message = '';
  protected readonly maxBirthDate = this.adultDateLimit();

  protected form = {
    cedula: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono: '',
    email_contacto: '',
    username: '',
    password: '',
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    direccion_negocio: '',
  };

  protected submit() {
    if (this.loading || !this.requiredFieldsPresent()) return;
    this.loading = true;
    this.error = '';
    this.submitted = false;
    const common: RegistrationPayload = {
      cedula: this.form.cedula.trim(),
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos.trim(),
      fecha_nacimiento: this.form.fecha_nacimiento,
      telefono: this.form.telefono.trim(),
      ...(this.form.email_contacto.trim() && { email_contacto: this.form.email_contacto.trim() }),
      username: this.form.username.trim(),
      password: this.form.password,
    };

    const operation =
      this.accountType === 'business'
        ? this.api.requestBusinessAccount({
            ...common,
            ruc: this.form.ruc.trim(),
            razon_social: this.form.razon_social.trim(),
            ...(this.form.nombre_comercial.trim() && {
              nombre_comercial: this.form.nombre_comercial.trim(),
            }),
            direccion_negocio: this.form.direccion_negocio.trim(),
          } satisfies BusinessRegistrationPayload)
        : this.api.registerIndividual(common);

    operation.subscribe({
      next: () => {
        this.submitted = true;
        this.message =
          this.accountType === 'business'
            ? 'Tu solicitud comercial quedó pendiente de revisión manual. Te avisaremos cuando sea aprobada.'
            : 'Tu cuenta quedó pendiente de verificación de identidad. Inicia sesión para consultar el catálogo.';
        this.loading = false;
      },
      error: (error: { error?: { message?: string | string[] } }) => {
        const message = error.error?.message;
        this.error = Array.isArray(message)
          ? message.join(' ')
          : message || 'No se pudo completar el registro. Revisa los datos e inténtalo otra vez.';
        this.loading = false;
      },
    });
  }

  private requiredFieldsPresent() {
    const common =
      this.form.cedula &&
      this.form.nombres &&
      this.form.apellidos &&
      this.form.fecha_nacimiento &&
      this.form.telefono &&
      this.form.username &&
      this.form.password.length >= 12;
    if (!common) return false;
    return (
      this.accountType === 'individual' ||
      Boolean(
        this.form.ruc &&
          this.form.razon_social &&
          this.form.direccion_negocio,
      )
    );
  }

  private adultDateLimit() {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().slice(0, 10);
  }
}
