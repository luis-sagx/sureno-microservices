import {
  Injectable,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response as ExpressResponse } from 'express';

export interface CatalogPrincipal {
  userId: string;
  username?: string;
  roles: string[];
}

@Injectable()
export class Ms01AuthClient {
  private readonly baseUrl = (process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );

  async requireAdmin(request: Request, response: ExpressResponse): Promise<CatalogPrincipal> {
    const cookie = request.headers.cookie;
    const authorization = request.headers.authorization;
    if (!cookie && !authorization) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }

    const headers = new Headers();
    if (cookie) headers.set('cookie', cookie);
    if (authorization) headers.set('authorization', authorization);

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${this.baseUrl}/sessions/me`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      throw new ServiceUnavailableException('El servicio de identidad no está disponible.');
    }

    const refreshedCookie = upstream.headers.get('set-cookie');
    if (refreshedCookie) response.setHeader('Set-Cookie', refreshedCookie);
    if (upstream.status === 401) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
    if (!upstream.ok) {
      throw new ServiceUnavailableException('No se pudo verificar la sesión con MS01.');
    }

    let principal: Partial<CatalogPrincipal>;
    try {
      principal = (await upstream.json()) as Partial<CatalogPrincipal>;
    } catch {
      throw new ServiceUnavailableException('MS01 devolvió una respuesta de sesión inválida.');
    }
    if (
      typeof principal.userId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(principal.userId) ||
      !Array.isArray(principal.roles) ||
      !principal.roles.every((role) => typeof role === 'string')
    ) {
      throw new ServiceUnavailableException('MS01 devolvió una respuesta de sesión inválida.');
    }
    if (!principal.roles.includes('ADMIN')) {
      throw new ForbiddenException('Se requiere el rol ADMIN.');
    }
    return principal as CatalogPrincipal;
  }
}
