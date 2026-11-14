import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { Pool } from 'pg';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CreatePromotion } from './pricing/application/create-promotion.use-case.js';
import { DeactivatePrice } from './pricing/application/deactivate-price.use-case.js';
import { DeactivatePromotion } from './pricing/application/deactivate-promotion.use-case.js';
import { PRICING_CATALOG_PORT, PRICING_REPOSITORY, PRICING_SESSION_PORT } from './pricing/application/pricing.tokens.js';
import { QuotePrices } from './pricing/application/quote-prices.use-case.js';
import { SetPrice } from './pricing/application/set-price.use-case.js';
import { UpdatePrice } from './pricing/application/update-price.use-case.js';
import { UpdatePromotion } from './pricing/application/update-promotion.use-case.js';
import { PricingCatalogHttpAdapter } from './pricing/infrastructure/http/pricing-catalog.http-adapter.js';
import { PricingSessionHttpAdapter } from './pricing/infrastructure/http/pricing-session.http-adapter.js';
import { PricingPostgresRepository } from './pricing/infrastructure/postgres/pricing-postgres.repository.js';
import { PricingController } from './pricing/pricing.controller.js';
import { PricingAdminGuard } from './pricing/pricing-admin.guard.js';
import { PricingErrorFilter } from './pricing/pricing-error.filter.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
const pool = new Pool({ host: process.env.PRICES_DB_HOST ?? 'localhost', port: Number(process.env.PRICES_DB_PORT ?? 5432), user: process.env.PRICES_DB_USER ?? 'prices_app', password: process.env.PRICES_DB_PASSWORD, database: process.env.PRICES_DB_NAME ?? 'prices_db' });

@Module({
  imports: [ObserveModule.forRoot({ appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY', appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET', serviceId: 'ms-price' })],
  controllers: [AppController, PricingController],
  providers: [
    AppService,
    PricingAdminGuard,
    PricingErrorFilter,
    { provide: PRICING_REPOSITORY, useFactory: () => new PricingPostgresRepository(pool) },
    { provide: PRICING_CATALOG_PORT, useFactory: () => new PricingCatalogHttpAdapter(process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002') },
    { provide: PRICING_SESSION_PORT, useFactory: () => new PricingSessionHttpAdapter(process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001') },
    { provide: QuotePrices, useFactory: (repo, catalog, sessions) => new QuotePrices(repo, catalog, sessions), inject: [PRICING_REPOSITORY, PRICING_CATALOG_PORT, PRICING_SESSION_PORT] },
    { provide: SetPrice, useFactory: (repo, catalog) => new SetPrice(repo, catalog), inject: [PRICING_REPOSITORY, PRICING_CATALOG_PORT] },
    { provide: CreatePromotion, useFactory: (repo, catalog) => new CreatePromotion(repo, catalog), inject: [PRICING_REPOSITORY, PRICING_CATALOG_PORT] },
    { provide: UpdatePrice, useFactory: (repo, setPrice) => new UpdatePrice(repo, setPrice), inject: [PRICING_REPOSITORY, SetPrice] },
    { provide: DeactivatePrice, useFactory: (repo) => new DeactivatePrice(repo), inject: [PRICING_REPOSITORY] },
    { provide: UpdatePromotion, useFactory: (repo, catalog) => new UpdatePromotion(repo, catalog), inject: [PRICING_REPOSITORY, PRICING_CATALOG_PORT] },
    { provide: DeactivatePromotion, useFactory: (repo) => new DeactivatePromotion(repo), inject: [PRICING_REPOSITORY] },
  ],
})
export class AppModule {}
