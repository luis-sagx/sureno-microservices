import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CatalogAuthPort, CatalogPrincipal } from '../catalog/application/catalog-auth.port.js';
import { CATALOG_AUTH_PORT } from '../catalog/application/catalog.tokens.js';
import { CatalogAuthError } from '../catalog/domain/catalog-auth-error.js';

export type CatalogAdminRequest = Request & { user?: CatalogPrincipal };

@Injectable()
export class CatalogAdminGuard implements CanActivate {
  constructor(@Inject(CATALOG_AUTH_PORT) private readonly auth: CatalogAuthPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CatalogAdminRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    try {
      const result = await this.auth.requireAdmin({
        cookie: request.headers.cookie,
        authorization: request.headers.authorization,
      });
      request.user = result.principal;
      if (result.refreshedCookie) {
        response.setHeader('Set-Cookie', result.refreshedCookie);
      }
    } catch (error) {
      const authError = error as { code?: string; message?: string; refreshedCookie?: string };
      if (authError.refreshedCookie) {
        response.setHeader('Set-Cookie', authError.refreshedCookie);
      }
      const message = authError.message ?? 'No se pudo verificar la sesión con MS01.';
      if (error instanceof CatalogAuthError || authError.code) {
        switch (authError.code) {
          case 'unauthorized':
            throw new UnauthorizedException(message);
          case 'forbidden':
            throw new ForbiddenException(message);
          case 'unavailable':
            throw new ServiceUnavailableException(message);
          default:
            break;
        }
      }
      throw error;
    }
    return true;
  }
}
