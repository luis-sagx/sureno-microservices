import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { IdentityController } from './identity.controller.js';
import { SessionAuthGuard } from '../sessions/session-auth.guard.js';

function routeGuards(methodName: string): unknown[] {
  const handler = (IdentityController.prototype as unknown as Record<string, unknown>)[methodName];
  return Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
}

describe('IdentityController business account settings', () => {
  const userId = 'd86f207f-7a60-4c41-95ac-b3eea68f4a82';

  it('gets settings for the authenticated user and protects the route', async () => {
    const getSettings = vi.fn().mockResolvedValue({ nombre_comercial: null });
    const controller = new IdentityController({
      getBusinessAccountSettings: getSettings,
    } as never);

    await expect(controller.getMyBusinessAccountSettings({ user: { userId } } as never))
      .resolves.toEqual({ nombre_comercial: null });
    expect(getSettings).toHaveBeenCalledWith(userId);
    expect(routeGuards('getMyBusinessAccountSettings')).toContain(SessionAuthGuard);
  });

  it('updates settings with the authenticated user id, ignoring any submitted identity', async () => {
    const updateSettings = vi.fn().mockResolvedValue({ nombre_comercial: 'Bodega' });
    const controller = new IdentityController({
      updateBusinessCommercialName: updateSettings,
    } as never);

    await expect(controller.updateMyBusinessAccountSettings(
      { user: { userId } } as never,
      { nombre_comercial: 'Bodega', user_id: 'some-other-user' } as never,
    )).resolves.toEqual({ nombre_comercial: 'Bodega' });
    expect(updateSettings).toHaveBeenCalledWith(userId, {
      nombre_comercial: 'Bodega',
    });
    expect(routeGuards('updateMyBusinessAccountSettings')).toContain(SessionAuthGuard);
  });
});
