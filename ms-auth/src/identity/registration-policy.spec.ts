import {
  validateBusinessRequest,
  validateRegistration,
} from './domain/registration.js';

const validRegistration = () => ({
  cedula: '1710034065',
  nombres: 'María José',
  apellidos: 'Peña-López',
  fecha_nacimiento: '1990-05-20',
  telefono: '+593991234567',
  email_contacto: 'maria@example.ec',
  username: 'andrea_01',
  password: 'ClaveSegura1!x',
});

const validBusinessRegistration = () => ({
  ...validRegistration(),
  ruc: '1791234567001',
  razon_social: 'Comercial Sureño S.A.',
  nombre_comercial: null,
  direccion_negocio: 'Quito, Ecuador',
});

describe('MS01 registration policy', () => {
  it('validates Ecuadorian cédula check digit and accepts a natural-person RUC', () => {
    expect(validateRegistration(validRegistration()).cedula).toBe('1710034065');
    expect(
      validateRegistration({ ...validRegistration(), cedula: '1710034065001' }).cedula,
    ).toBe('1710034065001');
    expect(() =>
      validateRegistration({ ...validRegistration(), cedula: '1710034064' }),
    ).toThrow('cédula o RUC de persona natural no es válido.');
  });

  it.each([
    ['names shorter than two characters', { nombres: 'A' }],
    ['names longer than fifty characters', { nombres: 'A'.repeat(51) }],
    ['digits in names', { nombres: 'María2' }],
    ['symbols in surnames', { apellidos: 'Pérez@' }],
    ['invalid username characters', { username: 'user!name' }],
    ['username shorter than two characters', { username: 'a' }],
    ['username longer than thirty-two characters', { username: 'a'.repeat(33) }],
    ['phone spaces and punctuation', { telefono: '099-123-4567' }],
    ['phone plus not at the beginning', { telefono: '099+1234567' }],
    ['invalid email format', { email_contacto: 'correo-no-valido' }],
    ['birth date before 1900', { fecha_nacimiento: '1899-12-31' }],
    ['password without uppercase', { password: 'clavesegura1!xxx' }],
    ['password without a number', { password: 'ClaveSegura!!xx' }],
    ['password without a special character', { password: 'ClaveSegura12xx' }],
    ['password with only whitespace as special character', { password: 'ClaveSegura1 xx' }],
  ])('rejects %s', (_description, change) => {
    expect(() => validateRegistration({ ...validRegistration(), ...change })).toThrow();
  });

  it('accepts names with ñ, accents, spaces, apostrophes, and hyphens', () => {
    expect(
      validateRegistration({
        ...validRegistration(),
        nombres: 'José María',
        apellidos: "Peña d'Ávila",
        username: 'niño_01',
      }).nombres,
    ).toBe('José María');
  });

  it('accepts 1900-01-01 as the earliest possible adult birth date', () => {
    expect(
      validateRegistration({ ...validRegistration(), fecha_nacimiento: '1900-01-01' })
        .fecha_nacimiento,
    ).toBe('1900-01-01');
  });

  it('accepts the minimum two-character username', () => {
    expect(validateRegistration({ ...validRegistration(), username: 'ñ1' }).username)
      .toBe('ñ1');
  });

  it('accepts natural-person, private-company, and public-company RUC structures', () => {
    expect(validateBusinessRequest({ ...validBusinessRegistration(), ruc: '1710034065001' }).ruc)
      .toBe('1710034065001');
    expect(validateBusinessRequest({ ...validBusinessRegistration(), ruc: '1791234567001' }).ruc)
      .toBe('1791234567001');
    expect(validateBusinessRequest({ ...validBusinessRegistration(), ruc: '1760001550001' }).ruc)
      .toBe('1760001550001');
  });

  it.each(['0011234567001', '1771234567001', '1791234567000', '1710034065000'])
    ('rejects malformed Ecuadorian RUC %s', (ruc) => {
      expect(() => validateBusinessRequest({ ...validBusinessRegistration(), ruc })).toThrow(
        'El RUC debe tener 13 dígitos válidos.',
      );
    });
});
