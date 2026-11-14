import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly menuOpen = signal(false);
  protected readonly theme = inject(ThemeService);

  constructor(protected readonly auth: AuthService) {}

  ngOnInit() {
    this.theme.initialize();
    this.auth.restoreSession();
  }

  protected closeMenu() {
    this.menuOpen.set(false);
  }

  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
  }
}
