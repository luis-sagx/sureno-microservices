import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter(routes)],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the Sureño brand and public navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('img[alt="Licorería Sureño"]')).toBeTruthy();
    const links = [...compiled.querySelectorAll('nav a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toContain('/catalogo');
    expect(links).toContain('/quienes-somos');
  });

  it('presents the account action with a decorative account icon', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const accountLink = compiled.querySelector<HTMLAnchorElement>('.nav-account');

    expect(accountLink?.getAttribute('href')).toBe('/login');
    expect(accountLink?.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('groups footer navigation under company, legal, and support headings', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const headings = [...compiled.querySelectorAll('.footer-column h2')].map((heading) =>
      heading.textContent?.trim(),
    );

    expect(headings).toEqual(['Empresa', 'Legal', 'Soporte']);
    expect(compiled.querySelector('.footer-brand img[alt="Licorería Sureño"]')).toBeTruthy();
    expect(compiled.querySelector('.footer-legal')?.textContent).toContain('mayores de 18 años');
  });

  it('shows standalone account screens and restores the store shell when returning', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await fixture.whenStable();
    await router.navigateByUrl('/login');
    await fixture.whenStable();
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-header')).toBeNull();
    expect(compiled.querySelector('.site-footer')).toBeNull();
    expect(compiled.querySelector('[data-auth-card]')).toBeTruthy();
    expect(compiled.querySelector('a.auth-store-link')?.getAttribute('href')).toBe('/');
    expect(compiled.querySelector('input#username')).toBeTruthy();
    expect(compiled.querySelector('input#password')).toBeTruthy();

    await router.navigateByUrl('/registro');
    await fixture.whenStable();
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-auth-card]')).toBeTruthy();
    expect(compiled.querySelector('input#cedula')).toBeTruthy();
    expect(compiled.textContent).toContain('18 años cumplidos');

    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.querySelector('.site-header')).toBeTruthy();
    expect(compiled.querySelector('.site-footer')).toBeTruthy();
  });

  it('declares the requested public pages and account routes', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('');
    expect(paths).toContain('quienes-somos');
    expect(paths).toContain('catalogo');
    expect(paths).toContain('login');
    expect(paths).toContain('registro');
  });

  it('shows an accessible theme control that switches the page theme', () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const themeButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Cambiar a modo oscuro"]',
    );

    expect(themeButton).toBeTruthy();
    themeButton!.click();
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('sureno-theme')).toBe('dark');
  });
});
