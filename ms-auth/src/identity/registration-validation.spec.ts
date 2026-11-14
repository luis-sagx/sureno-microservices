import { validateBusinessRequest } from './registration-validation.js';

describe('business registration validation', () => {
  it('reports invalid business input with a framework-independent domain error', () => {
    const input = {
      ruc: 'invalid-ruc',
      nombres: 'Andrea',
      apellidos: 'Paredes',
      fecha_nacimiento: '1995-04-21',
      telefono: '0991234567',
      username: 'andrea-test',
      password: 'Seguro-Registro-2026!',
      razon_social: 'Comercial de Prueba S.A.',
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
      message: 'El RUC debe tener 13 dígitos válidos.',
    });
  });
});
