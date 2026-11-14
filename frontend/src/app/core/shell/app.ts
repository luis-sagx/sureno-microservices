import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth.service';
import { ThemeService } from '../theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly menuOpen = signal(false);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

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

  protected isAuthRoute() {
    const path = this.router.url.split(/[?#]/, 1)[0];
    return path === '/login' || path === '/registro';
  }
}
