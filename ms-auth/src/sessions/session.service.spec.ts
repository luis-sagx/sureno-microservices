import { SessionService } from './session.service.js';
import { createHmac } from 'node:crypto';

describe('SessionService application boundary', () => {
  const originalSecret = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = 'session-secret-for-unit-tests-32';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = originalSecret;
  });

  it('normalizes the username and delegates login through session ports', async () => {
    let lookedUpUsername: string | undefined;
    const sessions = {
      async findCredentials(username: string) {
        lookedUpUsername = username;
        return {
          userId: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
          username: 'andrea',
          passwordHash: 'scrypt$stored-hash',
          state: 'ACTIVE',
          verificationState: 'PENDING',
          businessRequestState: null,
        };
      },
      async findRoles() {
        return ['CUSTOMER'];
      },
      async createSession() {},
    };
    const credentialVerifier = {
      async verify() {
        return true;
      },
    };
    const sessionTokens = {
      async issue() {
        return {
          sessionId: 'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
          token: 'signed-session-token',
        };
      },
    };
    const service = new SessionService(
      sessions as never,
      credentialVerifier as never,
      sessionTokens as never,
    );

    let result: unknown;
    try {
      result = await service.login({ username: ' Andrea ', password: 'password' });
    } catch {
      // Keep the assertion focused on whether login reached the session port.
    }

    expect(lookedUpUsername).toBe('andrea');
    expect(result).toEqual({
      token: 'signed-session-token',
      idleTimeoutMinutes: 30,
      user: {
        user_id: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
        username: 'andrea',
        roles: ['CUSTOMER'],
        estado_verificacion: 'PENDING',
        estado_solicitud: null,
      },
    });
  });

  it('assigns administrators a 15-minute idle timeout', async () => {
    const sessions = {
      async findCredentials() {
        return {
          userId: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
          username: 'admin',
          passwordHash: 'scrypt$stored-hash',
          state: 'ACTIVE',
          verificationState: 'APPROVED',
          businessRequestState: null,
        };
      },
      async findRoles() {
        return ['ADMIN'];
      },
      async createSession() {},
    };
    const service = new SessionService(
      sessions as never,
      { async verify() { return true; } } as never,
      {
        async issue() {
          return {
            sessionId: 'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
            token: 'signed-admin-session',
          };
        },
      } as never,
    );

    let result: { idleTimeoutMinutes?: number } | undefined;
    try {
      result = await service.login({ username: 'admin', password: 'password' });
    } catch {
      // The assertions target role-based timeout selection and persistence.
    }

    expect(result?.idleTimeoutMinutes).toBe(15);
  });

  it('authenticates through the repository and refreshes the existing session', async () => {
    let refreshed: unknown;
    let lookedUp: unknown;
    const sessions = {
      async findActiveSession(sessionId: string, userId: string) {
        lookedUp = [sessionId, userId];
        return {
          sessionId,
          userId,
          username: 'admin',
          state: 'ACTIVE',
          verificationState: 'APPROVED',
          businessRequestState: null,
          roles: ['ADMIN'],
        };
      },
      async refreshSession(sessionId: string, idleTimeoutMinutes: number) {
        refreshed = [sessionId, idleTimeoutMinutes];
        return true;
      },
    };
    const service = new SessionService(
      sessions as never,
      {} as never,
      {
        verify() {
          return {
            sid: 'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
            sub: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
          };
        },
      } as never,
    );

    let result: unknown;
    try {
      result = await service.authenticate('signed-admin-session');
    } catch {
      // Keep RED focused on whether authentication reaches the persistence port.
    }

    expect(lookedUp).toEqual([
      'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
      'd86f207f-7a60-4c41-95ac-b3eea68f4a82',
    ]);
    expect(refreshed).toEqual([
      'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21',
      15,
    ]);
    expect(result).toMatchObject({
      token: 'signed-admin-session',
      idleTimeoutMinutes: 15,
      principal: { userId: 'd86f207f-7a60-4c41-95ac-b3eea68f4a82' },
    });
  });

  it('revokes a verified session through the repository on logout', async () => {
    let revoked: unknown;
    const sessionId = 'c6d0b42e-4a62-4c13-8dd4-6f1e98f8fb21';
    const userId = 'd86f207f-7a60-4c41-95ac-b3eea68f4a82';
    const encoded = Buffer.from(JSON.stringify({ sid: sessionId, sub: userId }))
      .toString('base64url');
    const signature = createHmac('sha256', process.env.AUTH_SESSION_SECRET!)
      .update(encoded)
      .digest('base64url');
    const token = `${encoded}.${signature}`;
    const service = new SessionService(
      {
        async revokeSession(id: string, subject: string) {
          revoked = [id, subject];
        },
      } as never,
      {} as never,
      {
        verify() {
          return { sid: sessionId, sub: userId };
        },
      } as never,
    );

    await service.logout(token);

    expect(revoked).toEqual([sessionId, userId]);
  });
});
