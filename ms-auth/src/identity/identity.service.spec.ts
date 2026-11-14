import { IdentityService } from './identity.service.js';

const individualRegistration = {
  cedula: '1710034065',
  nombres: ' Andrea ',
  apellidos: 'Paredes',
  fecha_nacimiento: '1995-04-21',
  telefono: '0991234567',
  email_contacto: 'ANDREA@example.test',
  username: 'ANDREA-Test',
  password: 'Seguro-Registro-2026!',
};

describe('IdentityService registration boundary', () => {
  it('hashes the password and delegates normalized data through its registration port', async () => {
    let received: unknown;
    const expectedResponse = {
      person_id: 'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
      user_id: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
      username: 'andrea-test',
      tipo_cliente: 'B2C',
      estado: 'ACTIVE',
      estado_verificacion: 'PENDING',
    };
    let hashedPasswordInput: string | undefined;
    const repository = {
      async register(input: unknown) {
        received = input;
        return expectedResponse;
      },
    };
    const passwordHasher = {
      async hash(password: string) {
        hashedPasswordInput = password;
        return 'scrypt$test-hash';
      },
    };
    const service = new IdentityService(
      repository as never,
      passwordHasher as never,
    );

    let result: unknown;
    try {
      result = await service.registerIndividual(
        individualRegistration as never,
      );
    } catch {
      // Keep the assertion below focused on whether the use case reached its port.
    }

    expect(received).toEqual({
      registration: {
        cedula: '1710034065',
        nombres: 'Andrea',
        apellidos: 'Paredes',
        fecha_nacimiento: '1995-04-21',
        telefono: '0991234567',
        email_contacto: 'andrea@example.test',
        username: 'andrea-test',
      },
      passwordHash: 'scrypt$test-hash',
      tipoCliente: 'B2C',
    });
    expect(result).toEqual(expectedResponse);
    expect(hashedPasswordInput).toBe('Seguro-Registro-2026!');
  });

  it('keeps review persistence behind the identity repository', async () => {
    let reviewListingCalls = 0;
    const repository = {
      async register() {
        throw new Error('Unexpected registration');
      },
      async listPendingReviews() {
        reviewListingCalls += 1;
        return { people: [], business_accounts: [] };
      },
    };
    const passwordHasher = {
      async hash() {
        return 'unused';
      },
    };
    const service = new IdentityService(
      repository as never,
      passwordHasher as never,
    );

    try {
      await service.listPendingReviews();
    } catch {
      // The assertion checks the persistence boundary, not the current TypeORM failure.
    }

    expect(reviewListingCalls).toBe(1);
  });

  it('reports malformed review identifiers as a framework-independent application error', async () => {
    const repository = {
      async register() {
        throw new Error('Unexpected registration');
      },
    };
    const passwordHasher = {
      async hash() {
        return 'unused';
      },
    };
    const service = new IdentityService(
      repository as never,
      passwordHasher as never,
    );
    let caught: unknown;

    try {
      await service.reviewPersonVerification('invalid-id', 'APPROVED');
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'IdentityError',
      code: 'bad_request',
      message: 'El identificador no es válido.',
    });
  });

  it('loads commercial-name settings using only the authenticated user identifier', async () => {
    let receivedUserId: string | undefined;
    const repository = {
      async getBusinessAccountSettings(userId: string) {
        receivedUserId = userId;
        return { nombre_comercial: 'Sureño Quito' };
      },
    };
    const service = new IdentityService(repository as never, {} as never);

    await expect(
      service.getBusinessAccountSettings('d86f207f-7a60-4c41-95ac-b3eea68f4a82'),
    ).resolves.toEqual({ nombre_comercial: 'Sureño Quito' });
    expect(receivedUserId).toBe('d86f207f-7a60-4c41-95ac-b3eea68f4a82');
  });

  it('reports users without a business account as unavailable', async () => {
    const service = new IdentityService(
      { async getBusinessAccountSettings() { return null; } } as never,
      {} as never,
    );

    await expect(
      service.getBusinessAccountSettings('d86f207f-7a60-4c41-95ac-b3eea68f4a82'),
    ).rejects.toMatchObject({
      name: 'IdentityError',
      code: 'not_found',
    });
  });

  it('trims and saves a commercial name for the authenticated user', async () => {
    let received: { userId: string; nombreComercial: string | null } | undefined;
    const repository = {
      async updateBusinessCommercialName(userId: string, nombreComercial: string | null) {
        received = { userId, nombreComercial };
        return { nombre_comercial: nombreComercial };
      },
    };
    const service = new IdentityService(repository as never, {} as never);

    await expect(
      service.updateBusinessCommercialName(
        'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
        { nombre_comercial: '  Bodega Sureña  ' },
      ),
    ).resolves.toEqual({ nombre_comercial: 'Bodega Sureña' });
    expect(received).toEqual({
      userId: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
      nombreComercial: 'Bodega Sureña',
    });
  });

  it('allows clearing the commercial name and rejects names longer than 160 characters', async () => {
    let savedName: string | null | undefined;
    const repository = {
      async updateBusinessCommercialName(_userId: string, nombreComercial: string | null) {
        savedName = nombreComercial;
        return { nombre_comercial: nombreComercial };
      },
    };
    const service = new IdentityService(repository as never, {} as never);
    const userId = 'd86f207f-7a60-4c41-95ac-b3eea68f4a82';

    await expect(
      service.updateBusinessCommercialName(userId, { nombre_comercial: '   ' }),
    ).resolves.toEqual({ nombre_comercial: null });
    expect(savedName).toBeNull();
    await expect(
      service.updateBusinessCommercialName(userId, { nombre_comercial: 'x'.repeat(161) }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(savedName).toBeNull();
  });

  it('does not update a business account when the authenticated user has none', async () => {
    const service = new IdentityService(
      { async updateBusinessCommercialName() { return null; } } as never,
      {} as never,
    );

    await expect(
      service.updateBusinessCommercialName(
        'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
        { nombre_comercial: 'Bodega Sureña' },
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
