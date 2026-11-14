import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;
  state: 'pending' | 'visible' | null = null;

  ngAfterViewInit(): void {
    if (
      !this.isBrowser ||
      !globalThis.IntersectionObserver ||
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.state = 'pending';
    this.element.nativeElement.setAttribute('data-scroll-reveal', this.state);
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          this.state = 'visible';
          this.element.nativeElement.setAttribute('data-scroll-reveal', this.state);
          this.observer?.disconnect();
          this.observer = undefined;
        }
      },
      { threshold: 0.12 },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
