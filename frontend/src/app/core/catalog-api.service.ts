import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CATALOG_API, CatalogQuery, Category, Product, ProductPage } from './api';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${CATALOG_API}/categories`);
  }

  products(query: CatalogQuery = {}): Observable<ProductPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ProductPage>(`${CATALOG_API}/products`, { params });
  }

  product(id: string): Observable<Product> {
    return this.http.get<Product>(`${CATALOG_API}/products/${encodeURIComponent(id)}`);
  }
}
