import { IdentityError } from './identity-error.js';

export class IdentityValidationError extends IdentityError {
  constructor(message: string) {
    super('bad_request', message);
    this.name = 'IdentityValidationError';
  }
}
