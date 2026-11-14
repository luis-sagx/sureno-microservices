import { CatalogError } from './catalog-error.js';
import type {
  CategoryFields,
  PresentationFields,
  PresentationInput,
  ProductFields,
  ProductInput,
  ProductUpdateInput,
  ProductWriteInput,
} from './catalog-model.js';

export function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new CatalogError(
      'bad_request',
      `${field} es obligatorio y admite hasta ${max} caracteres.`,
    );
  }
  return value.trim();
}

export function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 5000) {
    throw new CatalogError('bad_request', `${field} debe ser texto de hasta 5000 caracteres.`);
  }
  return value.trim() || null;
}

export function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new CatalogError('bad_request', `${field} debe ser un entero positivo.`);
  }
  return value as number;
}

export function positiveIntegerOrNull(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  return positiveInteger(value, field);
}

export function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new CatalogError('bad_request', `${field} debe ser booleano.`);
  }
  return value;
}

export function validateUuid(value: string, field: string): void {
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new CatalogError('bad_request', `${field} no es un UUID válido.`);
  }
}

export function categoryFields(input: {
  nombre?: unknown;
  descripcion?: unknown;
  activo?: unknown;
}): CategoryFields {
  const result: CategoryFields = {};
  if (input.nombre !== undefined) result.nombre = requiredText(input.nombre, 'nombre', 100);
  if (input.descripcion !== undefined) result.descripcion = optionalText(input.descripcion, 'descripcion');
  if (input.activo !== undefined) result.activo = booleanValue(input.activo, 'activo');
  return result;
}

export function productFields(input: ProductInput, partial = false): ProductFields {
  const result: ProductFields = {};
  if (!partial || input.nombre !== undefined) {
    result.nombre = requiredText(input.nombre, 'nombre', 160);
  }
  if (!partial || input.descripcion !== undefined) {
    result.descripcion = optionalText(input.descripcion, 'descripcion');
  }
  if (!partial || input.volumen_ml !== undefined) {
    result.volumen_ml = positiveIntegerOrNull(input.volumen_ml, 'volumen_ml');
  }
  if (!partial || input.disponible !== undefined) {
    result.disponible = booleanValue(input.disponible ?? true, 'disponible');
  }
  if (!partial || input.activo !== undefined) {
    result.activo = booleanValue(input.activo ?? true, 'activo');
  }
  return result;
}

export function presentationInputs(value: unknown): PresentationFields[] {
  if (!Array.isArray(value)) {
    throw new CatalogError('bad_request', 'presentaciones debe ser una lista.');
  }
  if (value.length === 0) {
    throw new CatalogError('bad_request', 'Agrega al menos una presentación activa.');
  }
  const types = new Set<string>();
  return value.map((item: PresentationInput) => {
    if (!item || typeof item !== 'object') {
      throw new CatalogError('bad_request', 'Cada presentación debe ser un objeto.');
    }
    const tipo = item.tipo;
    if (tipo !== 'UNIDAD' && tipo !== 'CAJA') {
      throw new CatalogError('bad_request', 'tipo debe ser UNIDAD o CAJA.');
    }
    if (types.has(tipo)) {
      throw new CatalogError('bad_request', 'No repitas tipos de presentación.');
    }
    types.add(tipo);
    const units = positiveInteger(item.unidades_por_presentacion, 'unidades_por_presentacion');
    if (tipo === 'UNIDAD' && units !== 1) {
      throw new CatalogError('bad_request', 'La presentación UNIDAD debe contener una unidad.');
    }
    return {
      tipo,
      unidades_por_presentacion: units,
      activo: item.activo === undefined ? true : booleanValue(item.activo, 'activo'),
    };
  });
}

export function productWriteInput(input: ProductInput): ProductWriteInput {
  const categoryId = input?.category_id;
  if (typeof categoryId !== 'string') {
    throw new CatalogError('bad_request', 'category_id es obligatorio.');
  }
  validateUuid(categoryId, 'category_id');
  return {
    category_id: categoryId,
    fields: productFields(input),
    presentaciones: presentationInputs(input.presentaciones),
  };
}

export function productUpdateInput(id: string, input: ProductInput): ProductUpdateInput {
  validateUuid(id, 'productId');
  if (input.disponible !== undefined) {
    throw new CatalogError(
      'bad_request',
      'Cambia la disponibilidad en la ruta de disponibilidad para conservar su historial.',
    );
  }
  const result: ProductUpdateInput = { fields: productFields(input, true) };
  if (input.category_id !== undefined) {
    if (typeof input.category_id !== 'string') {
      throw new CatalogError('bad_request', 'category_id es obligatorio.');
    }
    validateUuid(input.category_id, 'category_id');
    result.category_id = input.category_id;
  }
  if (input.presentaciones !== undefined) {
    result.presentaciones = presentationInputs(input.presentaciones);
  }
  return result;
}
