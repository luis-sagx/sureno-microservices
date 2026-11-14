import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { BusinessAccountSettingsApiService } from '../data-access/business-account-settings-api.service';
import { BusinessAccountSettingsPage } from './business-account-settings.page';

const account = {
  business_account_id: 'account-1',
  user_id: 'user-1',
  nombre_comercial: 'Licorería Sureño',
};

describe('BusinessAccountSettingsPage', () => {
  let api: { getMyBusinessAccount: ReturnType<typeof vi.fn>; updateCommercialName: ReturnType<typeof vi.fn> };
  let user: ReturnType<typeof signal<{ userId: string; username: string; roles: string[] } | null>>;

  beforeEach(async () => {
    api = {
      getMyBusinessAccount: vi.fn(() => of(account)),
      updateCommercialName: vi.fn((nombre_comercial: string | null) => of({ ...account, nombre_comercial })),
    };
    user = signal({ userId: 'user-1', username: 'negocio', roles: ['CUSTOMER'] });
    await TestBed.configureTestingModule({
      imports: [BusinessAccountSettingsPage],
      providers: [
        provideRouter([]),
        { provide: BusinessAccountSettingsApiService, useValue: api },
        { provide: AuthService, useValue: { user } },
        { provide: ThemeService, useValue: { theme: () => 'light', toggle: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('loads the current commercial name and saves a trimmed value', async () => {
    const fixture = TestBed.createComponent(BusinessAccountSettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('[name="nombre_comercial"]')!;

    expect(input.value).toBe('Licorería Sureño');
    const page = fixture.componentInstance as unknown as { nombreComercial: string; save(): void };
    page.nombreComercial = '  Mi Licorería  ';
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.updateCommercialName).toHaveBeenCalledWith('Mi Licorería');
    expect((fixture.componentInstance as unknown as { success: string }).success).toBe('Se guardaron los cambios');
    expect(root.textContent).toContain('Se guardaron los cambios');
  });

  it('shows a clear unavailable state for users without a business account', async () => {
    api.getMyBusinessAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(BusinessAccountSettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Esta opción está disponible solo para cuentas de negocio.');
  });

  it('shows a loading error when the account settings request fails', async () => {
    api.getMyBusinessAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(BusinessAccountSettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudo cargar la configuración de tu cuenta.');
  });

  it('does not call the API for an unauthenticated visitor', () => {
    user.set(null);
    const fixture = TestBed.createComponent(BusinessAccountSettingsPage);
    fixture.detectChanges();

    expect(api.getMyBusinessAccount).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inicia sesión para ver la configuración de tu cuenta.');
  });

  it('shows an API error and preserves the current value after a failed save', async () => {
    api.updateCommercialName.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(BusinessAccountSettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as unknown as { nombreComercial: string; save(): void };
    page.nombreComercial = 'Nuevo nombre';
    page.save();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudo guardar el nombre comercial.');
  });
});
