import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('initializes to the light theme when no preference has been saved', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const theme = TestBed.inject(ThemeService);

    theme.initialize();

    expect(theme.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('restores the saved theme and persists later changes', () => {
    localStorage.setItem('sureno-theme', 'dark');
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const theme = TestBed.inject(ThemeService);

    theme.initialize();
    expect(theme.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    theme.toggle();

    expect(theme.theme()).toBe('light');
    expect(localStorage.getItem('sureno-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('does not access browser storage during server initialization', () => {
    const getItem = vi.spyOn(window.localStorage, 'getItem');
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const theme = TestBed.inject(ThemeService);

    theme.initialize();

    expect(theme.theme()).toBe('light');
    expect(getItem).not.toHaveBeenCalled();
    expect(TestBed.inject(DOCUMENT).documentElement.getAttribute('data-theme')).toBe('light');
  });
});
