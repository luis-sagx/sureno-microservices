import { INestApplication, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { PricingController } from '../src/pricing/pricing.controller.js';
import { PricingAdminGuard } from '../src/pricing/pricing-admin.guard.js';
import { QuotePrices } from '../src/pricing/application/quote-prices.use-case.js';
import { SetPrice } from '../src/pricing/application/set-price.use-case.js';
import { CreatePromotion } from '../src/pricing/application/create-promotion.use-case.js';
import { UpdatePrice } from '../src/pricing/application/update-price.use-case.js';
import { DeactivatePrice } from '../src/pricing/application/deactivate-price.use-case.js';
import { UpdatePromotion } from '../src/pricing/application/update-promotion.use-case.js';
import { DeactivatePromotion } from '../src/pricing/application/deactivate-promotion.use-case.js';
import { PRICING_SESSION_PORT } from '../src/pricing/application/pricing.tokens.js';
import type { PricingCredentials, PricingSessionPort } from '../src/pricing/application/pricing-session.port.js';

const unitId = '10000000-0000-4000-8000-000000000011';
const adminId = '00000000-0000-4000-8000-000000000001';

describe('MS04 pricing HTTP API', () => {
  let app: INestApplication;
  const quotePrices = { execute: vi.fn() };
  const setPrice = { execute: vi.fn() };
  const createPromotion = { execute: vi.fn() };
  const sessions: PricingSessionPort = {
    resolveOptional: vi.fn(async () => null),
    requireAdmin: vi.fn(async (credentials: PricingCredentials) => {
      if (!credentials.cookie) throw new UnauthorizedException('Debes iniciar sesión.');
      if (credentials.cookie !== 'admin-session') throw new ForbiddenException('Se requiere ADMIN.');
      return { userId: adminId, roles: ['ADMIN'] };
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    quotePrices.execute.mockResolvedValue({ items: [{ presentation_id: unitId, segmento: 'B2C' }] });
    setPrice.execute.mockResolvedValue({ id: 'price-1' });
    createPromotion.execute.mockResolvedValue({ id: 'promotion-1' });
    const moduleRef = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        PricingAdminGuard,
        { provide: QuotePrices, useValue: quotePrices },
        { provide: SetPrice, useValue: setPrice },
        { provide: CreatePromotion, useValue: createPromotion },
        { provide: UpdatePrice, useValue: { execute: vi.fn(), history: vi.fn() } },
        { provide: DeactivatePrice, useValue: { execute: vi.fn() } },
        { provide: UpdatePromotion, useValue: { execute: vi.fn(), history: vi.fn() } },
        { provide: DeactivatePromotion, useValue: { execute: vi.fn() } },
        { provide: PRICING_SESSION_PORT, useValue: sessions },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => app.close());

  it('quotes in batch and ignores a client-supplied segment', async () => {
    await request(app.getHttpServer())
      .get(`/prices/quotes?presentation_ids=${unitId}&segmento=B2B`)
      .expect(200);

    expect(quotePrices.execute).toHaveBeenCalledWith({
      presentationIds: [unitId],
      credentials: { cookie: undefined, authorization: undefined },
    });
  });

  it('requires an ADMIN session before mutating price and promotion records', async () => {
    const body = { presentation_id: unitId, segmento: 'B2C', importe: '5.00' };
    await request(app.getHttpServer()).post('/prices/admin/prices').send(body).expect(401);
    await request(app.getHttpServer())
      .post('/prices/admin/prices')
      .set('Cookie', 'user-session')
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post('/prices/admin/prices')
      .set('Cookie', 'admin-session')
      .send(body)
      .expect(201);
    await request(app.getHttpServer())
      .post('/prices/admin/promotions')
      .set('Cookie', 'user-session')
      .send({})
      .expect(403);

    expect(setPrice.execute).toHaveBeenCalledWith(body, adminId);
    expect(createPromotion.execute).not.toHaveBeenCalled();
  });
});
