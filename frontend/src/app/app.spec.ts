import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
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
    expect(links).toContain('/login');
  });

  it('declares the requested public pages and account routes', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('');
    expect(paths).toContain('quienes-somos');
    expect(paths).toContain('catalogo');
    expect(paths).toContain('login');
    expect(paths).toContain('registro');
  });
});
