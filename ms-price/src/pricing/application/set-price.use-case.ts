import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PriceInput, PriceRecord } from '../domain/pricing-model.js';
import { PricingError } from '../domain/pricing-error.js';
import { validatePublicCasePrice } from '../domain/pricing-policy.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export interface NormalizedPriceInput {
  presentation_id: string;
  segmento: 'B2B' | 'B2C';
  importe: string;
  vigente_desde: Date;
  vigente_hasta: Date | null;
  activo: boolean;
}

function timestamp(value: unknown, field: string): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new PricingError('bad_request', `${field} debe ser una fecha válida.`);
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new PricingError('bad_request', `${field} debe ser una fecha válida.`);
  }
  return date;
}

function amount(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new PricingError('bad_request', 'importe debe ser un valor monetario positivo.');
  }
  const normalized = String(value).trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new PricingError('bad_request', 'importe debe ser positivo y admitir hasta dos decimales.');
  }
  return Number(normalized).toFixed(2);
}

function overlaps(start: Date, end: Date | null, otherStart: Date, otherEnd: Date | null): boolean {
  return start.getTime() < (otherEnd?.getTime() ?? Number.POSITIVE_INFINITY) &&
    otherStart.getTime() < (end?.getTime() ?? Number.POSITIVE_INFINITY);
}

function assertPeriod(start: Date, end: Date | null): void {
  if (end && start.getTime() >= end.getTime()) {
    throw new PricingError('bad_request', 'vigente_hasta debe ser posterior a vigente_desde.');
  }
}

export class SetPrice {
  constructor(
    private readonly repository: PricingRepository,
    private readonly catalog: PricingCatalogPort,
  ) {}

  async execute(input: PriceInput, actorUserId: string): Promise<PriceRecord> {
    const normalized = await this.validate(input, actorUserId);
    return this.repository.createPrice({ ...normalized, actor_user_id: actorUserId });
  }

  async validate(
    input: PriceInput,
    actorUserId: string,
    excludePriceId?: string,
  ): Promise<NormalizedPriceInput> {
    if (!UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('unauthorized', 'No se pudo identificar al administrador.');
    }
    if (typeof input.presentation_id !== 'string' || !UUID_PATTERN.test(input.presentation_id)) {
      throw new PricingError('bad_request', 'presentation_id debe ser un UUID válido.');
    }
    if (input.segmento !== 'B2B' && input.segmento !== 'B2C') {
      throw new PricingError('bad_request', 'segmento debe ser B2B o B2C.');
    }
    const priceAmount = amount(input.importe);
    const startsAt = timestamp(input.vigente_desde, 'vigente_desde');
    const endsAt = input.vigente_hasta == null || input.vigente_hasta === ''
      ? null
      : timestamp(input.vigente_hasta, 'vigente_hasta');
    assertPeriod(startsAt, endsAt);
    const active = input.activo === undefined ? true : input.activo;
    if (typeof active !== 'boolean') {
      throw new PricingError('bad_request', 'activo debe ser true o false.');
    }

    const [presentation] = await this.catalog.getPresentations([input.presentation_id]);
    if (!presentation) {
      throw new PricingError('not_found', 'No existe una presentación activa con ese identificador.');
    }
    if (presentation.tipo === 'CAJA' && presentation.unidades_por_presentacion !== 12) {
      throw new PricingError('bad_request', 'La presentación de caja debe contener 12 unidades.');
    }
    if (input.segmento === 'B2B' && presentation.tipo !== 'CAJA') {
      throw new PricingError('bad_request', 'Las tarifas B2B solo se configuran para presentaciones de caja.');
    }

    const current = await this.repository.listPrices(input.presentation_id, input.segmento);
    if (
      active &&
      current.some((price) =>
        price.id !== excludePriceId && price.activo &&
        overlaps(startsAt, endsAt, price.vigente_desde, price.vigente_hasta),
      )
    ) {
      throw new PricingError('conflict', 'Ya existe una tarifa activa que se solapa con ese período.');
    }

    if (input.segmento === 'B2C' && presentation.tipo === 'CAJA') {
      await this.validatePublicCase(
        presentation.product_id,
        input.presentation_id,
        priceAmount,
        startsAt,
        endsAt,
        active,
      );
    }
    if (input.segmento === 'B2C' && presentation.tipo === 'UNIDAD' && active) {
      await this.validateExistingCases(presentation.product_id, { ...presentation, tipo: 'UNIDAD' }, {
        amount: priceAmount,
        startsAt,
        endsAt,
        active: true,
      });
    }

    return {
      presentation_id: input.presentation_id,
      segmento: input.segmento,
      importe: priceAmount,
      vigente_desde: startsAt,
      vigente_hasta: endsAt,
      activo: active,
    };
  }

  private async validatePublicCase(
    productId: string,
    caseId: string,
    caseAmount: string,
    startsAt: Date,
    endsAt: Date | null,
    active: boolean,
  ): Promise<void> {
    if (!active) return;
    const presentations = await this.catalog.getProductPresentations(productId);
    const unitPresentation = presentations.find((presentation) => presentation.tipo === 'UNIDAD');
    if (!unitPresentation || unitPresentation.unidades_por_presentacion !== 1) {
      throw new PricingError('conflict', 'No se puede configurar la caja sin una presentación de unidad activa.');
    }
    const unitPrices = await this.repository.listPrices(unitPresentation.id, 'B2C');
    const result = validatePublicCasePrice({
      caseAmount,
      startsAt,
      endsAt,
      unitsPerCase: 12,
      unitPrices: unitPrices.map((price) => ({
        amount: price.importe,
        startsAt: price.vigente_desde,
        endsAt: price.vigente_hasta,
        active: price.activo,
      })),
    });
    if (!result.valid) throw new PricingError('conflict', result.reason ?? 'Tarifa de caja inválida.');
    if (caseId !== presentations.find((presentation) => presentation.tipo === 'CAJA')?.id) {
      throw new PricingError('not_found', 'La presentación de caja no pertenece al producto.');
    }
  }

  private async validateExistingCases(
    productId: string,
    unitPresentation: { id: string; tipo: 'UNIDAD'; unidades_por_presentacion: number },
    proposedUnitPrice: { amount: string; startsAt: Date; endsAt: Date | null; active: boolean },
  ): Promise<void> {
    const presentations = await this.catalog.getProductPresentations(productId);
    const casePresentations = presentations.filter((presentation) => presentation.tipo === 'CAJA');
    if (!casePresentations.length) return;
    const casePrices = await this.repository.listPricesForProduct(
      casePresentations.map((presentation) => presentation.id),
      'B2C',
    );
    const previousUnitPrices = await this.repository.listPrices(unitPresentation.id, 'B2C');
    const unitPrices = [
      ...previousUnitPrices.map((price) => ({
        amount: price.importe,
        startsAt: price.vigente_desde,
        endsAt: price.vigente_hasta,
        active: price.activo,
      })),
      proposedUnitPrice,
    ];
    for (const boxPrice of casePrices) {
      if (!boxPrice.activo) continue;
      const result = validatePublicCasePrice({
        caseAmount: boxPrice.importe,
        startsAt: boxPrice.vigente_desde,
        endsAt: boxPrice.vigente_hasta,
        unitsPerCase: 12,
        unitPrices,
      });
      if (!result.valid) {
        throw new PricingError(
          'conflict',
          `El precio por unidad haría inválida la tarifa de caja ${boxPrice.id}: ${result.reason}`,
        );
      }
    }
  }
}
