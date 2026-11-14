import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
})
export class AboutPage {
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
    { name: 'Whisky Red Diez', image: '/img-minorista/wisky-red-diez.webp' },
  ];
}
