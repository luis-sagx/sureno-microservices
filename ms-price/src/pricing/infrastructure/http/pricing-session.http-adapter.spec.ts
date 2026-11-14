import { afterEach, describe, expect, it, vi } from 'vitest';
import { PricingError } from '../../domain/pricing-error.js';
import { PricingSessionHttpAdapter } from './pricing-session.http-adapter.js';

describe('PricingSessionHttpAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('treats an explicit unauthenticated response as an anonymous session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })));
    await expect(new PricingSessionHttpAdapter('http://auth').resolveOptional({ cookie: 'expired' })).resolves.toBeNull();
  });

  it('fails closed when MS01 returns a server error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    await expect(new PricingSessionHttpAdapter('http://auth').resolveOptional({ cookie: 'session' }))
      .rejects.toMatchObject<PricingError>({ code: 'unavailable' });
  });

  it('fails closed when MS01 cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    await expect(new PricingSessionHttpAdapter('http://auth').resolveOptional({ authorization: 'Bearer token' }))
      .rejects.toMatchObject<PricingError>({ code: 'unavailable' });
  });

  it('does not turn an MS01 outage into an unauthenticated admin response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    await expect(new PricingSessionHttpAdapter('http://auth').requireAdmin({ cookie: 'session' }))
      .rejects.toMatchObject<PricingError>({ code: 'unavailable' });
  });
});
