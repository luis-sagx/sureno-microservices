import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AboutPage } from './about.page';

describe('AboutPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('presents the story, quote, mission and vision, products, and logistics in reference order', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = [...compiled.querySelectorAll('section')];

    expect(sections.map((section) => section.classList.item(0))).toEqual([
      'about-intro',
      'about-quote',
      'purpose-section',
      'about-products',
      'logistics-section',
    ]);
    expect(sections[4].querySelector('h2')?.textContent?.trim()).toBe('Información de envío');
  });

  it('offers an accessible keyboard and button controlled product carousel', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const carousel = compiled.querySelector<HTMLElement>('[aria-roledescription="carrusel"]');

    expect(carousel).toBeTruthy();
    expect(carousel?.getAttribute('aria-label')).toBe('Productos de Sureño');
    expect(compiled.querySelector('button[aria-label="Ver productos anteriores"]')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Ver más productos"]')).toBeTruthy();

    const track = compiled.querySelector<HTMLElement>('[data-product-carousel-track]')!;
    const scrollBy = vi.fn();
    Object.defineProperty(track, 'scrollBy', { configurable: true, value: scrollBy });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1500 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 0 });
    track.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('button[aria-label="Ver más productos"]')!.click();
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));

    carousel!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });
});
