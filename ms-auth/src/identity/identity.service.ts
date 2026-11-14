import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppUser } from './entities/app-user.entity.js';
import { BusinessAccount } from './entities/business-account.entity.js';
import { Person } from './entities/person.entity.js';
import {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
} from './dto/registration.dto.js';
import {
  validateBusinessRequest,
  validateRegistration,
} from './registration-validation.js';

const hashPassword = (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
};

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

        let businessAccountStatus: 'PENDING' | undefined;
        if (tipoCliente === 'B2B') {
          if (
            !registration.ruc ||
            !registration.razon_social ||
            !registration.direccion_negocio
          ) {
            throw new InternalServerErrorException('La solicitud comercial está incompleta.');
          }
          const businessAccount = manager.create(BusinessAccount, {
            id: randomUUID(),
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
          user_id: userId,
          username: user.username,
          tipo_cliente: tipoCliente,
          estado: user.estado,
          estado_verificacion: person.estado_verificacion,
          ...(businessAccountStatus
            ? { estado_solicitud: businessAccountStatus }
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
