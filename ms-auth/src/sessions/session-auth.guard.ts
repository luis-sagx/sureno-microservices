import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { createSessionCookie, SessionPrincipal, SessionService } from './session.service.js';

export const REQUIRED_ROLES = 'sureno:required-roles';

export type AuthenticatedRequest = Request & { user?: SessionPrincipal };

export function extractSessionToken(request: Request): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || undefined;
  }

  const cookie = request.headers.cookie;
  if (!cookie) return undefined;
  const match = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('sureno_session='));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match.slice('sureno_session='.length));
  } catch {
    throw new UnauthorizedException('La sesión no es válida o ha expirado.');
  }
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = extractSessionToken(request);
    if (!token) throw new UnauthorizedException('Debes iniciar sesión.');

    const session = await this.sessions.authenticate(token);
    request.user = session.principal;
    response.setHeader('Set-Cookie', createSessionCookie(token, session.idleTimeoutMinutes));
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || !required.some((role) => request.user?.roles.includes(role))) {
      return false;
    }
    return true;
  }
}
