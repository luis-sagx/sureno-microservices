export type PricingErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable';

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PricingError';
  }
}
