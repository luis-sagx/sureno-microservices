import { SessionError } from '../domain/session-error.js';
import type { CredentialVerifier } from './credential-verifier.port.js';
import type { SessionRepository } from './session.repository.js';
import type { SessionTokenService } from './session-token.port.js';

export interface SessionPrincipal {
  userId: string;
  username: string;
  roles: string[];
  estado_verificacion: string;
  estado_solicitud: string | null;
}

export interface AuthenticatedSession {
  principal: SessionPrincipal;
  token: string;
  idleTimeoutMinutes: number;
}

const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const CUSTOMER_IDLE_TIMEOUT_MINUTES = 30;
const ADMIN_IDLE_TIMEOUT_MINUTES = 15;
const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.';
const INVALID_SESSION_MESSAGE = 'La sesión no es válida o ha expirado.';

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly credentialVerifier: CredentialVerifier,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  async login(input: { username?: unknown; password?: unknown }) {
    const username =
      typeof input?.username === 'string'
        ? input.username.trim().toLowerCase()
        : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!username || !password) {
      throw new SessionError(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.sessions.findCredentials(username);
    const passwordMatches = await this.credentialVerifier.verify(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.state !== 'ACTIVE' || !passwordMatches) {
      throw new SessionError(INVALID_CREDENTIALS_MESSAGE);
    }

    const roles = await this.sessions.findRoles(user.userId);
    const idleTimeoutMinutes = this.idleTimeout(roles);
    const { sessionId, token } = await this.sessionTokens.issue(user.userId);
    await this.sessions.createSession({
      sessionId,
      userId: user.userId,
      idleTimeoutMinutes,
    });

    return {
      token,
      idleTimeoutMinutes,
      user: {
        user_id: user.userId,
        username: user.username,
        roles,
        estado_verificacion: user.verificationState,
        estado_solicitud: user.businessRequestState,
      },
    };
  }

  async authenticate(token: string): Promise<AuthenticatedSession> {
    const payload = this.sessionTokens.verify(token);
    const session = await this.sessions.findActiveSession(payload.sid, payload.sub);
    if (!session || session.state !== 'ACTIVE') {
      throw new SessionError(INVALID_SESSION_MESSAGE);
    }
    const idleTimeoutMinutes = this.idleTimeout(session.roles);
    const refreshed = await this.sessions.refreshSession(
      session.sessionId,
      idleTimeoutMinutes,
    );
    if (!refreshed) throw new SessionError(INVALID_SESSION_MESSAGE);
    return {
      token,
      idleTimeoutMinutes,
      principal: {
        userId: session.userId,
        username: session.username,
        roles: session.roles,
        estado_verificacion: session.verificationState,
        estado_solicitud: session.businessRequestState,
      },
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = this.sessionTokens.verify(token);
      await this.sessions.revokeSession(payload.sid, payload.sub);
    } catch {
      // Logout stays idempotent; invalid or expired tokens are ignored.
    }
  }

  private idleTimeout(roles: string[]): number {
    return roles.includes('ADMIN')
      ? ADMIN_IDLE_TIMEOUT_MINUTES
      : CUSTOMER_IDLE_TIMEOUT_MINUTES;
  }
}
