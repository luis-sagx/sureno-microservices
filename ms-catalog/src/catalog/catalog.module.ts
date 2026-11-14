import { Module } from '@nestjs/common';
import { CatalogAdminGuard } from '../auth/catalog-admin.guard.js';
import { Ms01AuthClient } from '../auth/ms01-auth-client.js';
import { CATALOG_AUTH_PORT, CATALOG_REPOSITORY } from './application/catalog.tokens.js';
import { CatalogService } from './application/catalog.service.js';
import { CatalogController } from './catalog.controller.js';
import { TypeOrmCatalogRepository } from './infrastructure/persistence/typeorm-catalog.repository.js';

@Module({
  controllers: [CatalogController],
  providers: [
    TypeOrmCatalogRepository,
    Ms01AuthClient,
    { provide: CATALOG_REPOSITORY, useExisting: TypeOrmCatalogRepository },
    { provide: CATALOG_AUTH_PORT, useExisting: Ms01AuthClient },
    {
      provide: CatalogService,
      useFactory: (repository: TypeOrmCatalogRepository) => new CatalogService(repository),
      inject: [CATALOG_REPOSITORY],
    },
    CatalogAdminGuard,
  ],
})
export class CatalogModule {}
