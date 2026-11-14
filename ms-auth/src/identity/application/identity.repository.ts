import type {
  BusinessRegistrationInput,
  RegistrationInput,
} from '../domain/registration.js';

export type IdentityRegistration = {
  registration:
    | Omit<RegistrationInput, 'password'>
    | Omit<BusinessRegistrationInput, 'password'>;
  passwordHash: string;
  tipoCliente: 'B2C' | 'B2B';
};

export type RegistrationResponse = {
  person_id: string;
  user_id: string;
  username: string;
  tipo_cliente: 'B2C' | 'B2B';
  estado: 'ACTIVE';
  estado_verificacion: 'PENDING';
  business_account_id?: string;
  estado_solicitud?: 'PENDING';
};

export type ReviewDecision = 'APPROVED' | 'REJECTED';

export type PendingReviews = {
  people: Array<Record<string, unknown>>;
  business_accounts: Array<Record<string, unknown>>;
};

export type PersonReviewResult =
  | { status: 'updated'; person: Record<string, unknown> }
  | { status: 'not_found' }
  | { status: 'already_reviewed' };

export type BusinessAccountSettings = {
  nombre_comercial: string | null;
};

export interface IdentityRepository {
  register(input: IdentityRegistration): Promise<RegistrationResponse>;
  listPendingReviews(): Promise<PendingReviews>;
  reviewPersonVerification(
    personId: string,
    decision: ReviewDecision,
  ): Promise<PersonReviewResult>;
  reviewBusinessAccount(input: {
    accountId: string;
    decision: ReviewDecision;
    reason: string;
    reviewerUserId: string;
  }): Promise<Record<string, unknown>>;
  getBusinessAccountSettings(userId: string): Promise<BusinessAccountSettings | null>;
  updateBusinessCommercialName(
    userId: string,
    nombreComercial: string | null,
  ): Promise<BusinessAccountSettings | null>;
}
