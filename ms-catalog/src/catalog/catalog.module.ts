import { Module } from '@nestjs/common';
import { CatalogAdminGuard } from '../auth/catalog-admin.guard.js';
import { Ms01AuthClient } from '../auth/ms01-auth-client.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogAdminGuard, Ms01AuthClient],
})
export class CatalogModule {}
