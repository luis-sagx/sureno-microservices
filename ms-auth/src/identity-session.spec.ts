import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';

const password = 'Sesion-Segura-2026!';

const makeCedula = () => {
  const firstNine = `171${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')}`;
  const sum = firstNine.split('').reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (value > 9 ? value - 9 : value);
  }, 0);
  return `${firstNine}${(10 - (sum % 10)) % 10}`;
};

const makeUserPayload = () => ({
  cedula: makeCedula(),
  nombres: 'Usuario',
  apellidos: 'Prueba',
  fecha_nacimiento: '1992-06-10',
  telefono: '0991234567',
  username: `test-${randomUUID().slice(0, 8)}`,
  password,
});

describe('MS01 sessions and manual review API', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerCustomer() {
    const payload = makeUserPayload();
    const response = await request(app.getHttpServer())
      .post('/identity/individuals')
      .send(payload)
      .expect(201);
    return { payload, response: response.body };
  }

  async function registerBusiness() {
    const payload = {
      ...makeUserPayload(),
      ruc: `179${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, '0')}001`,
      razon_social: 'Distribuidora de Prueba S.A.',
      nombre_comercial: 'Distribuidora Prueba',
      direccion_negocio: 'Quito, Ecuador',
    };
    const response = await request(app.getHttpServer())
      .post('/identity/business-requests')
      .send(payload)
      .expect(201);
    return { payload, response: response.body };
  }

  function login(username: string, loginPassword = password) {
    return request(app.getHttpServer())
      .post('/sessions')
      .send({ username, password: loginPassword });
  }

  async function createAdmin() {
    const { payload, response } = await registerCustomer();
    const [role] = await dataSource.query(
      `INSERT INTO role (id, codigo, nombre, descripcion)
       VALUES ($1, 'ADMIN', 'Administrador', 'Acceso administrativo')
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [randomUUID()],
    );
    await dataSource.query(
      `INSERT INTO user_role (user_id, role_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [response.user_id, role.id],
    );
    return { payload, response };
  }

  it('starts a customer session with a signed HttpOnly cookie and 30-minute idle timeout', async () => {
    const { payload } = await registerCustomer();
    const response = await login(payload.username).expect(201);
    const setCookie = (response.headers['set-cookie'] as string[])[0];

    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=1800');
    expect(setCookie).not.toContain('Secure');
    expect(response.body).toMatchObject({
      username: payload.username,
      roles: ['CUSTOMER'],
      estado_verificacion: 'PENDING',
    });
    expect(response.body.session_token).toBeUndefined();
  });

  it('rejects invalid credentials without distinguishing username from password', async () => {
    const { payload } = await registerCustomer();
    const response = await login(payload.username, 'Contraseña-incorrecta!').expect(401);
    expect(response.body.message).toBe('Usuario o contraseña incorrectos.');
  });

  it('revokes a session at logout and rejects the logged-out cookie', async () => {
    const { payload } = await registerCustomer();
    const loginResponse = await login(payload.username).expect(201);
    const setCookie = (loginResponse.headers['set-cookie'] as string[])[0];
    const cookie = setCookie.split(';')[0];

    await request(app.getHttpServer())
      .get('/sessions/me')
      .set('Cookie', cookie)
      .expect(200);
    const logoutResponse = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect((logoutResponse.headers['set-cookie'] as string[])[0]).toContain('Max-Age=0');
    await request(app.getHttpServer())
      .get('/sessions/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('rejects tampered and expired signed sessions', async () => {
    const { payload } = await registerCustomer();
    const loginResponse = await login(payload.username).expect(201);
    const cookie = (loginResponse.headers['set-cookie'] as string[])[0].split(';')[0];
    const token = decodeURIComponent(cookie.slice('sureno_session='.length));
    const tampered = `sureno_session=${token.slice(0, -1)}x`;

    await request(app.getHttpServer())
      .get('/sessions/me')
      .set('Cookie', tampered)
      .expect(401);

    const encodedPayload = token.split('.')[0];
    const { sid } = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    await dataSource.query(
      `UPDATE auth_session SET expira_en = NOW() - INTERVAL '1 second' WHERE id = $1`,
      [sid],
    );
    await request(app.getHttpServer())
      .get('/sessions/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('uses a 15-minute timeout for admins and blocks customer access to admin routes', async () => {
    const { payload: customer } = await registerCustomer();
    const customerResponse = await login(customer.username).expect(201);
    const customerCookie = (customerResponse.headers['set-cookie'] as string[])[0].split(';')[0];
    await request(app.getHttpServer())
      .get('/identity/admin/pending-reviews')
      .set('Cookie', customerCookie)
      .expect(403);

    const { payload: admin } = await createAdmin();
    const adminResponse = await login(admin.username).expect(201);
    expect((adminResponse.headers['set-cookie'] as string[])[0]).toContain('Max-Age=900');
    await request(app.getHttpServer())
      .get('/identity/admin/pending-reviews')
      .set('Cookie', (adminResponse.headers['set-cookie'] as string[])[0].split(';')[0])
      .expect(200);
  });

  it('lets an admin verify identity and approve a business request with recorded reviewer', async () => {
    const { response: business } = await registerBusiness();
    const { payload: adminPayload } = await createAdmin();
    const adminResponse = await login(adminPayload.username).expect(201);
    const cookie = (adminResponse.headers['set-cookie'] as string[])[0].split(';')[0];

    const pending = await request(app.getHttpServer())
      .get('/identity/admin/pending-reviews')
      .set('Cookie', cookie)
      .expect(200);
    expect(pending.body.business_accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ business_account_id: business.business_account_id }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/identity/admin/people/${business.person_id}/verification`)
      .set('Cookie', cookie)
      .send({ decision: 'APPROVED' })
      .expect(200)
      .expect(({ body }) => expect(body.estado_verificacion).toBe('APPROVED'));

    await request(app.getHttpServer())
      .patch(`/identity/admin/business-accounts/${business.business_account_id}/review`)
      .set('Cookie', cookie)
      .send({ decision: 'APPROVED' })
      .expect(200)
      .expect(({ body }) => expect(body.estado_solicitud).toBe('APPROVED'));

    const [reviewed] = await dataSource.query(
      `SELECT estado_solicitud, revisado_por_user_id
       FROM business_account WHERE id = $1`,
      [business.business_account_id],
    );
    expect(reviewed.estado_solicitud).toBe('APPROVED');
    expect(reviewed.revisado_por_user_id).toBe(adminResponse.body.user_id);
    const businessRoles = await dataSource.query(
      `SELECT role.codigo FROM user_role
       JOIN role ON role.id = user_role.role_id WHERE user_role.user_id = $1 ORDER BY role.codigo`,
      [business.user_id],
    );
    expect(businessRoles.map(({ codigo }: { codigo: string }) => codigo)).toEqual([
      'CUSTOMER',
      'CUSTOMER_B2B',
    ]);
  });
});
