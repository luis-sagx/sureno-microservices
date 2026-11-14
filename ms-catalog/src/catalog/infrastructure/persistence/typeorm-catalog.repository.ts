import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { CatalogError } from '../../domain/catalog-error.js';
import type {
  AvailabilityChangeRecord,
  CatalogProductPage,
  CategoryFields,
  CategoryRecord,
  ProductQuery,
  ProductRecord,
  ProductUpdateInput,
  ProductWriteInput,
} from '../../domain/catalog-model.js';
import type { CatalogRepository } from '../../application/catalog.repository.js';
import { AvailabilityChange } from '../../entities/availability-change.entity.js';
import { Category } from '../../entities/category.entity.js';
import { Presentation } from '../../entities/presentation.entity.js';
import { Product } from '../../entities/product.entity.js';

@Injectable()
export class TypeOrmCatalogRepository implements CatalogRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listCategories(includeInactive: boolean): Promise<CategoryRecord[]> {
    const categories = await this.dataSource.getRepository(Category).find({
      where: includeInactive ? {} : { activo: true },
      order: { nombre: 'ASC' },
    });
    return categories.map((category) => this.categoryRecord(category));
  }

  async listProducts(query: ProductQuery): Promise<CatalogProductPage> {
    const builder = this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category');
    if (!query.incluir_inactivos) {
      builder.where('product.activo = true').andWhere('category.activo = true');
    }
    if (query.q) {
      builder.andWhere(
        '(product.nombre ILIKE :query OR COALESCE(product.descripcion, \'\') ILIKE :query)',
        { query: `%${query.q}%` },
      );
    }
    if (query.category_id) {
      builder.andWhere('product.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }
    if (query.disponible !== undefined) {
      builder.andWhere('product.disponible = :disponible', {
        disponible: query.disponible,
      });
    }

    const [products, total] = await builder
      .orderBy('product.nombre', 'ASC')
      .skip((query.page - 1) * query.page_size)
      .take(query.page_size)
      .getManyAndCount();
    const presentations = products.length
      ? await this.dataSource.getRepository(Presentation).find({
          where: { product_id: In(products.map((product) => product.id)), activo: true },
          order: { tipo: 'ASC' },
        })
      : [];
    const presentationsByProduct = new Map<string, Presentation[]>();
    for (const presentation of presentations) {
      const group = presentationsByProduct.get(presentation.product_id) ?? [];
      group.push(presentation);
      presentationsByProduct.set(presentation.product_id, group);
    }
    return {
      items: products.map((product) =>
        this.productRecord(product, presentationsByProduct.get(product.id) ?? []),
      ),
      total,
    };
  }

  async getProduct(id: string): Promise<ProductRecord | null> {
    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id, activo: true, category: { activo: true } },
      relations: { category: true, presentaciones: true },
      order: { presentaciones: { tipo: 'ASC' } },
    });
    return product ? this.productRecord(product) : null;
  }

  async createCategory(input: CategoryFields): Promise<CategoryRecord> {
    const repository = this.dataSource.getRepository(Category);
    try {
      const category = await repository.save(
        repository.create({
          id: randomUUID(),
          nombre: input.nombre!,
          descripcion: input.descripcion ?? null,
          activo: input.activo ?? true,
        }),
      );
      return this.categoryRecord(category);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new CatalogError('conflict', 'Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async updateCategory(id: string, input: CategoryFields): Promise<CategoryRecord | null> {
    const repository = this.dataSource.getRepository(Category);
    const category = await repository.findOneBy({ id });
    if (!category) return null;
    Object.assign(category, input);
    try {
      return this.categoryRecord(await repository.save(category));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new CatalogError('conflict', 'Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async createProduct(input: ProductWriteInput): Promise<ProductRecord> {
    await this.requireActiveCategory(input.category_id);
    return this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Product, {
        id: randomUUID(),
        category_id: input.category_id,
        ...input.fields,
      });
      await manager.save(Product, entity);
      await manager.save(
        Presentation,
        input.presentaciones.map((presentation) =>
          manager.create(Presentation, {
            id: randomUUID(),
            product_id: entity.id,
            ...presentation,
          }),
        ),
      );
      const product = await manager.findOneOrFail(Product, {
        where: { id: entity.id },
        relations: { category: true, presentaciones: true },
        order: { presentaciones: { tipo: 'ASC' } },
      });
      return this.productRecord(product);
    });
  }

  async updateProduct(id: string, input: ProductUpdateInput): Promise<ProductRecord | null> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const entity = await repository.findOne({
        where: { id },
        relations: { category: true, presentaciones: true },
      });
      if (!entity) return null;
      if (input.category_id !== undefined) {
        await this.requireActiveCategory(input.category_id, manager.getRepository(Category));
        entity.category_id = input.category_id;
      }
      Object.assign(entity, input.fields);
      await repository.save(entity);
      if (input.presentaciones !== undefined) {
        await manager.delete(Presentation, { product_id: id });
        await manager.save(
          Presentation,
          input.presentaciones.map((presentation) =>
            manager.create(Presentation, {
              id: randomUUID(),
              product_id: id,
              ...presentation,
            }),
          ),
        );
      }
      const product = await repository.findOneOrFail({
        where: { id },
        relations: { category: true, presentaciones: true },
        order: { presentaciones: { tipo: 'ASC' } },
      });
      return this.productRecord(product);
    });
  }

  async setAvailability(input: {
    productId: string;
    available: boolean;
    actorUserId: string;
  }): Promise<ProductRecord | null> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const product = await repository.findOne({
        where: { id: input.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) return null;
      if (product.disponible !== input.available) {
        const previous = product.disponible;
        product.disponible = input.available;
        await repository.save(product);
        await manager.save(
          AvailabilityChange,
          manager.create(AvailabilityChange, {
            id: randomUUID(),
            product_id: product.id,
            estado_anterior: previous,
            estado_nuevo: input.available,
            actor_user_id: input.actorUserId,
          }),
        );
      }
      const refreshed = await repository.findOneOrFail({
        where: { id: input.productId },
        relations: { category: true, presentaciones: true },
      });
      return this.productRecord(refreshed);
    });
  }

  async listAvailabilityChanges(productId: string): Promise<{
    exists: boolean;
    changes: AvailabilityChangeRecord[];
  }> {
    if (!(await this.dataSource.getRepository(Product).existsBy({ id: productId }))) {
      return { exists: false, changes: [] };
    }
    const changes = await this.dataSource.getRepository(AvailabilityChange).find({
      where: { product_id: productId },
      order: { cambiado_en: 'DESC' },
    });
    return {
      exists: true,
      changes: changes.map((change) => ({
        id: change.id,
        product_id: change.product_id,
        estado_anterior: change.estado_anterior,
        estado_nuevo: change.estado_nuevo,
        actor_user_id: change.actor_user_id,
        cambiado_en: change.cambiado_en,
      })),
    };
  }

  private async requireActiveCategory(value: string, repository = this.dataSource.getRepository(Category)) {
    const category = await repository.findOneBy({ id: value, activo: true });
    if (!category) {
      throw new CatalogError('bad_request', 'La categoría no existe o está inactiva.');
    }
    return category;
  }

  private categoryRecord(category: Category): CategoryRecord {
    return {
      id: category.id,
      nombre: category.nombre,
      descripcion: category.descripcion,
      activo: category.activo,
    };
  }

  private productRecord(
    product: Product,
    presentations = product.presentaciones ?? [],
  ): ProductRecord {
    return {
      id: product.id,
      category_id: product.category_id,
      category: product.category ? this.categoryRecord(product.category as Category) : null,
      nombre: product.nombre,
      descripcion: product.descripcion,
      volumen_ml: product.volumen_ml,
      disponible: product.disponible,
      activo: product.activo,
      presentaciones: presentations.map((presentation) => ({
        id: presentation.id,
        tipo: presentation.tipo,
        unidades_por_presentacion: presentation.unidades_por_presentacion,
        activo: presentation.activo,
      })),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}
