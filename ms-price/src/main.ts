import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { PricingErrorFilter } from './pricing/pricing-error.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalFilters(new PricingErrorFilter());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
