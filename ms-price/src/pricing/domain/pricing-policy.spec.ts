import { describe, expect, it } from 'vitest';
import {
  calculateBestPromotion,
  validateDiscount,
  validatePublicCasePrice,
} from './pricing-policy.js';

const now = new Date('2026-11-14T12:00:00.000Z');
const casePresentationId = '10000000-0000-4000-8000-000000000001';

describe('pricing policies', () => {
  it('selects the single greatest active B2B discount for the quoted presentation', () => {
    const quote = calculateBestPromotion('100.00', casePresentationId, [
      {
        id: 'promotion-10-percent',
        nombre: 'Diez por ciento',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '10.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
      {
        id: 'promotion-15-fixed',
        nombre: 'Quince dólares',
        segmento: 'B2B',
        tipo_descuento: 'FIXED_AMOUNT',
        valor_descuento: '15.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
    ], now);

    expect(quote).toEqual({
      promotion_id: 'promotion-15-fixed',
      promotion_name: 'Quince dólares',
      discount_amount: '15.00',
      final_amount: '85.00',
    });
  });

  it('ignores inactive, expired, wrong-segment, and non-member promotions', () => {
    const quote = calculateBestPromotion('50.00', casePresentationId, [
      {
        id: 'inactive',
        nombre: 'Inactiva',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '100.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: false,
        presentation_ids: [casePresentationId],
      },
      {
        id: 'expired',
        nombre: 'Vencida',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '100.00',
        vigente_desde: new Date('2026-10-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-11-14T11:59:59.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
      {
        id: 'wrong-segment',
        nombre: 'Minorista',
        segmento: 'B2C',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '100.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
      {
        id: 'wrong-presentation',
        nombre: 'Otra presentación',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '100.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: ['20000000-0000-4000-8000-000000000002'],
      },
    ], now);

    expect(quote).toEqual({
      promotion_id: null,
      promotion_name: null,
      discount_amount: '0.00',
      final_amount: '50.00',
    });
  });

  it('clamps a fixed discount to the base amount and rounds percentage discounts to cents', () => {
    const fixed = calculateBestPromotion('4.00', casePresentationId, [
      {
        id: 'over-value',
        nombre: 'Descuento mayor al precio',
        segmento: 'B2B',
        tipo_descuento: 'FIXED_AMOUNT',
        valor_descuento: '9.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
    ], now);
    const percentage = calculateBestPromotion('19.99', casePresentationId, [
      {
        id: 'rounding',
        nombre: 'Un tercio',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '33.33',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [casePresentationId],
      },
    ], now);

    expect(fixed.discount_amount).toBe('4.00');
    expect(fixed.final_amount).toBe('0.00');
    expect(percentage.discount_amount).toBe('6.66');
    expect(percentage.final_amount).toBe('13.33');
  });

  it('accepts only positive fixed amounts and percentages from 0.01 through 100', () => {
    expect(() => validateDiscount('PERCENTAGE', '0')).toThrow();
    expect(() => validateDiscount('PERCENTAGE', '100.01')).toThrow();
    expect(() => validateDiscount('FIXED_AMOUNT', '0')).toThrow();
    expect(() => validateDiscount('PERCENTAGE', '12.50')).not.toThrow();
    expect(() => validateDiscount('FIXED_AMOUNT', '4.25')).not.toThrow();
  });

  it('requires a B2C case amount to stay below twelve public unit prices throughout its effective range', () => {
    const valid = validatePublicCasePrice({
      caseAmount: '40.00',
      startsAt: new Date('2026-11-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-01T00:00:00.000Z'),
      unitsPerCase: 12,
      unitPrices: [
        {
          amount: '5.00',
          startsAt: new Date('2026-10-01T00:00:00.000Z'),
          endsAt: new Date('2026-11-15T00:00:00.000Z'),
          active: true,
        },
        {
          amount: '4.00',
          startsAt: new Date('2026-11-15T00:00:00.000Z'),
          endsAt: new Date('2026-12-15T00:00:00.000Z'),
          active: true,
        },
      ],
    });
    const invalid = validatePublicCasePrice({
      caseAmount: '40.00',
      startsAt: new Date('2026-11-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-01T00:00:00.000Z'),
      unitsPerCase: 12,
      unitPrices: [
        {
          amount: '5.00',
          startsAt: new Date('2026-10-01T00:00:00.000Z'),
          endsAt: new Date('2026-11-15T00:00:00.000Z'),
          active: true,
        },
        {
          amount: '3.00',
          startsAt: new Date('2026-11-15T00:00:00.000Z'),
          endsAt: new Date('2026-12-15T00:00:00.000Z'),
          active: true,
        },
      ],
    });

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.reason).toContain('12 unidades');
  });
});
