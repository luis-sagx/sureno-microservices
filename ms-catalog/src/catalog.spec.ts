import { INestApplication } from '@nestjs/common';
import { spawn, spawnSync } from 'node:child_process';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';

describe('MS02 catalog API', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (createdProductIds.length > 0) {
      await dataSource.query('DELETE FROM product WHERE id = ANY($1::uuid[])', [createdProductIds]);
    }
    await app?.close();
    vi.unstubAllGlobals();
  });

  it('browses reference products by text and category without exposing prices', async () => {
    const categories = await request(app.getHttpServer())
      .get('/catalog/categories')
      .expect(200);
    const aguardientes = categories.body.find(
      (category: { nombre: string }) => category.nombre === 'Aguardientes',
    );

    const response = await request(app.getHttpServer())
      .get('/catalog/products')
      .query({ q: 'caña', category_id: aguardientes.id })
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.items.map((product: { nombre: string }) => product.nombre)).toEqual(
      expect.arrayContaining(['Caña Sureña', 'Media Caña Sureña']),
    );
    expect(response.body.items[0]).toHaveProperty('presentaciones');
    expect(JSON.stringify(response.body)).not.toMatch(/precio|price|discount/i);
  });

  it('requires an administrator role to manage products and records availability changes', async () => {
    await request(app.getHttpServer())
      .post('/catalog/products')
      .send({ nombre: 'Producto de prueba' })
      .expect(401);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        expect(new Headers(init?.headers).get('cookie')).toBe('sureno_session=admin-token');
        return Response.json({ userId: '00000000-0000-4000-8000-000000000001', roles: ['ADMIN'] });
      }),
    );

    const categories = await request(app.getHttpServer()).get('/catalog/categories').expect(200);
    const aguardientes = categories.body.find(
      (category: { nombre: string }) => category.nombre === 'Aguardientes',
    );
    const created = await request(app.getHttpServer())
      .post('/catalog/products')
      .set('Cookie', 'sureno_session=admin-token')
      .send({
        category_id: aguardientes.id,
        nombre: 'Producto temporal de prueba',
        descripcion: 'Producto usado para verificar el historial.',
        volumen_ml: 700,
        presentaciones: [
          { tipo: 'UNIDAD', unidades_por_presentacion: 1 },
          { tipo: 'CAJA', unidades_por_presentacion: 12 },
        ],
      })
      .expect(201);
    createdProductIds.push(created.body.id);

    await request(app.getHttpServer())
      .patch(`/catalog/products/${created.body.id}`)
      .set('Cookie', 'sureno_session=admin-token')
      .send({ descripcion: 'Descripción revisada por administración.' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.descripcion).toBe('Descripción revisada por administración.'),
      );

    await request(app.getHttpServer())
      .patch(`/catalog/products/${created.body.id}/availability`)
      .set('Cookie', 'sureno_session=admin-token')
      .send({ disponible: false })
      .expect(200)
      .expect(({ body }) => expect(body.disponible).toBe(false));

    const unavailable = await request(app.getHttpServer())
      .get('/catalog/products')
      .query({ disponible: 'false' })
      .expect(200);
    expect(unavailable.body.items.map((product: { id: string }) => product.id)).toContain(
      created.body.id,
    );

    const history = await request(app.getHttpServer())
      .get(`/catalog/products/${created.body.id}/availability-history`)
      .set('Cookie', 'sureno_session=admin-token')
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({
      estado_anterior: true,
      estado_nuevo: false,
      actor_user_id: '00000000-0000-4000-8000-000000000001',
    });

    await request(app.getHttpServer())
      .patch(`/catalog/products/${created.body.id}`)
      .set('Cookie', 'sureno_session=admin-token')
      .send({ activo: false })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/catalog/products/${created.body.id}`)
      .expect(404);
    const adminProducts = await request(app.getHttpServer())
      .get('/catalog/admin/products')
      .set('Cookie', 'sureno_session=admin-token')
      .expect(200);
    expect(adminProducts.body.items.map((product: { id: string }) => product.id)).toContain(
      created.body.id,
    );
  });

  it('denies catalog administration to a signed-in customer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          userId: '00000000-0000-4000-8000-000000000002',
          roles: ['CUSTOMER'],
        }),
      ),
    );
    await request(app.getHttpServer())
      .post('/catalog/categories')
      .set('Cookie', 'sureno_session=customer-token')
      .send({ nombre: 'No autorizada' })
      .expect(403);
  });

  it('starts the compiled service through native ESM entity loading', async () => {
    const build = spawnSync(process.execPath, ['node_modules/@nestjs/cli/bin/nest.js', 'build'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    });
    expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);

    const child = spawn(process.execPath, ['dist/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '39127' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Catalog service startup timed out.\n${output}`));
      }, 15000);
      const onData = (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes('Nest application successfully started')) {
          clearTimeout(timer);
          child.kill('SIGTERM');
          resolve();
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.once('exit', (code) => {
        if (code === null || output.includes('Nest application successfully started')) return;
        clearTimeout(timer);
        reject(new Error(`Catalog service exited with ${code}.\n${output}`));
      });
    });
  });
});
