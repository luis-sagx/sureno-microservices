import { Renderer2, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HERO_FRAMES, HomePage, heroFrameIndex } from './home.page';

describe('HomePage hero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the first local animation frame before the visitor scrolls', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const frame = compiled.querySelector<HTMLImageElement>('[data-hero-frame]');
    expect(frame).toBeTruthy();
    expect(frame?.getAttribute('src')).toBe('/frames_nobg/f0001.webp');
    expect(frame?.getAttribute('alt')).toBe('Botella Sureño');
    expect(frame?.getAttribute('loading')).toBe('eager');
  });

  it('offers a business account request without promising unavailable wholesale pricing', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cta = compiled.querySelector<HTMLElement>('[data-horeca-cta]');
    const link = cta?.querySelector<HTMLAnchorElement>('a');

    expect(cta?.textContent).toContain('¿Compras para tu negocio?');
    expect(link?.getAttribute('href')).toBe('/registro');
    expect(link?.textContent).toContain('Solicita una cuenta para tu negocio');
    expect(cta?.textContent).not.toContain('tarifario');
  });

  it('renders the complete Heritage story before the wholesale CTA', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const heritage = compiled.querySelector<HTMLElement>('[data-heritage-section]');
    const cta = compiled.querySelector<HTMLElement>('[data-horeca-cta]');
    const historyLink = heritage?.querySelector<HTMLAnchorElement>('a[routerLink="/quienes-somos"]');

    expect(heritage).toBeTruthy();
    expect(heritage?.textContent).toContain('1998');
    expect(heritage?.textContent).toContain('El 22 de mayo de 1998');
    expect(heritage?.textContent).toContain('normas INEN y procesos controlados por el ARCSA');
    expect(heritage?.textContent).toContain('El sabor auténtico del sur de Quito, en cada botella.');
    expect(heritage?.querySelector('[data-heritage-divider]')).toBeTruthy();
    expect(historyLink?.textContent).toContain('Nuestra historia');
    expect(heritage?.querySelector('img[alt="Isotipo de Sureño"]')).toBeTruthy();
    expect(heritage?.querySelectorAll('.craft-line')).toHaveLength(2);
    expect(heritage!.compareDocumentPosition(cta!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses the 76 source frames in ascending order, with endpoints at f0001 and f0151', () => {
    expect(HERO_FRAMES).toHaveLength(76);
    expect(HERO_FRAMES[0]).toBe('/frames_nobg/f0001.webp');
    expect(HERO_FRAMES[75]).toBe('/frames_nobg/f0151.webp');
    expect(HERO_FRAMES[38]).toBe('/frames_nobg/f0077.webp');
  });

  it('maps scroll progress to the nearest frame and clamps values at both ends', () => {
    expect(heroFrameIndex(-1)).toBe(0);
    expect(heroFrameIndex(0)).toBe(0);
    expect(heroFrameIndex(0.5)).toBe(38);
    expect(heroFrameIndex(1)).toBe(75);
    expect(heroFrameIndex(2)).toBe(75);
  });

  it('updates the frame as the pinned hero scrolls and releases listeners on destroy', () => {
    const fixture = TestBed.createComponent(HomePage);
    const compiled = fixture.nativeElement as HTMLElement;
    const scrollTargets: Record<string, (event: Event) => void> = {};
    const scrollCleanup = vi.fn();
    const resizeCleanup = vi.fn();
    const renderer = fixture.debugElement.injector.get(Renderer2);
    const listen = vi.spyOn(renderer, 'listen');
    listen.mockImplementation((_target, eventName, callback) => {
      if (eventName === 'scroll') {
        scrollTargets[eventName] = callback;
        return scrollCleanup;
      }
      if (eventName === 'resize') {
        scrollTargets[eventName] = callback;
        return resizeCleanup;
      }
      return vi.fn();
    });

    fixture.detectChanges();
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    const sequence = compiled.querySelector<HTMLElement>('[data-hero-sequence]')!;
    const stage = compiled.querySelector<HTMLElement>('[data-hero-stage]')!;
    Object.defineProperty(sequence, 'offsetHeight', { configurable: true, value: 2000 });
    Object.defineProperty(stage, 'offsetHeight', { configurable: true, value: 1000 });
    let scrollY = 100;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
    vi.spyOn(sequence, 'getBoundingClientRect').mockImplementation(() => ({
      top: 100 - scrollY,
      bottom: 2100 - scrollY,
      left: 0,
      right: 1280,
      width: 1280,
      height: 2000,
      x: 0,
      y: 100 - scrollY,
      toJSON: () => ({}),
    }));

    scrollTargets['scroll'](new Event('scroll'));
    expect(compiled.querySelector('[data-hero-frame]')?.getAttribute('src')).toBe(HERO_FRAMES[0]);

    scrollY = 600;
    scrollTargets['scroll'](new Event('scroll'));
    while (animationFrames.length > 0) animationFrames.shift()?.(0);
    fixture.detectChanges();
    expect(compiled.querySelector('[data-hero-frame]')?.getAttribute('src')).toBe(HERO_FRAMES[38]);

    scrollY = 1100;
    scrollTargets['scroll'](new Event('scroll'));
    while (animationFrames.length > 0) animationFrames.shift()?.(0);
    fixture.detectChanges();
    expect(compiled.querySelector('[data-hero-frame]')?.getAttribute('src')).toBe(HERO_FRAMES[75]);

    fixture.destroy();
    expect(scrollCleanup).toHaveBeenCalledOnce();
    expect(resizeCleanup).toHaveBeenCalledOnce();
  });

  it('coalesces scroll events into one animation frame using the latest scroll position', () => {
    const fixture = TestBed.createComponent(HomePage);
    const component = fixture.componentInstance as unknown as { currentFrame: () => string };
    const compiled = fixture.nativeElement as HTMLElement;
    const scrollTargets: Record<string, (event: Event) => void> = {};
    const renderer = fixture.debugElement.injector.get(Renderer2);
    vi.spyOn(renderer, 'listen').mockImplementation((_target, eventName, callback) => {
      if (eventName === 'scroll' || eventName === 'resize') scrollTargets[eventName] = callback;
      return vi.fn();
    });
    fixture.detectChanges();
    const animationFrames: { id: number; callback: FrameRequestCallback }[] = [];
    let nextAnimationFrameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++nextAnimationFrameId;
      animationFrames.push({ id, callback });
      return id;
    });
    const sequence = compiled.querySelector<HTMLElement>('[data-hero-sequence]')!;
    const stage = compiled.querySelector<HTMLElement>('[data-hero-stage]')!;
    Object.defineProperty(sequence, 'offsetHeight', { configurable: true, value: 2000 });
    Object.defineProperty(stage, 'offsetHeight', { configurable: true, value: 1000 });
    let scrollY = 100;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
    vi.spyOn(sequence, 'getBoundingClientRect').mockImplementation(() => ({
      top: 100 - scrollY,
      bottom: 2100 - scrollY,
      left: 0,
      right: 1280,
      width: 1280,
      height: 2000,
      x: 0,
      y: 100 - scrollY,
      toJSON: () => ({}),
    }));

    scrollY = 400;
    scrollTargets['scroll'](new Event('scroll'));
    scrollY = 600;
    scrollTargets['scroll'](new Event('scroll'));

    expect(animationFrames).toHaveLength(1);
    expect(component.currentFrame()).toBe(HERO_FRAMES[0]);

    animationFrames[0].callback(0);
    fixture.detectChanges();
    const firstStep = HERO_FRAMES.indexOf(component.currentFrame());
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThanOrEqual(2);

    let callbacks = 0;
    while (animationFrames.length > 0 && callbacks < HERO_FRAMES.length) {
      animationFrames.shift()!.callback(0);
      fixture.detectChanges();
      callbacks += 1;
    }
    expect(component.currentFrame()).toBe(HERO_FRAMES[38]);
    expect(compiled.querySelector('[data-hero-frame]')?.getAttribute('src')).toBe(HERO_FRAMES[38]);

    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame');
    scrollY = 700;
    scrollTargets['scroll'](new Event('scroll'));
    const pendingFrameId = animationFrames.at(-1)!.id;
    fixture.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrameId);
  });

  it('preloads the remaining hero frames at low priority and releases requests on destroy', () => {
    const fixture = TestBed.createComponent(HomePage);
    const component = fixture.componentInstance as unknown as {
      preloadingFrames: Set<HTMLImageElement>;
    };

    fixture.detectChanges();

    const preloadedFrames = [...component.preloadingFrames];
    expect(preloadedFrames).toHaveLength(HERO_FRAMES.length - 1);
    expect(preloadedFrames.map((image) => image.getAttribute('src'))).toEqual(HERO_FRAMES.slice(1));
    expect(preloadedFrames.every((image) => image.fetchPriority === 'low')).toBe(true);
    fixture.destroy();
    expect(component.preloadingFrames.size).toBe(0);
  });

  it('keeps the first frame still and registers no scroll handlers for reduced motion', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const fixture = TestBed.createComponent(HomePage);
    const renderer = fixture.debugElement.injector.get(Renderer2);
    const listen = vi.spyOn(renderer, 'listen');

    try {
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('[data-hero-sequence]')?.classList)
        .toContain('is-reduced-motion');
      expect(listen.mock.calls.some(([target, eventName]) =>
        target === 'window' && ['scroll', 'resize'].includes(eventName),
      )).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-hero-frame]')?.getAttribute('src'))
        .toBe(HERO_FRAMES[0]);
      fixture.destroy();
    } finally {
      if (original) Object.defineProperty(window, 'matchMedia', original);
      else Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  it('does not access browser APIs or install scroll listeners during server rendering', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const matchMedia = vi.fn(() => {
      throw new Error('Browser API must not be accessed on the server');
    });
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
    const fixture = TestBed.createComponent(HomePage);
    const listen = vi.spyOn(fixture.debugElement.injector.get(Renderer2), 'listen');

    try {
      fixture.detectChanges();
      expect(matchMedia).not.toHaveBeenCalled();
      expect(listen.mock.calls.some(([target, eventName]) =>
        target === 'window' && ['scroll', 'resize'].includes(eventName),
      )).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-hero-frame]')?.getAttribute('src'))
        .toBe(HERO_FRAMES[0]);
      fixture.destroy();
    } finally {
      if (original) Object.defineProperty(window, 'matchMedia', original);
      else Reflect.deleteProperty(window, 'matchMedia');
    }
  });
});
