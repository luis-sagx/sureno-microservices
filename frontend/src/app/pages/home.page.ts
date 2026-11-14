import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  protected readonly featured = [
    { name: 'Caña Sureña', image: '/img-minorista/cana-surena.webp', category: 'Aguardientes' },
    { name: 'Vodka Blue', image: '/img-minorista/vodka-blue.webp', category: 'Vodkas' },
    { name: 'Aguardiente Diamante', image: '/img-minorista/aguardiente-diamante.webp', category: 'Aguardientes' },
  ];
}
