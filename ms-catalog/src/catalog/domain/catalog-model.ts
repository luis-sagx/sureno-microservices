export interface CategoryRecord {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface PresentationRecord {
  id: string;
  tipo: 'UNIDAD' | 'CAJA';
  unidades_por_presentacion: number;
  activo: boolean;
}

export interface ProductRecord {
  id: string;
  category_id: string;
  category: CategoryRecord | null;
  nombre: string;
  descripcion: string | null;
  volumen_ml: number | null;
  disponible: boolean;
  activo: boolean;
  presentaciones: PresentationRecord[];
}

export interface AvailabilityChangeRecord {
  id: string;
  product_id: string;
  estado_anterior: boolean;
  estado_nuevo: boolean;
  actor_user_id: string;
  cambiado_en: Date;
}

export interface ProductQuery {
  q?: string;
  category_id?: string;
  disponible?: boolean;
  page: number;
  page_size: number;
  incluir_inactivos?: boolean;
}

export interface ProductInput {
  category_id?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  volumen_ml?: unknown;
  disponible?: unknown;
  activo?: unknown;
  presentaciones?: unknown;
}

export interface PresentationInput {
  tipo?: unknown;
  unidades_por_presentacion?: unknown;
  activo?: unknown;
}

export interface ProductFields {
  nombre?: string;
  descripcion?: string | null;
  volumen_ml?: number | null;
  disponible?: boolean;
  activo?: boolean;
}

export interface PresentationFields {
  tipo: 'UNIDAD' | 'CAJA';
  unidades_por_presentacion: number;
  activo: boolean;
}

export interface ProductWriteInput {
  category_id: string;
  fields: ProductFields;
  presentaciones: PresentationFields[];
}

export interface ProductUpdateInput {
  fields: ProductFields;
  category_id?: string;
  presentaciones?: PresentationFields[];
}

export interface CategoryFields {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CatalogProductPage {
  items: ProductRecord[];
  total: number;
}
