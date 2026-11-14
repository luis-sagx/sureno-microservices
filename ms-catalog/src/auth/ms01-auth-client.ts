import { Injectable } from '@nestjs/common';
import type {
  CatalogAuthCredentials,
  CatalogAuthPort,
  CatalogAuthResult,
} from '../catalog/application/catalog-auth.port.js';
import { CatalogAuthError } from '../catalog/domain/catalog-auth-error.js';

@Injectable()
export class Ms01AuthClient implements CatalogAuthPort {
  private readonly baseUrl = (process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );

  async requireAdmin(credentials: CatalogAuthCredentials): Promise<CatalogAuthResult> {
    if (!credentials.cookie && !credentials.authorization) {
      throw new CatalogAuthError('unauthorized', 'Debes iniciar sesión.');
    }

    const headers = new Headers();
    if (credentials.cookie) headers.set('cookie', credentials.cookie);
    if (credentials.authorization) headers.set('authorization', credentials.authorization);

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${this.baseUrl}/sessions/me`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      throw new CatalogAuthError(
        'unavailable',
        'El servicio de identidad no está disponible.',
      );
    }

    const refreshedCookie = upstream.headers.get('set-cookie') ?? undefined;
    if (upstream.status === 401) {
      throw new CatalogAuthError(
        'unauthorized',
        'La sesión no es válida o ha expirado.',
        refreshedCookie,
      );
    }
    if (!upstream.ok) {
      throw new CatalogAuthError(
        'unavailable',
        'No se pudo verificar la sesión con MS01.',
        refreshedCookie,
      );
    }

    let principal: Partial<CatalogAuthResult['principal']>;
    try {
      principal = (await upstream.json()) as Partial<CatalogAuthResult['principal']>;
    } catch {
      throw new CatalogAuthError(
        'unavailable',
        'MS01 devolvió una respuesta de sesión inválida.',
        refreshedCookie,
      );
    }
    if (
      typeof principal.userId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(principal.userId) ||
      !Array.isArray(principal.roles) ||
      !principal.roles.every((role) => typeof role === 'string')
    ) {
      throw new CatalogAuthError(
        'unavailable',
        'MS01 devolvió una respuesta de sesión inválida.',
        refreshedCookie,
      );
    }
    if (!principal.roles.includes('ADMIN')) {
      throw new CatalogAuthError(
        'forbidden',
        'Se requiere el rol ADMIN.',
        refreshedCookie,
      );
    }
    return {
      principal: principal as CatalogAuthResult['principal'],
      refreshedCookie,
    };
  }
}
