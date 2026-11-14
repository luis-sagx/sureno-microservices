export interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Presentation {
  id: string;
  tipo: 'UNIDAD' | 'CAJA';
  unidades_por_presentacion: number;
  activo: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  categoria: Category;
  nombre: string;
  descripcion: string | null;
  volumen_ml: number | null;
  disponible: boolean;
  activo: boolean;
  presentaciones: Presentation[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface CatalogQuery {
  q?: string;
  category_id?: string;
  disponible?: boolean;
  page?: number;
  page_size?: number;
}
