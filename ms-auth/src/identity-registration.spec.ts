import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';

const makeCedula = () => {
  const firstNine = `171${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')}`;
  const sum = firstNine.split('').reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (value > 9 ? value - 9 : value);
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${firstNine}${checkDigit}`;
};

const makeRuc = () =>
  `179${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, '0')}001`;

describe('Identity registration API', () => {
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

  it('registers an adult individual with identity verification pending and no password leak', async () => {
    const password = 'Seguro-Registro-2026!';
    const cedula = makeCedula();
    const response = await request(app.getHttpServer())
      .post('/identity/individuals')
      .send({
        cedula,
        nombres: 'Andrea',
        apellidos: 'Paredes',
        fecha_nacimiento: '1995-04-21',
        telefono: '0991234567',
        email_contacto: 'andrea@example.test',
        username: `andrea-${Date.now()}`,
        password,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      tipo_cliente: 'B2C',
      estado: 'ACTIVE',
      estado_verificacion: 'PENDING',
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain('password_hash');

    const [storedUser] = await dataSource.query(
      `SELECT app_user.password_hash
       FROM app_user
       JOIN person ON person.id = app_user.person_id
       WHERE person.cedula = $1`,
      [cedula],
    );
    expect(storedUser.password_hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(storedUser.password_hash).not.toBe(password);
  });

  it('rejects an underage applicant', async () => {
    await request(app.getHttpServer())
      .post('/identity/individuals')
      .send({
        cedula: makeCedula(),
        nombres: 'Menor',
        apellidos: 'Ejemplo',
        fecha_nacimiento: new Date(Date.now() - 17 * 365.25 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        telefono: '0991234567',
        username: `menor-${Date.now()}`,
        password: 'Seguro-Registro-2026!',
      })
      .expect(400);
  });

  it('creates a business-account request with manual review pending', async () => {
    const response = await request(app.getHttpServer())
      .post('/identity/business-requests')
      .send({
        cedula: makeCedula(),
        nombres: 'Jorge',
        apellidos: 'Quishpe',
        fecha_nacimiento: '1990-09-17',
        telefono: '0981234567',
        email_contacto: 'jorge@example.test',
        username: `jorge-${Date.now()}`,
        password: 'Seguro-Registro-2026!',
        ruc: makeRuc(),
        razon_social: 'Comercial de Prueba S.A.',
        nombre_comercial: 'Comercial Prueba',
        direccion_negocio: 'Quito, Ecuador',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      tipo_cliente: 'B2B',
      estado: 'ACTIVE',
      estado_verificacion: 'PENDING',
      estado_solicitud: 'PENDING',
    });
  });

  it('rejects a duplicate cedula', async () => {
    const cedula = makeCedula();
    const payload = {
      cedula,
      nombres: 'Andrea',
      apellidos: 'Paredes',
      fecha_nacimiento: '1995-04-21',
      telefono: '0991234567',
      username: `duplicate-${Date.now()}`,
      password: 'Seguro-Registro-2026!',
    };

    await request(app.getHttpServer())
      .post('/identity/individuals')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/identity/individuals')
      .send({ ...payload, username: `${payload.username}-again` })
      .expect(409);
  });
});
