import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home.page').then((module) => module.HomePage),
  },
  {
    path: 'quienes-somos',
    loadComponent: () => import('./pages/about.page').then((module) => module.AboutPage),
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalog.page').then((module) => module.CatalogPage),
  },
  {
    path: 'catalogo/producto/:id',
    loadComponent: () => import('./pages/product-detail.page').then((module) => module.ProductDetailPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/signup.page').then((module) => module.SignupPage),
  },
  { path: 'about', redirectTo: 'quienes-somos', pathMatch: 'full' },
  { path: 'catalog', redirectTo: 'catalogo', pathMatch: 'full' },
  { path: 'auth/login', redirectTo: 'login', pathMatch: 'full' },
  { path: 'auth/signup', redirectTo: 'registro', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
