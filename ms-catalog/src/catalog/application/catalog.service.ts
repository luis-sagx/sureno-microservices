import { CatalogError } from '../domain/catalog-error.js';
import {
  booleanValue,
  categoryFields,
  productUpdateInput,
  productWriteInput,
  validateUuid,
} from '../domain/catalog-validation.js';
import type {
  CategoryRecord,
  ProductInput,
  ProductQuery,
  ProductRecord,
} from '../domain/catalog-model.js';
import type { CatalogRepository } from './catalog.repository.js';

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async listCategories(includeInactive = false) {
    return (await this.repository.listCategories(includeInactive)).map((category) =>
      this.categoryResponse(category),
    );
  }

  async listProducts(query: ProductQuery) {
    if (query.category_id) validateUuid(query.category_id, 'category_id');
    if ((query.q?.length ?? 0) > 120) {
      throw new CatalogError('bad_request', 'q admite hasta 120 caracteres.');
    }
    const { items, total } = await this.repository.listProducts(query);
    return {
      items: items.map((product) => this.productResponse(product)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getProduct(id: string) {
    validateUuid(id, 'productId');
    const product = await this.repository.getProduct(id);
    if (!product) throw new CatalogError('not_found', 'No se encontró el producto.');
    return this.productResponse(product);
  }

  async createCategory(input: { nombre?: unknown; descripcion?: unknown }) {
    const fields = categoryFields(input);
    const category = await this.repository.createCategory({
      nombre: fields.nombre ?? this.requiredText(input?.nombre, 'nombre', 100),
      descripcion: fields.descripcion ?? this.optionalText(input?.descripcion, 'descripcion'),
      activo: true,
    });
    return this.categoryResponse(category);
  }

  async updateCategory(
    id: string,
    input: { nombre?: unknown; descripcion?: unknown; activo?: unknown },
  ) {
    validateUuid(id, 'categoryId');
    const category = await this.repository.updateCategory(id, categoryFields(input));
    if (!category) throw new CatalogError('not_found', 'No se encontró la categoría.');
    return this.categoryResponse(category);
  }

  async createProduct(input: ProductInput) {
    const product = await this.repository.createProduct(productWriteInput(input));
    return this.productResponse(product);
  }

  async updateProduct(id: string, input: ProductInput) {
    const product = await this.repository.updateProduct(id, productUpdateInput(id, input));
    if (!product) throw new CatalogError('not_found', 'No se encontró el producto.');
    return this.productResponse(product);
  }

  async setAvailability(productId: string, availableValue: unknown, actorUserId: string) {
    validateUuid(productId, 'productId');
    validateUuid(actorUserId, 'actorUserId');
    const available = booleanValue(availableValue, 'disponible');
    const product = await this.repository.setAvailability({
      productId,
      available,
      actorUserId,
    });
    if (!product) throw new CatalogError('not_found', 'No se encontró el producto.');
    return this.productResponse(product);
  }

  async listAvailabilityChanges(productId: string) {
    validateUuid(productId, 'productId');
    const result = await this.repository.listAvailabilityChanges(productId);
    if (!result.exists) throw new CatalogError('not_found', 'No se encontró el producto.');
    return result.changes.map((change) => ({
      id: change.id,
      product_id: change.product_id,
      estado_anterior: change.estado_anterior,
      estado_nuevo: change.estado_nuevo,
      actor_user_id: change.actor_user_id,
      cambiado_en: change.cambiado_en,
    }));
  }

  private categoryResponse(category: CategoryRecord) {
    return {
      id: category.id,
      nombre: category.nombre,
      descripcion: category.descripcion,
      activo: category.activo,
    };
  }

  private productResponse(product: ProductRecord) {
    return {
      id: product.id,
      category_id: product.category_id,
      categoria: product.category ? this.categoryResponse(product.category) : undefined,
      nombre: product.nombre,
      descripcion: product.descripcion,
      volumen_ml: product.volumen_ml,
      disponible: product.disponible,
      activo: product.activo,
      presentaciones: product.presentaciones
        .filter((presentation) => presentation.activo)
        .sort((a, b) => a.tipo.localeCompare(b.tipo))
        .map((presentation) => ({
          id: presentation.id,
          tipo: presentation.tipo,
          unidades_por_presentacion: presentation.unidades_por_presentacion,
          activo: presentation.activo,
        })),
    };
  }

  private requiredText(value: unknown, field: string, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
      throw new CatalogError(
        'bad_request',
        `${field} es obligatorio y admite hasta ${max} caracteres.`,
      );
    }
    return value.trim();
  }

  private optionalText(value: unknown, field: string) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || value.length > 5000) {
      throw new CatalogError('bad_request', `${field} debe ser texto de hasta 5000 caracteres.`);
    }
    return value.trim() || null;
  }
}
