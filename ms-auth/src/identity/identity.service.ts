import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppUser } from './entities/app-user.entity.js';
import { BusinessAccount } from './entities/business-account.entity.js';
import { Person } from './entities/person.entity.js';
import { Role } from './entities/role.entity.js';
import { UserRole } from './entities/user-role.entity.js';
import {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
} from './dto/registration.dto.js';
import { hashPassword } from './password-hashing.js';
import {
  validateBusinessRequest,
  validateRegistration,
} from './registration-validation.js';

@Injectable()
export class IdentityService {
  constructor(private readonly dataSource: DataSource) {}

  async registerIndividual(input: RegisterIndividualDto) {
    const registration = validateRegistration(input);
    return this.persistRegistration(registration, 'B2C');
  }

  async requestBusinessAccount(input: RequestBusinessAccountDto) {
    const registration = validateBusinessRequest(input);
    return this.persistRegistration(registration, 'B2B');
  }

  async listPendingReviews() {
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
    decision: 'APPROVED' | 'REJECTED',
  ) {
    this.validateUuid(personId);
    const result = await this.dataSource.query(
      `UPDATE person SET estado_verificacion = $2, fecha_verificacion = CURRENT_TIMESTAMP
       WHERE id = $1 AND estado_verificacion = 'PENDING'
       RETURNING id AS person_id, estado_verificacion, fecha_verificacion`,
      [personId, decision],
    );
    const updatedPerson = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (updatedPerson) return updatedPerson;
    if (!(await this.dataSource.getRepository(Person).existsBy({ id: personId }))) {
      throw new NotFoundException('No se encontró la persona.');
    }
    throw new ConflictException('La verificación ya fue revisada.');
  }

  async reviewBusinessAccount(
    accountId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string | undefined,
    reviewerUserId: string,
  ) {
    this.validateUuid(accountId);
    const rejectionReason = reason?.trim() ?? '';
    if (decision === 'REJECTED' && !rejectionReason) {
      throw new BadRequestException('Indica el motivo del rechazo.');
    }
    if (rejectionReason.length > 2000) {
      throw new BadRequestException('El motivo no puede superar 2000 caracteres.');
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOneBy(BusinessAccount, { id: accountId });
      if (!account) throw new NotFoundException('No se encontró la solicitud comercial.');
      if (account.estado_solicitud !== 'PENDING') {
        throw new ConflictException('La solicitud comercial ya fue revisada.');
      }

      account.estado_solicitud = decision;
      account.revisado_por_user_id = reviewerUserId;
      account.revisado_en = new Date();
      account.motivo_rechazo = decision === 'REJECTED' ? rejectionReason : null;
      await manager.save(BusinessAccount, account);

      if (decision === 'APPROVED') {
        const businessRole = await manager.findOneBy(Role, { codigo: 'CUSTOMER_B2B' });
        if (!businessRole) {
          throw new InternalServerErrorException('No está configurado el rol comercial.');
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

  private validateUuid(value: string) {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new BadRequestException('El identificador no es válido.');
    }
  }

  private async persistRegistration(
    registration: ReturnType<typeof validateRegistration> & {
      ruc?: string;
      razon_social?: string;
      nombre_comercial?: string | null;
      direccion_negocio?: string;
    },
    tipoCliente: 'B2C' | 'B2B',
  ) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (await manager.findOneBy(Person, { cedula: registration.cedula })) {
          throw new ConflictException('La cédula ya está registrada.');
        }
        if (await manager.findOneBy(AppUser, { username: registration.username })) {
          throw new ConflictException('El nombre de usuario ya está registrado.');
        }
        if (
          tipoCliente === 'B2B' &&
          registration.ruc &&
          (await manager.findOneBy(BusinessAccount, { ruc: registration.ruc }))
        ) {
          throw new ConflictException('El RUC ya tiene una solicitud registrada.');
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
          password_hash: await hashPassword(registration.password),
          estado: 'ACTIVE',
        });
        await manager.save(AppUser, user);

        const customerRole = await manager.findOneBy(Role, { codigo: 'CUSTOMER' });
        if (!customerRole) {
          throw new InternalServerErrorException('No están configurados los roles de MS01.');
        }
        await manager.save(
          UserRole,
          manager.create(UserRole, {
            user_id: userId,
            role_id: customerRole.id,
          }),
        );

        let businessAccountStatus: 'PENDING' | undefined;
        let businessAccountId: string | undefined;
        if (tipoCliente === 'B2B') {
          if (
            !registration.ruc ||
            !registration.razon_social ||
            !registration.direccion_negocio
          ) {
            throw new InternalServerErrorException('La solicitud comercial está incompleta.');
          }
          businessAccountId = randomUUID();
          const businessAccount = manager.create(BusinessAccount, {
            id: businessAccountId,
            user_id: userId,
            ruc: registration.ruc,
            razon_social: registration.razon_social,
            nombre_comercial: registration.nombre_comercial ?? null,
            direccion_negocio: registration.direccion_negocio,
            estado_solicitud: 'PENDING',
            revisado_por_user_id: null,
            revisado_en: null,
            motivo_rechazo: null,
          });
          await manager.save(BusinessAccount, businessAccount);
          businessAccountStatus = 'PENDING';
        }

        return {
          person_id: personId,
          user_id: userId,
          username: user.username,
          tipo_cliente: tipoCliente,
          estado: user.estado,
          estado_verificacion: person.estado_verificacion,
          ...(businessAccountStatus
            ? {
                business_account_id: businessAccountId,
                estado_solicitud: businessAccountStatus,
              }
            : {}),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('La cédula, el RUC o el usuario ya está registrado.');
      }
      throw error;
    }
  }
}
