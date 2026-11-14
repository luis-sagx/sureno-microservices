import type { DiscountType } from './pricing-policy.js';

export type CustomerSegment = 'B2B' | 'B2C';
export type PresentationType = 'UNIDAD' | 'CAJA';

export interface PriceRecord {
  id: string;
  presentation_id: string;
  segmento: CustomerSegment;
  importe: string;
  vigente_desde: Date;
  vigente_hasta: Date | null;
  activo: boolean;
}

export interface PriceChangeRecord {
  id: string;
  price_id: string;
  importe_anterior: string | null;
  importe_nuevo: string;
  actor_user_id: string;
  cambiado_en: Date;
}

export interface PromotionRecord {
  id: string;
  nombre: string;
  segmento: CustomerSegment;
  tipo_descuento: DiscountType;
  valor_descuento: string;
  vigente_desde: Date;
  vigente_hasta: Date;
  activo: boolean;
  presentation_ids: string[];
}

export interface PromotionChangeRecord {
  id: string;
  promotion_id: string;
  accion: 'CREATED' | 'UPDATED' | 'DEACTIVATED';
  actor_user_id: string;
  cambiado_en: Date;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown>;
}

export interface PresentationReference {
  id: string;
  product_id: string;
  tipo: PresentationType;
  unidades_por_presentacion: number;
}

export interface PriceInput {
  presentation_id?: unknown;
  segmento?: unknown;
  importe?: unknown;
  vigente_desde?: unknown;
  vigente_hasta?: unknown;
  activo?: unknown;
}

export interface PromotionInput {
  nombre?: unknown;
  segmento?: unknown;
  tipo_descuento?: unknown;
  valor_descuento?: unknown;
  vigente_desde?: unknown;
  vigente_hasta?: unknown;
  presentation_ids?: unknown;
  activo?: unknown;
}
