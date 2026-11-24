import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { IdentityError } from '../../domain/identity-error.js';
import type { BusinessRegistrationInput } from '../../domain/registration.js';
import type {
  IdentityRegistration,
  IdentityRepository,
  BusinessAccountSettings,
  PendingReviews,
  PersonReviewResult,
  RegistrationResponse,
  ReviewDecision,
} from '../../application/identity.repository.js';
import { AppUser } from '../../entities/app-user.entity.js';
import { BusinessAccount } from '../../entities/business-account.entity.js';
import { Person } from '../../entities/person.entity.js';
import { Role } from '../../entities/role.entity.js';
import { UserRole } from '../../entities/user-role.entity.js';

@Injectable()
export class TypeOrmIdentityRepository implements IdentityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async register(input: IdentityRegistration): Promise<RegistrationResponse> {
    const registration = input.registration;
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (await manager.findOneBy(Person, { cedula: registration.cedula })) {
          throw new IdentityError('conflict', 'La cédula ya está registrada.');
        }
        if (
          await manager.findOneBy(AppUser, { username: registration.username })
        ) {
          throw new IdentityError(
            'conflict',
            'El nombre de usuario ya está registrado.',
          );
        }
        if (
          input.tipoCliente === 'B2B' &&
          'ruc' in registration &&
          (await manager.findOneBy(BusinessAccount, { ruc: registration.ruc }))
        ) {
          throw new IdentityError(
            'conflict',
            'El RUC ya tiene una solicitud registrada.',
          );
        }

        const personId = randomUUID();
        const userId = randomUUID();
        const person = manager.create(Person, {
          id: personId,
          cedula: registration.cedula,
          nombres: registration.nombres,
          apellidos: registration.apellidos,
          fecha_nacimiento: registration.fecha_nacimiento,
          telefono: registration.telefono,
          email_contacto: registration.email_contacto,
          estado_verificacion: 'PENDING',
          fecha_verificacion: null,
        });
        await manager.save(Person, person);

        const user = manager.create(AppUser, {
          id: userId,
          person_id: personId,
          username: registration.username,
          password_hash: input.passwordHash,
          estado: 'ACTIVE',
        });
        await manager.save(AppUser, user);

        const customerRole = await manager.findOneBy(Role, {
          codigo: 'CUSTOMER',
        });
        if (!customerRole) {
          throw new IdentityError(
            'internal',
            'No están configurados los roles de MS01.',
          );
        }
        await manager.save(
          UserRole,
          manager.create(UserRole, {
            user_id: userId,
            role_id: customerRole.id,
          }),
        );

        let businessAccountId: string | undefined;
        if (input.tipoCliente === 'B2B') {
          if (!isBusinessRegistration(registration)) {
            throw new IdentityError(
              'internal',
              'La solicitud comercial está incompleta.',
            );
          }
          businessAccountId = randomUUID();
          const businessAccount = manager.create(BusinessAccount, {
            id: businessAccountId,
            user_id: userId,
            ruc: registration.ruc,
            razon_social: registration.razon_social,
            nombre_comercial: null,
            direccion_negocio: registration.direccion_negocio,
            estado_solicitud: 'PENDING',
            revisado_por_user_id: null,
            revisado_en: null,
            motivo_rechazo: null,
          });
          await manager.save(BusinessAccount, businessAccount);
        }

        return {
          person_id: personId,
          user_id: userId,
          username: user.username,
          tipo_cliente: input.tipoCliente,
          estado: 'ACTIVE',
          estado_verificacion: 'PENDING',
          ...(businessAccountId
            ? {
                business_account_id: businessAccountId,
                estado_solicitud: 'PENDING' as const,
              }
            : {}),
        };
      });
    } catch (error) {
      if (error instanceof IdentityError) throw error;
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new IdentityError(
          'conflict',
          'La cédula, el RUC o el usuario ya está registrado.',
        );
      }
      throw error;
    }
  }

  async listPendingReviews(): Promise<PendingReviews> {
    const [people, businessAccounts] = await Promise.all([
      this.dataSource.query(
        `SELECT p.id AS person_id, u.id AS user_id, u.username,
                p.cedula, p.nombres, p.apellidos, p.fecha_nacimiento,
                p.telefono, p.email_contacto, p.estado_verificacion
         FROM person p JOIN app_user u ON u.person_id = p.id
         WHERE p.estado_verificacion = 'PENDING'
         ORDER BY p.id`,
      ),
      this.dataSource.query(
        `SELECT b.id AS business_account_id, b.user_id, u.username,
                b.ruc, b.razon_social, b.nombre_comercial,
                b.direccion_negocio, b.estado_solicitud, b.solicitada_en
         FROM business_account b JOIN app_user u ON u.id = b.user_id
         WHERE b.estado_solicitud = 'PENDING'
         ORDER BY b.solicitada_en`,
      ),
    ]);
    return { people, business_accounts: businessAccounts };
  }

  async reviewPersonVerification(
    personId: string,
    decision: ReviewDecision,
  ): Promise<PersonReviewResult> {
    const result = await this.dataSource.query(
      `UPDATE person SET estado_verificacion = $2, fecha_verificacion = CURRENT_TIMESTAMP
       WHERE id = $1 AND estado_verificacion = 'PENDING'
       RETURNING id AS person_id, estado_verificacion, fecha_verificacion`,
      [personId, decision],
    );
    const updatedPerson = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (updatedPerson) return { status: 'updated', person: updatedPerson };
    if (
      !(await this.dataSource.getRepository(Person).existsBy({ id: personId }))
    ) {
      return { status: 'not_found' };
    }
    return { status: 'already_reviewed' };
  }

  async reviewBusinessAccount(input: {
    accountId: string;
    decision: ReviewDecision;
    reason: string;
    reviewerUserId: string;
  }): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOneBy(BusinessAccount, {
        id: input.accountId,
      });
      if (!account) {
        throw new IdentityError(
          'not_found',
          'No se encontró la solicitud comercial.',
        );
      }
      if (account.estado_solicitud !== 'PENDING') {
        throw new IdentityError(
          'conflict',
          'La solicitud comercial ya fue revisada.',
        );
      }

      account.estado_solicitud = input.decision;
      account.revisado_por_user_id = input.reviewerUserId;
      account.revisado_en = new Date();
      account.motivo_rechazo =
        input.decision === 'REJECTED' ? input.reason : null;
      await manager.save(BusinessAccount, account);

      if (input.decision === 'APPROVED') {
        const businessRole = await manager.findOneBy(Role, {
          codigo: 'CUSTOMER_B2B',
        });
        if (!businessRole) {
          throw new IdentityError(
            'internal',
            'No está configurado el rol comercial.',
          );
        }
        await manager.query(
          `INSERT INTO user_role (user_id, role_id)
           VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING`,
          [account.user_id, businessRole.id],
        );
      }

      return {
        business_account_id: account.id,
        estado_solicitud: account.estado_solicitud,
        revisado_por_user_id: account.revisado_por_user_id,
        revisado_en: account.revisado_en,
        motivo_rechazo: account.motivo_rechazo,
      };
    });
  }

  async getBusinessAccountSettings(
    userId: string,
  ): Promise<BusinessAccountSettings | null> {
    const [settings] = await this.dataSource.query(
      `SELECT nombre_comercial
       FROM business_account
       WHERE user_id = $1`,
      [userId],
    );
    return settings ?? null;
  }

  async updateBusinessCommercialName(
    userId: string,
    nombreComercial: string | null,
  ): Promise<BusinessAccountSettings | null> {
    const [settings] = await this.dataSource.query(
      `UPDATE business_account
       SET nombre_comercial = $2
       WHERE user_id = $1
       RETURNING nombre_comercial`,
      [userId, nombreComercial],
    );
    return settings ?? null;
  }
}

function isBusinessRegistration(
  registration: IdentityRegistration['registration'],
): registration is Omit<BusinessRegistrationInput, 'password'> {
  return 'ruc' in registration;
}
