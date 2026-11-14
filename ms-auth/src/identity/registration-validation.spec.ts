import { validateBusinessRequest } from './registration-validation.js';

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

describe('business registration validation', () => {
  it('reports invalid business input with a framework-independent domain error', () => {
    const input = {
      cedula: makeCedula(),
      nombres: 'Andrea',
      apellidos: 'Paredes',
      fecha_nacimiento: '1995-04-21',
      telefono: '0991234567',
      username: 'andrea-test',
      password: 'Seguro-Registro-2026!',
      ruc: '1791234567001',
      razon_social: 'Comercial de Prueba S.A.',
      nombre_comercial: 42,
      direccion_negocio: 'Quito, Ecuador',
    };

    let caught: unknown;
    try {
      validateBusinessRequest(input as never);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'IdentityValidationError',
      code: 'bad_request',
      message: 'El nombre comercial no es válido.',
    });
  });
});
