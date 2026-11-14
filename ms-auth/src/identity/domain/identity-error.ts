export type IdentityErrorCode =
  'bad_request' | 'conflict' | 'not_found' | 'internal';

export class IdentityError extends Error {
  constructor(
    readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
