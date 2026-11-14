import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Ms01AuthClient } from './ms01-auth-client.js';

export type CatalogAdminRequest = Request & { user?: { userId: string; roles: string[] } };

@Injectable()
export class CatalogAdminGuard implements CanActivate {
  constructor(private readonly authClient: Ms01AuthClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CatalogAdminRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    request.user = await this.authClient.requireAdmin(request, response);
    return true;
  }
}
