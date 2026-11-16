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
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';

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
  private readonly preloadingFrames = new Set<HTMLImageElement>();
  private pendingFrameRequest: number | null = null;
  private currentFrameIndex = 0;
  private targetFrameIndex = 0;
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

    this.updateFrame(windowRef, true);
    this.preloadHeroFrames();
    this.removeScrollListeners.push(
      this.renderer.listen('window', 'scroll', () => this.scheduleFrameUpdate(windowRef), {
        passive: true,
      }),
      this.renderer.listen('window', 'resize', () => this.scheduleFrameUpdate(windowRef)),
    );
  }

  ngOnDestroy(): void {
    const windowRef = this.document.defaultView;
    if (this.pendingFrameRequest !== null && windowRef) {
      windowRef.cancelAnimationFrame(this.pendingFrameRequest);
      this.pendingFrameRequest = null;
    }
    for (const image of this.preloadingFrames) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
    }
    this.preloadingFrames.clear();
    for (const removeListener of this.removeScrollListeners) removeListener();
  }

  private scheduleFrameUpdate(windowRef: Window): void {
    if (this.pendingFrameRequest !== null) return;

    this.pendingFrameRequest = windowRef.requestAnimationFrame(() => {
      this.pendingFrameRequest = null;
      this.updateFrame(windowRef);
    });
  }

  private preloadHeroFrames(): void {
    for (const frame of HERO_FRAMES.slice(1)) {
      const image = this.document.createElement('img');
      image.fetchPriority = 'low';
      image.onload = image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        this.preloadingFrames.delete(image);
      };
      this.preloadingFrames.add(image);
      image.src = frame;
    }
  }

  private updateFrame(windowRef: Window, immediate = false): void {
    const sequence = this.heroSequence?.nativeElement;
    const stage = this.heroStage?.nativeElement;
    if (!sequence || !stage) return;

    const scrollRange = sequence.offsetHeight - stage.offsetHeight;
    if (scrollRange <= 0) return;

    const sequenceStart = sequence.getBoundingClientRect().top + windowRef.scrollY;
    const progress = (windowRef.scrollY - sequenceStart) / scrollRange;
    this.targetFrameIndex = heroFrameIndex(progress);

    if (immediate) {
      this.currentFrameIndex = this.targetFrameIndex;
    } else if (this.currentFrameIndex !== this.targetFrameIndex) {
      const direction = Math.sign(this.targetFrameIndex - this.currentFrameIndex);
      const framesToAdvance = Math.min(2, Math.abs(this.targetFrameIndex - this.currentFrameIndex));
      this.currentFrameIndex += direction * framesToAdvance;
    }

    this.currentFrame.set(HERO_FRAMES[this.currentFrameIndex]);
    if (!immediate && this.currentFrameIndex !== this.targetFrameIndex) {
      this.scheduleFrameUpdate(windowRef);
    }
  }
}
