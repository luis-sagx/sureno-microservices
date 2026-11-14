export const AUTH_API = '/api/auth';
export const CATALOG_API = '/api/catalog';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegistrationPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  email_contacto?: string;
  username: string;
  password: string;
}

export interface BusinessRegistrationPayload extends RegistrationPayload {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion_negocio: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  roles: string[];
  estado_verificacion?: string;
  estado_solicitud?: string | null;
}

export interface LoginResponse {
  user_id: string;
  username: string;
  roles: string[];
  estado_verificacion: string;
  estado_solicitud?: string | null;
  session_expires_in_seconds: number;
}

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
