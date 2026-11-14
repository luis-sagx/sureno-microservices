import { CatalogService } from './catalog.service.js';
import { CatalogAdminGuard } from '../auth/catalog-admin.guard.js';

describe('CatalogService application boundary', () => {
  it('returns categories provided by the catalog repository port', async () => {
    const categories = [
      { id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63', nombre: 'Aguardientes', descripcion: null, activo: true },
    ];
    const repository = {
      async listCategories() {
        return categories;
      },
    };
    const catalog = new CatalogService(repository as never);

    let result: unknown;
    try {
      result = await catalog.listCategories();
    } catch {
      // Keep the assertion on the application result, not the old DataSource failure.
    }

    expect(result).toEqual(categories);
  });

  it('delegates product filters and pagination to the catalog repository', async () => {
    const expectedPage = { items: [], total: 0, page: 2, page_size: 10 };
    let receivedQuery: unknown;
    const repository = {
      async listProducts(query: unknown) {
        receivedQuery = query;
        return expectedPage;
      },
    };
    const catalog = new CatalogService(repository as never);
    const query = {
      q: 'caña',
      category_id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63',
      disponible: false,
      page: 2,
      page_size: 10,
    };

    let result: unknown;
    try {
      result = await catalog.listProducts(query);
    } catch {
      // Keep this assertion focused on the application result and port input.
    }

    expect(receivedQuery).toEqual(query);
    expect(result).toEqual(expectedPage);
  });

  it('normalizes category input before creating it through the repository', async () => {
    const category = {
      id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63',
      nombre: 'Licores',
      descripcion: null,
      activo: true,
    };
    let receivedInput: unknown;
    const repository = {
      async createCategory(input: unknown) {
        receivedInput = input;
        return category;
      },
    };
    const catalog = new CatalogService(repository as never);

    let result: unknown;
    try {
      result = await catalog.createCategory({ nombre: ' Licores ', descripcion: '' });
    } catch {
      // Keep this assertion focused on the normalized application input.
    }

    expect(receivedInput).toEqual({ nombre: 'Licores', descripcion: null, activo: true });
    expect(result).toEqual(category);
  });

  it('validates product input and persists normalized presentations', async () => {
    const categoryId = '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63';
    const product = {
      id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a64',
      category_id: categoryId,
      category: { id: categoryId, nombre: 'Licores', descripcion: null, activo: true },
      nombre: 'Ron Sureño',
      descripcion: null,
      volumen_ml: 700,
      disponible: true,
      activo: true,
      presentaciones: [],
    };
    let receivedInput: unknown;
    const repository = {
      async createProduct(input: unknown) {
        receivedInput = input;
        return product;
      },
    };
    const catalog = new CatalogService(repository as never);

    let result: unknown;
    try {
      result = await catalog.createProduct({
        category_id: categoryId,
        nombre: ' Ron Sureño ',
        descripcion: '',
        volumen_ml: 700,
        presentaciones: [{ tipo: 'UNIDAD', unidades_por_presentacion: 1 }],
      });
    } catch {
      // Keep this assertion focused on normalized data crossing the port.
    }

    expect(receivedInput).toEqual({
      category_id: categoryId,
      fields: {
        nombre: 'Ron Sureño',
        descripcion: null,
        volumen_ml: 700,
        disponible: true,
        activo: true,
      },
      presentaciones: [{ tipo: 'UNIDAD', unidades_por_presentacion: 1, activo: true }],
    });
    expect(result).toEqual({
      id: product.id,
      category_id: product.category_id,
      categoria: product.category,
      nombre: product.nombre,
      descripcion: product.descripcion,
      volumen_ml: product.volumen_ml,
      disponible: product.disponible,
      activo: product.activo,
      presentaciones: [],
    });
  });

  it('delegates availability changes with the authenticated actor', async () => {
    const product = {
      id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63',
      category_id: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a62',
      category: null,
      nombre: 'Producto prueba',
      descripcion: null,
      volumen_ml: null,
      disponible: false,
      activo: true,
      presentaciones: [],
    };
    let received: unknown;
    const repository = {
      async setAvailability(input: unknown) {
        received = input;
        return product;
      },
    };
    const catalog = new CatalogService(repository as never);

    let result: unknown;
    try {
      result = await catalog.setAvailability(
        product.id,
        false,
        '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a64',
      );
    } catch {
      // Keep this assertion focused on the audit input crossing the port.
    }

    expect(received).toEqual({ productId: product.id, available: false, actorUserId: '0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a64' });
    expect(result).toMatchObject({ id: product.id, disponible: false, presentaciones: [] });
  });

  it('rejects direct availability changes so they cannot bypass history', async () => {
    const repository = { async updateProduct() { throw new Error('Unexpected persistence'); } };
    const catalog = new CatalogService(repository as never);
    let caught: unknown;

    try {
      await catalog.updateProduct('0d0a8c5a-1b7a-4b83-bba0-ef14df1a6a63', { disponible: false });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'CatalogError',
      code: 'bad_request',
      message: 'Cambia la disponibilidad en la ruta de disponibilidad para conservar su historial.',
    });
  });

  it('reports malformed product identifiers as a framework-independent error', async () => {
    const catalog = new CatalogService({} as never);
    let caught: unknown;

    try {
      await catalog.getProduct('invalid-id');
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'CatalogError',
      code: 'bad_request',
      message: 'productId no es un UUID válido.',
    });
  });

  it('maps identity-port authorization failures to HTTP unauthorized', async () => {
    const request = { headers: { cookie: 'sureno_session=bad-token' }, user: undefined };
    const response = { setHeader: vi.fn() };
    const context = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    };
    const authPort = {
      async requireAdmin() {
        throw { code: 'unauthorized', message: 'La sesión no es válida o ha expirado.' };
      },
    };
    const guard = new CatalogAdminGuard(authPort as never);
    let caught: unknown;

    try {
      await guard.canActivate(context as never);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ status: 401 });
  });
});
