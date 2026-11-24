import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { SessionError } from '../../domain/session-error.js';
import type {
  IssuedSessionToken,
  SessionTokenPayload,
  SessionTokenService,
} from '../../application/session-token.port.js';

const INVALID_SESSION_MESSAGE = 'La sesión no es válida o ha expirado.';

export class HmacSessionTokenAdapter implements SessionTokenService {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.AUTH_SESSION_SECRET ?? '';
    if (this.secret.length < 32) {
      throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.');
    }
  }

  async issue(userId: string): Promise<IssuedSessionToken> {
    const sessionId = randomUUID();
    const encoded = Buffer.from(
      JSON.stringify({ sid: sessionId, sub: userId }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.secret)
      .update(encoded)
      .digest('base64url');
    return { sessionId, token: `${encoded}.${signature}` };
  }

  verify(token: string): SessionTokenPayload {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra !== undefined) {
      throw new SessionError(INVALID_SESSION_MESSAGE);
    }
    const expected = createHmac('sha256', this.secret).update(encoded).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      throw new SessionError(INVALID_SESSION_MESSAGE);
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new SessionError(INVALID_SESSION_MESSAGE);
    }
    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString(),
      ) as SessionTokenPayload;
      if (
        !payload ||
        typeof payload.sid !== 'string' ||
        typeof payload.sub !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(payload.sid) ||
        !/^[0-9a-f-]{36}$/i.test(payload.sub)
      ) {
        throw new Error('Malformed signed session payload.');
      }
      return payload;
    } catch {
      throw new SessionError(INVALID_SESSION_MESSAGE);
    }
  }
}
