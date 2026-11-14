import type { PricingCatalogPort } from '../../application/pricing-catalog.port.js';
import { PricingError } from '../../domain/pricing-error.js';

export class PricingCatalogHttpAdapter implements PricingCatalogPort {
  constructor(private readonly baseUrl: string) {}
  async getPresentations(ids: readonly string[]) {
    const all = await this.fetchAll();
    const byId = new Map(all.flatMap((p) => p.presentaciones.filter((presentation) => presentation.activo && p.activo).map((presentation) => [presentation.id, { ...presentation, product_id: p.id }] as const)));
    return ids.flatMap((id) => { const found = byId.get(id); return found ? [found] : []; });
  }
  async getProductPresentations(productId: string) {
    const products = await this.fetchAll();
    const product = products.find((item) => item.id === productId);
    return product?.presentaciones.filter((presentation) => presentation.activo && product.activo).map((presentation) => ({ ...presentation, product_id: product.id })) ?? [];
  }
  private async fetchAll(): Promise<Array<{ id: string; activo: boolean; presentaciones: Array<{ id: string; tipo: 'UNIDAD'|'CAJA'; unidades_por_presentacion: number; activo: boolean }> }>> {
    const results: Array<{ id: string; activo: boolean; presentaciones: Array<{ id: string; tipo: 'UNIDAD'|'CAJA'; unidades_por_presentacion: number; activo: boolean }> }> = [];
    for (let page = 1; page <= 100; page++) {
      let response: Response;
      try { response = await fetch(`${this.baseUrl}/catalog/products?page=${page}&page_size=100`); }
      catch { throw new PricingError('unavailable', 'No se pudo consultar el catálogo.'); }
      if (!response.ok) throw new PricingError('unavailable', 'El catálogo no está disponible.');
      const payload = await response.json() as { items?: typeof results; data?: typeof results } | typeof results;
      const items = Array.isArray(payload) ? payload : payload.items ?? payload.data ?? [];
      results.push(...items);
      if (items.length < 100) return results;
    }
    return results;
  }
}
