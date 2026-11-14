import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { CatalogAdminRequest } from '../auth/catalog-admin.guard.js';
import { CatalogAdminGuard } from '../auth/catalog-admin.guard.js';
import { CatalogService } from './application/catalog.service.js';
import type { ProductInput } from './domain/catalog-model.js';
import { CatalogExceptionFilter } from './catalog-exception.filter.js';

function parsePage(value: string | undefined, fallback: number, field: string, max: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new BadRequestException(`${field} debe ser un entero entre 1 y ${max}.`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException(`${field} debe ser true o false.`);
}

@Controller('catalog')
@UseFilters(CatalogExceptionFilter)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('admin/categories')
  @UseGuards(CatalogAdminGuard)
  listAllCategories() {
    return this.catalog.listCategories(true);
  }

  @Get('products')
  listProducts(
    @Query('q') q?: string,
    @Query('category_id') categoryId?: string,
    @Query('disponible') disponible?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.catalog.listProducts({
      q: q?.trim(),
      category_id: categoryId,
      disponible: parseBoolean(disponible, 'disponible'),
      page: parsePage(page, 1, 'page', 100000),
      page_size: parsePage(pageSize, 20, 'page_size', 100),
    });
  }

  @Get('admin/products')
  @UseGuards(CatalogAdminGuard)
  listAllProducts(
    @Query('q') q?: string,
    @Query('category_id') categoryId?: string,
    @Query('disponible') disponible?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.catalog.listProducts({
      q: q?.trim(),
      category_id: categoryId,
      disponible: parseBoolean(disponible, 'disponible'),
      page: parsePage(page, 1, 'page', 100000),
      page_size: parsePage(pageSize, 20, 'page_size', 100),
      incluir_inactivos: true,
    });
  }

  @Get('products/:id/availability-history')
  @UseGuards(CatalogAdminGuard)
  listAvailabilityChanges(@Param('id') id: string) {
    return this.catalog.listAvailabilityChanges(id);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.catalog.getProduct(id);
  }

  @Post('categories')
  @UseGuards(CatalogAdminGuard)
  createCategory(@Body() body: { nombre?: unknown; descripcion?: unknown }) {
    return this.catalog.createCategory(body);
  }

  @Patch('categories/:id')
  @UseGuards(CatalogAdminGuard)
  updateCategory(
    @Param('id') id: string,
    @Body() body: { nombre?: unknown; descripcion?: unknown; activo?: unknown },
  ) {
    return this.catalog.updateCategory(id, body ?? {});
  }

  @Post('products')
  @UseGuards(CatalogAdminGuard)
  createProduct(@Body() body: ProductInput) {
    return this.catalog.createProduct(body);
  }

  @Patch('products/:id/availability')
  @UseGuards(CatalogAdminGuard)
  setAvailability(
    @Param('id') id: string,
    @Body() body: { disponible?: unknown },
    @Req() request: CatalogAdminRequest,
  ) {
    return this.catalog.setAvailability(id, body?.disponible, request.user!.userId);
  }

  @Patch('products/:id')
  @UseGuards(CatalogAdminGuard)
  updateProduct(@Param('id') id: string, @Body() body: ProductInput) {
    return this.catalog.updateProduct(id, body ?? {});
  }
}
