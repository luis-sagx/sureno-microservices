import { CatalogError } from './catalog-error.js';

export type CatalogAuthErrorCode = 'unauthorized' | 'forbidden' | 'unavailable';

export class CatalogAuthError extends CatalogError {
  constructor(
    code: CatalogAuthErrorCode,
    message: string,
    readonly refreshedCookie?: string,
  ) {
    super(code, message);
    this.name = 'CatalogAuthError';
  }
}
