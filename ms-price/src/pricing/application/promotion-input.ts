import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { PromotionInput } from '../domain/pricing-model.js';
import { PricingError } from '../domain/pricing-error.js';
import { validateDiscount } from '../domain/pricing-policy.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export interface NormalizedPromotionInput {
  nombre: string;
  segmento: 'B2B';
  tipo_descuento: 'PERCENTAGE' | 'FIXED_AMOUNT';
  valor_descuento: string;
  vigente_desde: Date;
  vigente_hasta: Date;
  presentation_ids: string[];
  activo: boolean;
}

export async function normalizePromotionInput(
  input: PromotionInput,
  catalog: PricingCatalogPort,
): Promise<NormalizedPromotionInput> {
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  if (!nombre || nombre.length > 120) {
    throw new PricingError('bad_request', 'nombre es obligatorio y admite hasta 120 caracteres.');
  }
  if (input.segmento !== 'B2B') {
    throw new PricingError('bad_request', 'Las promociones son exclusivas para el segmento B2B.');
  }
  if (input.tipo_descuento !== 'PERCENTAGE' && input.tipo_descuento !== 'FIXED_AMOUNT') {
    throw new PricingError('bad_request', 'tipo_descuento debe ser PERCENTAGE o FIXED_AMOUNT.');
  }
  if (typeof input.valor_descuento !== 'string' && typeof input.valor_descuento !== 'number') {
    throw new PricingError('bad_request', 'valor_descuento debe ser un importe positivo.');
  }
  try {
    validateDiscount(input.tipo_descuento, input.valor_descuento);
  } catch (error) {
    throw new PricingError('bad_request', (error as Error).message);
  }
  const value = Number(input.valor_descuento).toFixed(2);
  const vigente_desde = validDate(input.vigente_desde, 'vigente_desde');
  const vigente_hasta = validDate(input.vigente_hasta, 'vigente_hasta');
  if (vigente_desde.getTime() >= vigente_hasta.getTime()) {
    throw new PricingError('bad_request', 'vigente_hasta debe ser posterior a vigente_desde.');
  }
  if (!Array.isArray(input.presentation_ids) || input.presentation_ids.length < 1 || input.presentation_ids.length > 100) {
    throw new PricingError('bad_request', 'Incluye entre 1 y 100 presentaciones en la promoción.');
  }
  const presentationIds: string[] = input.presentation_ids.map((id) => {
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      throw new PricingError('bad_request', 'Cada presentation_id debe ser un UUID válido.');
    }
    return id;
  });
  if (new Set(presentationIds).size !== presentationIds.length) {
    throw new PricingError('bad_request', 'No repitas presentaciones en la promoción.');
  }
  const presentations = await catalog.getPresentations(presentationIds);
  const byId = new Map(presentations.map((presentation) => [presentation.id, presentation]));
  if (presentationIds.some((id) => !byId.has(id))) {
    throw new PricingError('not_found', 'Una o más presentaciones no existen o no están activas.');
  }
  if (presentations.some((presentation) => presentation.tipo !== 'CAJA' || presentation.unidades_por_presentacion !== 12)) {
    throw new PricingError('bad_request', 'Las promociones B2B solo pueden incluir cajas completas de 12 unidades.');
  }
  const activo = input.activo === undefined ? true : input.activo;
  if (typeof activo !== 'boolean') {
    throw new PricingError('bad_request', 'activo debe ser true o false.');
  }
  return {
    nombre,
    segmento: 'B2B',
    tipo_descuento: input.tipo_descuento,
    valor_descuento: value,
    vigente_desde,
    vigente_hasta,
    presentation_ids: presentationIds,
    activo,
  };
}

function validDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new PricingError('bad_request', `${field} debe ser una fecha válida.`);
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new PricingError('bad_request', `${field} debe ser una fecha válida.`);
  }
  return date;
}
