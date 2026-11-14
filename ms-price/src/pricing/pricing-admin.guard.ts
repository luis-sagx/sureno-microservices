import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PRICING_SESSION_PORT } from './application/pricing.tokens.js';
import type { PricingSessionPort } from './application/pricing-session.port.js';

@Injectable()
export class PricingAdminGuard implements CanActivate {
  constructor(@Inject(PRICING_SESSION_PORT) private readonly sessions: PricingSessionPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { pricingAdminId?: string }>();
    const principal = await this.sessions.requireAdmin({
      cookie: request.headers.cookie,
      authorization: request.headers.authorization,
    });
    request.pricingAdminId = principal.userId;
    return true;
  }
}
