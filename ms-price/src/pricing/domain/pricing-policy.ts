export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PromotionCandidate {
  id: string;
  nombre: string;
  segmento: 'B2B' | 'B2C';
  tipo_descuento: DiscountType;
  valor_descuento: string | number;
  vigente_desde: Date | string;
  vigente_hasta: Date | string;
  activo: boolean;
  presentation_ids: readonly string[];
}

export interface PromotionQuote {
  promotion_id: string | null;
  promotion_name: string | null;
  discount_amount: string;
  final_amount: string;
}

export interface EffectiveUnitPrice {
  amount: string | number;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
}

export interface PublicCasePriceInput {
  caseAmount: string | number;
  startsAt: Date;
  endsAt: Date | null;
  unitsPerCase: number;
  unitPrices: readonly EffectiveUnitPrice[];
}

function toCents(value: string | number): bigint {
  const normalized = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error('El importe debe tener hasta dos decimales.');
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return BigInt(match[1]) * 100n + BigInt(fraction || '0');
}

function fromCents(value: bigint): string {
  const whole = value / 100n;
  const cents = String(value % 100n).padStart(2, '0');
  return `${whole}.${cents}`;
}

function dateValue(value: Date | string): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('La fecha de vigencia no es válida.');
  return timestamp;
}

export function validateDiscount(type: string, value: string | number): void {
  const cents = toCents(value);
  if (cents <= 0n) throw new Error('El descuento debe ser mayor que cero.');
  if (type === 'PERCENTAGE') {
    if (cents > 10_000n) throw new Error('El porcentaje debe estar entre 0.01 y 100.00.');
    return;
  }
  if (type !== 'FIXED_AMOUNT') {
    throw new Error('El tipo de descuento debe ser PERCENTAGE o FIXED_AMOUNT.');
  }
}

export function calculateBestPromotion(
  baseAmount: string | number,
  presentationId: string,
  promotions: readonly PromotionCandidate[],
  at: Date,
): PromotionQuote {
  const baseCents = toCents(baseAmount);
  if (baseCents < 0n) throw new Error('El precio base no puede ser negativo.');
  const now = at.getTime();
  if (!Number.isFinite(now)) throw new Error('La fecha de consulta no es válida.');

  const candidates = promotions
    .filter((promotion) => {
      if (!promotion.activo || promotion.segmento !== 'B2B') return false;
      if (!promotion.presentation_ids.includes(presentationId)) return false;
      return dateValue(promotion.vigente_desde) <= now && dateValue(promotion.vigente_hasta) > now;
    })
    .map((promotion) => {
      validateDiscount(promotion.tipo_descuento, promotion.valor_descuento);
      const valueCents = toCents(promotion.valor_descuento);
      const discountCents =
        promotion.tipo_descuento === 'PERCENTAGE'
          ? (baseCents * valueCents + 5_000n) / 10_000n
          : valueCents;
      return {
        promotion,
        discountCents: discountCents > baseCents ? baseCents : discountCents,
      };
    })
    .sort((left, right) => {
      if (left.discountCents === right.discountCents) {
        return left.promotion.id.localeCompare(right.promotion.id);
      }
      return left.discountCents > right.discountCents ? -1 : 1;
    });

  const best = candidates[0];
  const discountCents = best?.discountCents ?? 0n;
  return {
    promotion_id: best?.promotion.id ?? null,
    promotion_name: best?.promotion.nombre ?? null,
    discount_amount: fromCents(discountCents),
    final_amount: fromCents(baseCents - discountCents),
  };
}

export function validatePublicCasePrice(input: PublicCasePriceInput): {
  valid: boolean;
  reason?: string;
} {
  const caseAmount = toCents(input.caseAmount);
  const caseStart = input.startsAt.getTime();
  const caseEnd = input.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (
    !Number.isFinite(caseStart) ||
    (input.endsAt && !Number.isFinite(caseEnd)) ||
    caseStart >= caseEnd
  ) {
    return { valid: false, reason: 'El período de vigencia del precio de caja no es válido.' };
  }
  if (!Number.isInteger(input.unitsPerCase) || input.unitsPerCase < 1) {
    return { valid: false, reason: 'La presentación de caja debe incluir unidades válidas.' };
  }

  const unitPrices = input.unitPrices.filter((price) => price.active);
  const boundaries = new Set<number>([caseStart]);
  for (const price of unitPrices) {
    const start = price.startsAt.getTime();
    const end = price.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (start > caseStart && start < caseEnd) boundaries.add(start);
    if (end > caseStart && end < caseEnd) boundaries.add(end);
  }

  const orderedBoundaries = [...boundaries].sort((left, right) => left - right);
  for (const timestamp of orderedBoundaries) {
    const unitPrice = unitPrices.find((price) => {
      const start = price.startsAt.getTime();
      const end = price.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return start <= timestamp && timestamp < end;
    });
    if (!unitPrice) {
      return {
        valid: false,
        reason: 'Debe existir un precio público por unidad durante toda la vigencia de la caja.',
      };
    }
    const twelveUnits = toCents(unitPrice.amount) * BigInt(input.unitsPerCase);
    if (caseAmount >= twelveUnits) {
      return {
        valid: false,
        reason: `El precio público de caja debe ser menor que el precio de sus ${input.unitsPerCase} unidades.`,
      };
    }
  }

  return { valid: true };
}
