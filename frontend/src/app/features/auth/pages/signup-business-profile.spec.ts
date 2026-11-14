import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { ThemeService } from '../../../core/theme.service';
import { AuthRegistrationApiService } from '../data-access/auth-registration-api.service';
import { SignupPage } from './signup.page';

describe('SignupPage business profile separation', () => {
  let api: { registerIndividual: ReturnType<typeof vi.fn>; requestBusinessAccount: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      registerIndividual: vi.fn(() => NEVER),
      requestBusinessAccount: vi.fn(() => NEVER),
    };
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideRouter([]),
        { provide: AuthRegistrationApiService, useValue: api },
        { provide: ThemeService, useValue: { theme: () => 'light', toggle: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('omits commercial name from B2B signup UI and request payload', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.account-tabs button')[1].click();
    fixture.detectChanges();
    expect(root.querySelector('[name="nombre_comercial"]')).toBeNull();

    const component = fixture.componentInstance as unknown as {
      form: Record<string, string>;
      accountType: 'individual' | 'business';
    };
    Object.assign(component.form, {
      cedula: '1791234567001',
      nombres: 'María José',
      apellidos: 'Peña-López',
      fecha_nacimiento: '1990-01-01',
      telefono: '+593991234567',
      email_contacto: '',
      username: 'negocio2',
      password: 'Contrasena123!',
      razon_social: 'Distribuidora Sureña',
      nombre_comercial: 'Nombre que no debe enviarse',
      direccion_negocio: 'Quito',
    });
    component.accountType = 'business';
    fixture.detectChanges();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(api.requestBusinessAccount).toHaveBeenCalledOnce();
    expect(api.requestBusinessAccount.mock.calls[0][0]).not.toHaveProperty('nombre_comercial');
  });
});
