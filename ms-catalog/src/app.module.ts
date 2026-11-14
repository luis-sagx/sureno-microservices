import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { Category } from './catalog/entities/category.entity.js';
import { Product } from './catalog/entities/product.entity.js';
import { Presentation } from './catalog/entities/presentation.entity.js';
import { AvailabilityChange } from './catalog/entities/availability-change.entity.js';
import { CreateCatalogAndSeedReferenceProducts1700000000000 } from './catalog/migrations/1700000000000-CreateCatalogAndSeedReferenceProducts.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.CATALOG_DB_HOST ?? 'localhost',
      port: Number(process.env.CATALOG_DB_PORT ?? process.env.POSTGRES_PORT ?? 5432),
      username: process.env.CATALOG_DB_USER ?? 'catalog_app',
      password: process.env.CATALOG_DB_PASSWORD,
      database: process.env.CATALOG_DB_NAME ?? 'catalog_db',
      entities: [Category, Product, Presentation, AvailabilityChange],
      migrations: [CreateCatalogAndSeedReferenceProducts1700000000000],
      migrationsRun: true,
      synchronize: false,
    }),
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
