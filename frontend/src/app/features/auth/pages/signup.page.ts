import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, TimeoutError, timeout } from 'rxjs';
import { AuthRegistrationApiService } from '../data-access/auth-registration-api.service';
import { BusinessRegistrationPayload, RegistrationPayload } from '../models/registration.models';
import { ThemeService } from '../../../core/theme.service';

@Component({
  selector: 'app-signup-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.page.html',
  styleUrl: './auth.page.css',
})
export class SignupPage {
  private readonly api = inject(AuthRegistrationApiService);
  protected readonly theme = inject(ThemeService);
  protected accountType: 'individual' | 'business' = 'individual';
  protected loading = false;
  protected error = '';
  protected submitted = false;
  protected submissionAttempted = false;
  protected showPassword = false;
  protected message = '';
  protected readonly minBirthDate = '1900-01-01';
  protected readonly maxBirthDate = this.adultDateLimit();
  protected readonly requestTimeoutMs = 15_000;
  private readonly touched: Partial<Record<SignupField, boolean>> = {};

  protected form = {
    cedula: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono: '',
    email_contacto: '',
    username: '',
    password: '',
    razon_social: '',
    direccion_negocio: '',
  };

  protected submit() {
    if (this.loading) return;
    this.submissionAttempted = true;
    if (!this.formIsValid()) return;
    this.loading = true;
    this.error = '';
    this.submitted = false;
    const common: Omit<RegistrationPayload, 'cedula'> = {
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
            ruc: this.form.cedula.trim(),
            razon_social: this.form.razon_social.trim(),
            direccion_negocio: this.form.direccion_negocio.trim(),
          } satisfies BusinessRegistrationPayload)
        : this.api.registerIndividual({
            ...common,
            cedula: this.form.cedula.trim(),
          });

    operation
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.submitted = true;
          this.message =
            this.accountType === 'business'
              ? 'Tu solicitud comercial quedó pendiente de revisión manual. Te avisaremos cuando sea aprobada.'
              : 'Tu cuenta quedó pendiente de verificación de identidad. Inicia sesión para consultar el catálogo.';
        },
        error: (error: unknown) => {
          if (error instanceof TimeoutError) {
            this.error =
              'El servicio está tardando demasiado. Intenta nuevamente en unos momentos.';
            return;
          }
          const message = (error as { error?: { message?: string | string[] } }).error?.message;
          this.error = Array.isArray(message)
            ? message.join(' ')
            : message || 'No se pudo completar el registro. Revisa los datos e inténtalo otra vez.';
        },
      });
  }

  protected markTouched(field: SignupField) {
    this.touched[field] = true;
  }

  protected fieldError(field: SignupField): string {
    if (!this.submissionAttempted && !this.touched[field]) return '';
    const value = this.form[field].trim();
    switch (field) {
      case 'cedula':
        if (this.accountType === 'business') {
          return this.isValidBusinessRuc(value) ? '' : 'Ingresa un RUC válido de 13 dígitos.';
        }
        return this.isValidIdentity(value) ? '' : 'Ingresa una cédula o RUC válido.';
      case 'telefono':
        return /^\+?\d{7,15}$/.test(value) ? '' : 'Ingresa un número de teléfono válido.';
      case 'nombres':
      case 'apellidos':
        return this.isValidPersonName(value) ? '' : 'Debe ingresar entre 2 y 50 letras.';
      case 'fecha_nacimiento':
        return this.isValidBirthDate(value)
          ? ''
          : 'Ingresa una fecha de nacimiento válida. Debes ser mayor de 18 años.';
      case 'email_contacto':
        return !value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
          ? ''
          : 'El correo electrónico no es válido.';
      case 'username':
        return this.isValidUsername(value) ? '' : 'Usa de 2 a 32 letras o números.';
      case 'password':
        return this.isValidPassword(this.form.password)
          ? ''
          : 'Usa al menos 12 caracteres, una mayúscula, un número y un carácter especial.';
      case 'razon_social':
        return value.length > 0 && value.length <= 160 ? '' : 'La razón social es obligatoria.';
      case 'direccion_negocio':
        return value.length > 0 && value.length <= 2000
          ? ''
          : 'La dirección del negocio es obligatoria.';
    }
  }

  protected togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private formIsValid(): boolean {
    const common: SignupField[] = [
      'cedula',
      'nombres',
      'apellidos',
      'fecha_nacimiento',
      'telefono',
      'email_contacto',
      'username',
      'password',
    ];
    const fields =
      this.accountType === 'business'
        ? ([...common, 'razon_social', 'direccion_negocio'] as SignupField[])
        : common;
    return fields.every((field) => !this.fieldError(field));
  }

  private isValidIdentity(value: string): boolean {
    if (this.isValidCedula(value)) return true;
    return (
      /^\d{13}$/.test(value) && value.slice(10) !== '000' && this.isValidCedula(value.slice(0, 10))
    );
  }

  private isValidCedula(value: string): boolean {
    if (!/^\d{10}$/.test(value)) return false;
    const province = Number(value.slice(0, 2));
    if (province < 1 || province > 24 || Number(value[2]) > 5) return false;
    const sum = value
      .slice(0, 9)
      .split('')
      .reduce((total, digit, index) => {
        const doubled = Number(digit) * (index % 2 === 0 ? 2 : 1);
        return total + (doubled > 9 ? doubled - 9 : doubled);
      }, 0);
    return (10 - (sum % 10)) % 10 === Number(value[9]);
  }

  private isValidBusinessRuc(value: string): boolean {
    if (!/^\d{13}$/.test(value) || value.slice(10) === '000') return false;
    const province = Number(value.slice(0, 2));
    const type = Number(value[2]);
    if (province < 1 || province > 24) return false;
    if (type <= 5) return this.isValidCedula(value.slice(0, 10));
    return type === 6 || type === 9;
  }

  private isValidPersonName(value: string): boolean {
    const length = Array.from(value).length;
    return (
      length >= 2 &&
      length <= 50 &&
      /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u.test(value)
    );
  }

  private isValidUsername(value: string): boolean {
    return (
      value.length >= 2 &&
      value.length <= 32 &&
      /^[\p{L}\p{N}][\p{L}\p{M}\p{N}._-]*$/u.test(value) &&
      !/[._-]$/.test(value)
    );
  }

  private isValidPassword(value: string): boolean {
    return (
      value.length >= 12 &&
      /\p{Lu}/u.test(value) &&
      /\p{N}/u.test(value) &&
      /[^\p{L}\p{M}\p{N}\s]/u.test(value)
    );
  }

  private isValidBirthDate(value: string): boolean {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value < this.minBirthDate ||
      value > this.maxBirthDate
    )
      return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }

  private adultDateLimit() {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().slice(0, 10);
  }
}

type SignupField =
  | 'cedula'
  | 'nombres'
  | 'apellidos'
  | 'fecha_nacimiento'
  | 'telefono'
  | 'email_contacto'
  | 'username'
  | 'password'
  | 'razon_social'
  | 'direccion_negocio';
