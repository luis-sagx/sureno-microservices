import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: '<section appScrollReveal>Reveal content</section>',
})
class RevealHost {}

describe('RevealOnScrollDirective', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps server-rendered content visible and does not create an observer', () => {
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', observer);
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('section').getAttribute('data-scroll-reveal'),
    ).toBeNull();
    expect(observer).not.toHaveBeenCalled();
  });

  it('reveals content once it intersects and disconnects its observer', () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function (handler: IntersectionObserverCallback) {
        callback = handler;
        return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
      }),
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });

    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(
      fixture.debugElement
        .query(By.directive(RevealOnScrollDirective))
        .injector.get(RevealOnScrollDirective).state,
    ).toBe('pending');
    expect(element.getAttribute('data-scroll-reveal')).toBe('pending');

    callback?.(
      [{ isIntersecting: true, target: element } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    fixture.detectChanges();

    expect(element.getAttribute('data-scroll-reveal')).toBe('visible');
    expect(disconnect).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('does not hide content when reduced motion is preferred', () => {
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', observer);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });

    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('section').getAttribute('data-scroll-reveal'),
    ).toBeNull();
    expect(observer).not.toHaveBeenCalled();
  });
});
