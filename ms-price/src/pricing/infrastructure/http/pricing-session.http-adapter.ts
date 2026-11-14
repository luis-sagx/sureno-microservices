import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { PricingCredentials, PricingPrincipal, PricingSessionPort } from '../../application/pricing-session.port.js';
import { PricingError } from '../../domain/pricing-error.js';

export class PricingSessionHttpAdapter implements PricingSessionPort {
  constructor(private readonly baseUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001') {}
  async resolveOptional(credentials: PricingCredentials): Promise<PricingPrincipal | null> {
    if (!credentials.cookie && !credentials.authorization) return null;
    try {
      const response = await fetch(`${this.baseUrl}/sessions/me`, { headers: this.headers(credentials) });
      if (response.status === 401) return null;
      if (!response.ok) throw new PricingError('unavailable', 'El servicio de autenticación no está disponible.');
      const body = await response.json() as { userId?: string; roles?: string[] };
      if (!body.userId || !Array.isArray(body.roles)) {
        throw new PricingError('unavailable', 'El servicio de autenticación devolvió una sesión inválida.');
      }
      return { userId: body.userId, roles: body.roles };
    } catch (error) {
      if (error instanceof PricingError) throw error;
      throw new PricingError('unavailable', 'No se pudo verificar la sesión con el servicio de autenticación.');
    }
  }
  async requireAdmin(credentials: PricingCredentials): Promise<PricingPrincipal> {
    const principal = await this.resolveOptional(credentials);
    if (!principal) throw new UnauthorizedException('Debes iniciar sesión.');
    if (!principal.roles.includes('ADMIN')) throw new ForbiddenException('Se requiere ADMIN.');
    return principal;
  }
  private headers(credentials: PricingCredentials): HeadersInit {
    return { ...(credentials.cookie ? { cookie: credentials.cookie } : {}), ...(credentials.authorization ? { authorization: credentials.authorization } : {}) };
  }
}
