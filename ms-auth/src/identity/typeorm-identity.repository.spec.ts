import { describe, expect, it, vi } from 'vitest';
import { TypeOrmIdentityRepository } from './infrastructure/persistence/typeorm-identity.repository.js';
import { BusinessAccount } from './entities/business-account.entity.js';
import { Role } from './entities/role.entity.js';

describe('TypeOrmIdentityRepository business profile ownership', () => {
  const userId = 'd86f207f-7a60-4c41-95ac-b3eea68f4a82';

  it('loads commercial name only by the authenticated owner user id', async () => {
    const query = vi.fn().mockResolvedValue([{ nombre_comercial: 'Sureño Quito' }]);
    const repository = new TypeOrmIdentityRepository({ query } as never);

    await expect(repository.getBusinessAccountSettings(userId)).resolves.toEqual({
      nombre_comercial: 'Sureño Quito',
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), [userId]);
  });

  it('returns no business profile for a user id that owns no business account', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new TypeOrmIdentityRepository({ query } as never);

    await expect(repository.getBusinessAccountSettings(userId)).resolves.toBeNull();
  });

  it('updates commercial name only for the authenticated owner user id and supports null', async () => {
    const query = vi.fn().mockResolvedValue([{ nombre_comercial: null }]);
    const repository = new TypeOrmIdentityRepository({ query } as never);

    await expect(repository.updateBusinessCommercialName(userId, null)).resolves.toEqual({
      nombre_comercial: null,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [userId, null],
    );
  });

  it('persists null when a B2B registration omits the commercial name', async () => {
    let savedBusiness: Partial<BusinessAccount> | undefined;
    const manager = {
      async findOneBy(entity: unknown) {
        if (entity === Role) return { id: 'role-id' };
        return null;
      },
      create(_entity: unknown, values: object) { return values; },
      async save(entity: unknown, value: Partial<BusinessAccount>) {
        if (entity === BusinessAccount) savedBusiness = value;
        return value;
      },
      async query() { return []; },
    };
    const repository = new TypeOrmIdentityRepository({
      transaction: (work: (transactionManager: typeof manager) => unknown) => work(manager),
    } as never);

    await repository.register({
      registration: {
        cedula: '1791234567001',
        ruc: '1791234567001',
        nombres: 'Andrea',
        apellidos: 'Paredes',
        fecha_nacimiento: '1995-04-21',
        telefono: '0991234567',
        email_contacto: null,
        username: 'andrea',
        razon_social: 'Comercial Sureño',
        direccion_negocio: 'Quito',
      },
      passwordHash: 'scrypt$test-hash',
      tipoCliente: 'B2B',
    });

    expect(savedBusiness?.nombre_comercial).toBeNull();
  });
});
