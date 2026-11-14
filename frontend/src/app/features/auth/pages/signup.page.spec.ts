import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { ThemeService } from '../../../core/theme.service';
import { AuthRegistrationApiService } from '../data-access/auth-registration-api.service';
import { SignupPage } from './signup.page';

describe('SignupPage registration validation', () => {
  let api: { registerIndividual: ReturnType<typeof vi.fn>; requestBusinessAccount: ReturnType<typeof vi.fn> };
  const validValues: Record<string, string> = {
    cedula: '0102030400', telefono: '+593991234567', nombres: 'María José',
    apellidos: 'Peña-López', fecha_nacimiento: '1990-01-01',
    email_contacto: '', username: 'niña2', password: 'Contrasena123!',
  };

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

  it('rejects a malformed optional email locally without starting a request', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const values: Record<string, string> = {
      cedula: '0102030400',
      telefono: '+593991234567',
      nombres: 'María José',
      apellidos: 'Peña-López',
      fecha_nacimiento: '1990-01-01',
      email_contacto: 'no-es-correo',
      username: 'luisa_1',
      password: 'Contrasena123!',
    };
    const component = fixture.componentInstance as unknown as { form: Record<string, string> };
    Object.assign(component.form, values);
    fixture.detectChanges();
    root.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(api.registerIndividual).not.toHaveBeenCalled();
    expect(root.querySelector('[name="email_contacto"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.textContent).toContain('El correo electrónico no es válido.');
    expect(root.textContent).not.toContain('Enviando');
  });

  it('lets the user reveal and hide the password without changing its value', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const password = root.querySelector<HTMLInputElement>('[name="password"]')!;
    password.value = 'Contrasena123!';
    expect(password.value).toBe('Contrasena123!');

    const reveal = root.querySelector<HTMLButtonElement>('[data-password-visibility]');
    expect(reveal).not.toBeNull();
    if (!reveal) return;
    reveal.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(password.value).toBe('Contrasena123!');

    root.querySelector<HTMLButtonElement>('[data-password-visibility]')!.click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(password.value).toBe('Contrasena123!');
  });

  it.each([
    ['invalid cédula verifier', { cedula: '0102030403' }, 'cédula'],
    ['short name', { nombres: 'A' }, 'Usa de 2 a 50 letras'],
    ['symbol in surname', { apellidos: 'López#' }, 'Usa de 2 a 50 letras'],
    ['invalid phone', { telefono: '593 991234567' }, 'Ingresa entre 7 y 15 dígitos'],
    ['invalid username', { username: 'u' }, 'Usa de 2 a 32 letras'],
    ['unexpected username symbol', { username: 'luis!' }, 'Usa de 2 a 32 letras'],
    ['password without a special character', { password: 'Contrasena1234' }, 'carácter especial'],
    ['password without uppercase', { password: 'contrasena123!' }, 'mayúscula'],
    ['password without number', { password: 'ContrasenaSegura!' }, 'número'],
    ['birth date before 1900', { fecha_nacimiento: '1899-12-31' }, '1900'],
    ['birth date before age 18', { fecha_nacimiento: '2015-01-01' }, '18 años'],
  ])('blocks invalid input (%s) before making an API request', (_label, change, message) => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as { form: Record<string, string> };
    Object.assign(component.form, validValues, change);
    fixture.detectChanges();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.registerIndividual).not.toHaveBeenCalled();
    expect(root.textContent).toContain(message);
  });

  it('accepts a checksum-valid personal RUC and an empty optional email', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as { form: Record<string, string> };
    Object.assign(component.form, validValues, { cedula: '0102030400001' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(api.registerIndividual).toHaveBeenCalledOnce();
  });

  it('rejects a cédula when B2B requires the business RUC', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.account-tabs button')[1].click();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      form: Record<string, string>;
      accountType: 'individual' | 'business';
    };
    Object.assign(component.form, validValues, {
      razon_social: 'Distribuidora Sureña',
      direccion_negocio: 'Quito',
    });
    component.accountType = 'business';
    fixture.detectChanges();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.requestBusinessAccount).not.toHaveBeenCalled();
    expect(root.textContent).toContain('RUC válido de 13 dígitos');
  });

  it('uses one business RUC in the identity field and registration request', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.account-tabs button')[1].click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: Record<string, string>;
      accountType: 'individual' | 'business';
    };
    const businessRuc = '1791234567001';
    Object.assign(component.form, validValues, {
      cedula: businessRuc,
      razon_social: 'Distribuidora Sureña',
      direccion_negocio: 'Quito',
    });
    component.accountType = 'business';
    fixture.detectChanges();

    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.requestBusinessAccount).toHaveBeenCalledOnce();
    const payload = api.requestBusinessAccount.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['ruc']).toBe(businessRuc);
    expect(payload).not.toHaveProperty('cedula');
    expect(root.querySelector('label[for="cedula"]')?.textContent).toContain('RUC del negocio');
    expect(root.querySelector('[name="ruc"]')).toBeNull();
  });

  it('ends loading and displays a timeout message when registration never responds', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as { form: Record<string, string>; requestTimeoutMs: number };
    Object.assign(component.form, validValues);
    component.requestTimeoutMs = 1;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enviando');

    await new Promise((resolve) => setTimeout(resolve, 10));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('tardando demasiado');
    expect(fixture.nativeElement.textContent).not.toContain('Enviando');
  });
});
