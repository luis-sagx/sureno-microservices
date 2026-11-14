import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { verifyPassword } from '../identity/password-hashing.js';

export const SESSION_COOKIE_NAME = 'sureno_session';
export const CUSTOMER_IDLE_TIMEOUT_MINUTES = 30;
export const ADMIN_IDLE_TIMEOUT_MINUTES = 15;

const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

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

interface SignedSessionPayload {
  sid: string;
  sub: string;
}

export function createSessionCookie(token: string, idleTimeoutMinutes: number): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.AUTH_COOKIE_SECURE === 'true';
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${idleTimeoutMinutes * 60}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.AUTH_COOKIE_SECURE === 'true';
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

@Injectable()
export class SessionService {
  private readonly secret: string;

  constructor(private readonly dataSource: DataSource) {
    this.secret = process.env.AUTH_SESSION_SECRET ?? '';
    if (this.secret.length < 32) {
      throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.');
    }
  }

  async login(input: { username?: unknown; password?: unknown }) {
    const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!username || !password) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const [user] = await this.dataSource.query(
      `SELECT u.id, u.username, u.password_hash, u.estado,
              p.estado_verificacion,
              b.estado_solicitud
       FROM app_user u
       JOIN person p ON p.id = u.person_id
       LEFT JOIN business_account b ON b.user_id = u.id
       WHERE u.username = $1`,
      [username],
    );
    const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || user.estado !== 'ACTIVE' || !passwordMatches) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const [roleRow] = await this.dataSource.query(
      `SELECT COALESCE(array_agg(r.codigo ORDER BY r.codigo), ARRAY[]::varchar[]) AS roles
       FROM user_role ur JOIN role r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id],
    );
    const roles = (roleRow?.roles ?? []) as string[];
    const idleTimeoutMinutes = this.idleTimeout(roles);
    const sid = randomUUID();
    const token = this.sign({ sid, sub: user.id });

    await this.dataSource.query(
      `INSERT INTO auth_session (id, user_id, creada_en, ultima_actividad_en, expira_en)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
               CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'))`,
      [sid, user.id, idleTimeoutMinutes],
    );

    return {
      token,
      idleTimeoutMinutes,
      user: {
        user_id: user.id,
        username: user.username,
        roles,
        estado_verificacion: user.estado_verificacion,
        estado_solicitud: user.estado_solicitud,
      },
    };
  }

  async authenticate(token: string): Promise<AuthenticatedSession> {
    const payload = this.verify(token);
    const [session] = await this.dataSource.query(
      `SELECT s.id, s.user_id, u.username, u.estado,
              p.estado_verificacion, b.estado_solicitud,
              COALESCE(array_agg(DISTINCT r.codigo ORDER BY r.codigo)
                FILTER (WHERE r.codigo IS NOT NULL), ARRAY[]::varchar[]) AS roles
       FROM auth_session s
       JOIN app_user u ON u.id = s.user_id
       JOIN person p ON p.id = u.person_id
       LEFT JOIN business_account b ON b.user_id = u.id
       LEFT JOIN user_role ur ON ur.user_id = u.id
       LEFT JOIN role r ON r.id = ur.role_id
       WHERE s.id = $1 AND s.user_id = $2
         AND s.revocada_en IS NULL AND s.expira_en > CURRENT_TIMESTAMP
       GROUP BY s.id, s.user_id, u.id, p.id, b.id`,
      [payload.sid, payload.sub],
    );
    if (!session || session.estado !== 'ACTIVE') {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }

    const roles = (session.roles ?? []) as string[];
    const idleTimeoutMinutes = this.idleTimeout(roles);
    const refreshed = await this.dataSource.query(
      `UPDATE auth_session
       SET ultima_actividad_en = CURRENT_TIMESTAMP,
           expira_en = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 minute')
       WHERE id = $1 AND revocada_en IS NULL AND expira_en > CURRENT_TIMESTAMP
       RETURNING id`,
      [session.id, idleTimeoutMinutes],
    );
    if (refreshed.length === 0) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }

    return {
      token,
      idleTimeoutMinutes,
      principal: {
        userId: session.user_id,
        username: session.username,
        roles,
        estado_verificacion: session.estado_verificacion,
        estado_solicitud: session.estado_solicitud,
      },
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = this.verify(token);
      await this.dataSource.query(
        `UPDATE auth_session SET revocada_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND revocada_en IS NULL`,
        [payload.sid, payload.sub],
      );
    } catch {
      // Logout is idempotent; an invalid or expired cookie is still cleared.
    }
  }

  private idleTimeout(roles: string[]): number {
    return roles.includes('ADMIN') ? ADMIN_IDLE_TIMEOUT_MINUTES : CUSTOMER_IDLE_TIMEOUT_MINUTES;
  }

  private sign(payload: SignedSessionPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verify(token: string): SignedSessionPayload {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra !== undefined) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
    const expected = createHmac('sha256', this.secret).update(encoded).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SignedSessionPayload;
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
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }
  }
}
