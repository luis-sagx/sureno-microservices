import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../core/reveal-on-scroll.directive';

export const HERO_FRAMES = Array.from(
  { length: 76 },
  (_, index) => `/frames_nobg/f${String(1 + index * 2).padStart(4, '0')}.webp`,
);

export function heroFrameIndex(progress: number): number {
  const normalized = Math.max(0, Math.min(1, progress));
  return Math.round(normalized * (HERO_FRAMES.length - 1));
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('heroSequence') private heroSequence!: ElementRef<HTMLElement>;
  @ViewChild('heroStage') private heroStage!: ElementRef<HTMLElement>;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly removeScrollListeners: (() => void)[] = [];
  protected readonly currentFrame = signal(HERO_FRAMES[0]);
  protected readonly reducedMotion = signal(false);

  protected readonly featured = [
    { name: 'Caña Sureña', image: '/img-minorista/cana-surena.webp', category: 'Aguardientes' },
    { name: 'Vodka Blue', image: '/img-minorista/vodka-blue.webp', category: 'Vodkas' },
    { name: 'Aguardiente Diamante', image: '/img-minorista/aguardiente-diamante.webp', category: 'Aguardientes' },
  ];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const windowRef = this.document.defaultView;
    if (!windowRef) return;

    this.reducedMotion.set(
      windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    );
    if (this.reducedMotion()) return;

    this.updateFrame(windowRef);
    this.removeScrollListeners.push(
      this.renderer.listen('window', 'scroll', () => this.updateFrame(windowRef), {
        passive: true,
      }),
      this.renderer.listen('window', 'resize', () => this.updateFrame(windowRef)),
    );
  }

  ngOnDestroy(): void {
    for (const removeListener of this.removeScrollListeners) removeListener();
  }

  private updateFrame(windowRef: Window): void {
    const sequence = this.heroSequence?.nativeElement;
    const stage = this.heroStage?.nativeElement;
    if (!sequence || !stage) return;

    const scrollRange = sequence.offsetHeight - stage.offsetHeight;
    if (scrollRange <= 0) return;

    const sequenceStart = sequence.getBoundingClientRect().top + windowRef.scrollY;
    const progress = (windowRef.scrollY - sequenceStart) / scrollRange;
    this.currentFrame.set(HERO_FRAMES[heroFrameIndex(progress)]);
  }
}
