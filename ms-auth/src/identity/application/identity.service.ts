import { IdentityError } from '../domain/identity-error.js';
import { commercialNameFromSettings } from '../domain/business-account-profile.js';
import {
  validateBusinessRequest,
  validateRegistration,
} from '../domain/registration.js';
import type {
  BusinessAccountSettings,
  IdentityRepository,
  ReviewDecision,
} from './identity.repository.js';
import type { PasswordHasher } from './password-hasher.port.js';

export class IdentityService {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async registerIndividual(input: unknown) {
    const registration = validateRegistration(input);
    const passwordHash = await this.passwordHasher.hash(registration.password);
    const { password: _password, ...registrationData } = registration;
    return this.identities.register({
      registration: registrationData,
      passwordHash,
      tipoCliente: 'B2C',
    });
  }

  async requestBusinessAccount(input: unknown) {
    const registration = validateBusinessRequest(input);
    const passwordHash = await this.passwordHasher.hash(registration.password);
    const { password: _password, ...registrationData } = registration;
    return this.identities.register({
      registration: registrationData,
      passwordHash,
      tipoCliente: 'B2B',
    });
  }

  listPendingReviews() {
    return this.identities.listPendingReviews();
  }

  async reviewPersonVerification(personId: string, decision: ReviewDecision) {
    this.validateUuid(personId);
    const result = await this.identities.reviewPersonVerification(
      personId,
      decision,
    );
    if (result.status === 'not_found') {
      throw new IdentityError('not_found', 'No se encontró la persona.');
    }
    if (result.status === 'already_reviewed') {
      throw new IdentityError('conflict', 'La verificación ya fue revisada.');
    }
    return result.person;
  }

  async reviewBusinessAccount(
    accountId: string,
    decision: ReviewDecision,
    reason: string | undefined,
    reviewerUserId: string,
  ) {
    this.validateUuid(accountId);
    const rejectionReason = reason?.trim() ?? '';
    if (decision === 'REJECTED' && !rejectionReason) {
      throw new IdentityError('bad_request', 'Indica el motivo del rechazo.');
    }
    if (rejectionReason.length > 2000) {
      throw new IdentityError(
        'bad_request',
        'El motivo no puede superar 2000 caracteres.',
      );
    }

    return this.identities.reviewBusinessAccount({
      accountId,
      decision,
      reason: rejectionReason,
      reviewerUserId,
    });
  }

  async getBusinessAccountSettings(
    userId: string,
  ): Promise<BusinessAccountSettings> {
    this.validateUuid(userId);
    const settings = await this.identities.getBusinessAccountSettings(userId);
    if (!settings) {
      throw new IdentityError(
        'not_found',
        'No hay una cuenta comercial asociada a este usuario.',
      );
    }
    return settings;
  }

  async updateBusinessCommercialName(userId: string, input: unknown) {
    this.validateUuid(userId);
    const nombreComercial = commercialNameFromSettings(input);
    const settings = await this.identities.updateBusinessCommercialName(
      userId,
      nombreComercial,
    );
    if (!settings) {
      throw new IdentityError(
        'not_found',
        'No hay una cuenta comercial asociada a este usuario.',
      );
    }
    return settings;
  }

  private validateUuid(value: string): void {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new IdentityError('bad_request', 'El identificador no es válido.');
    }
  }
}
