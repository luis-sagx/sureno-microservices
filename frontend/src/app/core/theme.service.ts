import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'sureno-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentTheme = signal<ThemeMode>('light');
  readonly theme = this.currentTheme.asReadonly();

  initialize(): void {
    const savedTheme = this.isBrowser
      ? globalThis.localStorage?.getItem(THEME_STORAGE_KEY)
      : null;
    this.applyTheme(savedTheme === 'dark' ? 'dark' : 'light', false);
  }

  toggle(): void {
    this.applyTheme(this.theme() === 'light' ? 'dark' : 'light', true);
  }

  private applyTheme(theme: ThemeMode, persist: boolean): void {
    this.currentTheme.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);
    if (this.isBrowser && persist) {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    }
  }
}
