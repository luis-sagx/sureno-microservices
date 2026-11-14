import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AvailabilityChange } from './entities/availability-change.entity.js';
import { Category } from './entities/category.entity.js';
import { Presentation } from './entities/presentation.entity.js';
import { Product } from './entities/product.entity.js';

export interface PresentationInput {
  tipo?: unknown;
  unidades_por_presentacion?: unknown;
  activo?: unknown;
}

export interface ProductInput {
  category_id?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  volumen_ml?: unknown;
  disponible?: unknown;
  activo?: unknown;
  presentaciones?: unknown;
}

export interface ProductQuery {
  q?: string;
  category_id?: string;
  disponible?: boolean;
  page: number;
  page_size: number;
  incluir_inactivos?: boolean;
}

@Injectable()
export class CatalogService {
  constructor(private readonly dataSource: DataSource) {}

  async listCategories(incluirInactivas = false) {
    const categories = await this.dataSource.getRepository(Category).find({
      where: incluirInactivas ? {} : { activo: true },
      order: { nombre: 'ASC' },
    });
    return categories.map((category) => this.categoryResponse(category));
  }

  async listProducts(query: ProductQuery) {
    if (query.category_id) this.validateUuid(query.category_id, 'category_id');
    if ((query.q?.length ?? 0) > 120) {
      throw new BadRequestException('q admite hasta 120 caracteres.');
    }
    const builder = this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.presentaciones', 'presentation');
    builder.where('(presentation.activo = true OR presentation.id IS NULL)');
    if (!query.incluir_inactivos) {
      builder.andWhere('product.activo = true').andWhere('category.activo = true');
    }

    if (query.q) {
      builder.andWhere(
        '(product.nombre ILIKE :query OR COALESCE(product.descripcion, \'\') ILIKE :query)',
        { query: `%${query.q}%` },
      );
    }
    if (query.category_id) builder.andWhere('product.category_id = :categoryId', { categoryId: query.category_id });
    if (query.disponible !== undefined) {
      builder.andWhere('product.disponible = :disponible', { disponible: query.disponible });
    }

    const [products, total] = await builder
      .orderBy('product.nombre', 'ASC')
      .addOrderBy('presentation.tipo', 'ASC')
      .skip((query.page - 1) * query.page_size)
      .take(query.page_size)
      .getManyAndCount();

    return {
      items: products.map((product) => this.productResponse(product)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getProduct(id: string) {
    this.validateUuid(id, 'productId');
    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id, activo: true, category: { activo: true } },
      relations: { category: true, presentaciones: true },
      order: { presentaciones: { tipo: 'ASC' } },
    });
    if (!product) throw new NotFoundException('No se encontró el producto.');
    return this.productResponse(product);
  }

  async createCategory(input: { nombre?: unknown; descripcion?: unknown }) {
    const nombre = this.requiredText(input?.nombre, 'nombre', 100);
    const descripcion = this.optionalText(input?.descripcion, 'descripcion');
    const repository = this.dataSource.getRepository(Category);
    try {
      const category = await repository.save(
        repository.create({ id: randomUUID(), nombre, descripcion, activo: true }),
      );
      return this.categoryResponse(category);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async updateCategory(id: string, input: { nombre?: unknown; descripcion?: unknown; activo?: unknown }) {
    this.validateUuid(id, 'categoryId');
    const repository = this.dataSource.getRepository(Category);
    const category = await repository.findOneBy({ id });
    if (!category) throw new NotFoundException('No se encontró la categoría.');
    if (input.nombre !== undefined) category.nombre = this.requiredText(input.nombre, 'nombre', 100);
    if (input.descripcion !== undefined) category.descripcion = this.optionalText(input.descripcion, 'descripcion');
    if (input.activo !== undefined) category.activo = this.booleanValue(input.activo, 'activo');
    try {
      return this.categoryResponse(await repository.save(category));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async createProduct(input: ProductInput) {
    const category = await this.requireActiveCategory(input?.category_id);
    const productData = this.productFields(input);
    const presentations = this.presentationInputs(input.presentaciones, true);
    const product = await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Product, {
        id: randomUUID(),
        category_id: category.id,
        ...productData,
      });
      await manager.save(Product, entity);
      await manager.save(
        Presentation,
        presentations.map((presentation) =>
          manager.create(Presentation, {
            id: randomUUID(),
            product_id: entity.id,
            ...presentation,
          }),
        ),
      );
      return manager.findOneOrFail(Product, {
        where: { id: entity.id },
        relations: { category: true, presentaciones: true },
        order: { presentaciones: { tipo: 'ASC' } },
      });
    });
    return this.productResponse(product);
  }

  async updateProduct(id: string, input: ProductInput) {
    this.validateUuid(id, 'productId');
    if (input.disponible !== undefined) {
      throw new BadRequestException('Cambia la disponibilidad en la ruta de disponibilidad para conservar su historial.');
    }
    const product = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const entity = await repository.findOne({
        where: { id },
        relations: { category: true, presentaciones: true },
      });
      if (!entity) throw new NotFoundException('No se encontró el producto.');
      if (input.category_id !== undefined) {
        const category = await this.requireActiveCategory(input.category_id, manager.getRepository(Category));
        entity.category_id = category.id;
      }
      Object.assign(entity, this.productFields(input, true));
      await repository.save(entity);
      if (input.presentaciones !== undefined) {
        const presentations = this.presentationInputs(input.presentaciones, true);
        await manager.delete(Presentation, { product_id: id });
        await manager.save(
          Presentation,
          presentations.map((presentation) =>
            manager.create(Presentation, {
              id: randomUUID(),
              product_id: id,
              ...presentation,
            }),
          ),
        );
      }
      return repository.findOneOrFail({
        where: { id },
        relations: { category: true, presentaciones: true },
        order: { presentaciones: { tipo: 'ASC' } },
      });
    });
    return this.productResponse(product);
  }

  async setAvailability(productId: string, availableValue: unknown, actorUserId: string) {
    this.validateUuid(productId, 'productId');
    this.validateUuid(actorUserId, 'actorUserId');
    const disponible = this.booleanValue(availableValue, 'disponible');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const product = await repository.findOne({
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('No se encontró el producto.');
      if (product.disponible !== disponible) {
        const previous = product.disponible;
        product.disponible = disponible;
        await repository.save(product);
        await manager.save(
          AvailabilityChange,
          manager.create(AvailabilityChange, {
            id: randomUUID(),
            product_id: product.id,
            estado_anterior: previous,
            estado_nuevo: disponible,
            actor_user_id: actorUserId,
          }),
        );
      }
      const refreshed = await repository.findOneOrFail({
        where: { id: productId },
        relations: { category: true, presentaciones: true },
      });
      return this.productResponse(refreshed);
    });
  }

  async listAvailabilityChanges(productId: string) {
    this.validateUuid(productId, 'productId');
    if (!(await this.dataSource.getRepository(Product).existsBy({ id: productId }))) {
      throw new NotFoundException('No se encontró el producto.');
    }
    const changes = await this.dataSource.getRepository(AvailabilityChange).find({
      where: { product_id: productId },
      order: { cambiado_en: 'DESC' },
    });
    return changes.map((change) => ({
      id: change.id,
      product_id: change.product_id,
      estado_anterior: change.estado_anterior,
      estado_nuevo: change.estado_nuevo,
      actor_user_id: change.actor_user_id,
      cambiado_en: change.cambiado_en,
    }));
  }

  private async requireActiveCategory(
    value: unknown,
    repository = this.dataSource.getRepository(Category),
  ) {
    if (typeof value !== 'string') throw new BadRequestException('category_id es obligatorio.');
    this.validateUuid(value, 'category_id');
    const category = await repository.findOneBy({ id: value, activo: true });
    if (!category) throw new BadRequestException('La categoría no existe o está inactiva.');
    return category;
  }

  private productFields(input: ProductInput, partial = false) {
    const result: Partial<Product> = {};
    if (!partial || input.nombre !== undefined) {
      result.nombre = this.requiredText(input.nombre, 'nombre', 160);
    }
    if (!partial || input.descripcion !== undefined) {
      result.descripcion = this.optionalText(input.descripcion, 'descripcion');
    }
    if (!partial || input.volumen_ml !== undefined) {
      result.volumen_ml = this.positiveIntegerOrNull(input.volumen_ml, 'volumen_ml');
    }
    if (!partial || input.disponible !== undefined) {
      result.disponible = this.booleanValue(input.disponible ?? true, 'disponible');
    }
    if (!partial || input.activo !== undefined) {
      result.activo = this.booleanValue(input.activo ?? true, 'activo');
    }
    return result;
  }

  private presentationInputs(
    value: unknown,
    required: boolean,
  ): Array<Pick<Presentation, 'tipo' | 'unidades_por_presentacion' | 'activo'>> {
    if (!Array.isArray(value)) {
      if (required) throw new BadRequestException('presentaciones debe ser una lista.');
      return [];
    }
    if (value.length === 0) throw new BadRequestException('Agrega al menos una presentación activa.');
    const types = new Set<string>();
    return value.map((item: PresentationInput) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('Cada presentación debe ser un objeto.');
      }
      const tipo = item.tipo;
      if (tipo !== 'UNIDAD' && tipo !== 'CAJA') {
        throw new BadRequestException('tipo debe ser UNIDAD o CAJA.');
      }
      if (types.has(tipo)) throw new BadRequestException('No repitas tipos de presentación.');
      types.add(tipo);
      const units = this.positiveInteger(item.unidades_por_presentacion, 'unidades_por_presentacion');
      if (tipo === 'UNIDAD' && units !== 1) {
        throw new BadRequestException('La presentación UNIDAD debe contener una unidad.');
      }
      return {
        tipo,
        unidades_por_presentacion: units,
        activo: item.activo === undefined ? true : this.booleanValue(item.activo, 'activo'),
      };
    });
  }

  private categoryResponse(category: Category) {
    return {
      id: category.id,
      nombre: category.nombre,
      descripcion: category.descripcion,
      activo: category.activo,
    };
  }

  private productResponse(product: Product) {
    return {
      id: product.id,
      category_id: product.category_id,
      categoria: product.category ? this.categoryResponse(product.category) : undefined,
      nombre: product.nombre,
      descripcion: product.descripcion,
      volumen_ml: product.volumen_ml,
      disponible: product.disponible,
      activo: product.activo,
      presentaciones: (product.presentaciones ?? [])
        .filter((presentation) => presentation.activo)
        .sort((a, b) => a.tipo.localeCompare(b.tipo))
        .map((presentation) => ({
          id: presentation.id,
          tipo: presentation.tipo,
          unidades_por_presentacion: presentation.unidades_por_presentacion,
          activo: presentation.activo,
        })),
    };
  }

  private requiredText(value: unknown, field: string, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
      throw new BadRequestException(`${field} es obligatorio y admite hasta ${max} caracteres.`);
    }
    return value.trim();
  }

  private optionalText(value: unknown, field: string) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || value.length > 5000) {
      throw new BadRequestException(`${field} debe ser texto de hasta 5000 caracteres.`);
    }
    return value.trim() || null;
  }

  private positiveInteger(value: unknown, field: string) {
    if (!Number.isInteger(value) || (value as number) < 1) {
      throw new BadRequestException(`${field} debe ser un entero positivo.`);
    }
    return value as number;
  }

  private positiveIntegerOrNull(value: unknown, field: string) {
    if (value === null || value === undefined || value === '') return null;
    return this.positiveInteger(value, field);
  }

  private booleanValue(value: unknown, field: string) {
    if (typeof value !== 'boolean') throw new BadRequestException(`${field} debe ser booleano.`);
    return value;
  }

  private validateUuid(value: string, field: string) {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new BadRequestException(`${field} no es un UUID válido.`);
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'driverError' in error &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}
