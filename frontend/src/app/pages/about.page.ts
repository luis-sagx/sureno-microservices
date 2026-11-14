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

@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
})
export class AboutPage implements AfterViewInit, OnDestroy {
  @ViewChild('productTrack') private productTrack!: ElementRef<HTMLUListElement>;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly removeListeners: (() => void)[] = [];
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  protected readonly purpose = [
    {
      title: 'Misión',
      image: '/mision.png',
      alt: 'Misión de Sureño',
      text: 'Producir y comercializar licores con los más altos estándares de calidad para satisfacer a nuestros clientes y consumidores, acompañándolos en sus momentos más importantes con un equipo humano, técnico y sostenible.',
    },
    {
      title: 'Visión',
      image: '/vision.png',
      alt: 'Visión de Sureño',
      text: 'Ampliar nuestra participación en el mercado nacional e incursionar en el mercado internacional, con mejora continua, innovación del portafolio y la más alta responsabilidad social para nuestros trabajadores, proveedores y comunidad.',
    },
  ];

  protected readonly products = [
    { name: 'Caña Sureña', image: '/img-minorista/cana-surena.webp' },
    { name: 'Vodka Blue', image: '/img-minorista/vodka-blue.webp' },
    { name: 'Licor Oro', image: '/img-minorista/licor-oro.webp' },
    { name: 'Cannabis', image: '/img-minorista/cannabis.webp' },
    { name: 'Aguardiente Diamante', image: '/img-minorista/aguardiente-diamante.webp' },
    { name: 'Whisky Red Diez', image: '/img-minorista/wisky-red-diez.webp' },
  ];

  protected readonly shipping = [
    {
      title: 'Cobertura',
      text: 'Realizamos entregas en Quito y sus valles. Para provincias fuera de Pichincha, el envío se coordina con transportistas a nivel nacional.',
    },
    {
      title: 'Tiempos de entrega',
      text: 'El plazo depende de la zona y la disponibilidad; se confirma al coordinar cada entrega.',
    },
    {
      title: 'Pedidos por caja',
      text: 'La disponibilidad y los costos de envío se confirman antes de coordinar. Las tarifas mayoristas aún no están configuradas.',
    },
  ];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const windowRef = this.document.defaultView;
    const track = this.productTrack?.nativeElement;
    if (!windowRef || !track) return;

    this.updateCarouselEdges();
    this.removeListeners.push(
      this.renderer.listen(track, 'scroll', () => this.updateCarouselEdges(), { passive: true }),
      this.renderer.listen('window', 'resize', () => this.updateCarouselEdges()),
    );
  }

  ngOnDestroy(): void {
    for (const removeListener of this.removeListeners) removeListener();
  }

  protected showPrevious(): void {
    this.moveCarousel(-1);
  }

  protected showNext(): void {
    this.moveCarousel(1);
  }

  protected handleCarouselKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveCarousel(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.moveCarousel(1);
    }
  }

  private moveCarousel(direction: -1 | 1): void {
    const track = this.productTrack?.nativeElement;
    const windowRef = this.document.defaultView;
    if (!track || !windowRef) return;

    const firstCard = track.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(windowRef.getComputedStyle(track).columnGap) || 0;
    const distance = firstCard
      ? firstCard.getBoundingClientRect().width + gap
      : track.clientWidth * 0.8;
    const reduceMotion = windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    track.scrollBy({ left: direction * distance, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  private updateCarouselEdges(): void {
    const track = this.productTrack?.nativeElement;
    if (!track) return;
    this.atStart.set(track.scrollLeft <= 1);
    this.atEnd.set(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }
}
