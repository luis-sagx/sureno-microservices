import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ActiveSession,
  LoginCredentials,
  SessionRepository,
} from '../../application/session.repository.js';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findCredentials(username: string): Promise<LoginCredentials | null> {
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
    if (!user) return null;
    return {
      userId: user.id,
      username: user.username,
      passwordHash: user.password_hash,
      state: user.estado,
      verificationState: user.estado_verificacion,
      businessRequestState: user.estado_solicitud,
    };
  }

  async findRoles(userId: string): Promise<string[]> {
    const [roleRow] = await this.dataSource.query(
      `SELECT COALESCE(array_agg(r.codigo ORDER BY r.codigo), ARRAY[]::varchar[]) AS roles
       FROM user_role ur JOIN role r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId],
    );
    return (roleRow?.roles ?? []) as string[];
  }

  async createSession(input: {
    sessionId: string;
    userId: string;
    idleTimeoutMinutes: number;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO auth_session (id, user_id, creada_en, ultima_actividad_en, expira_en)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
               CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'))`,
      [input.sessionId, input.userId, input.idleTimeoutMinutes],
    );
  }

  async findActiveSession(
    sessionId: string,
    userId: string,
  ): Promise<ActiveSession | null> {
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
      [sessionId, userId],
    );
    if (!session) return null;
    return {
      sessionId: session.id,
      userId: session.user_id,
      username: session.username,
      state: session.estado,
      verificationState: session.estado_verificacion,
      businessRequestState: session.estado_solicitud,
      roles: (session.roles ?? []) as string[],
    };
  }

  async refreshSession(
    sessionId: string,
    idleTimeoutMinutes: number,
  ): Promise<boolean> {
    const refreshed = await this.dataSource.query(
      `UPDATE auth_session
       SET ultima_actividad_en = CURRENT_TIMESTAMP,
           expira_en = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 minute')
       WHERE id = $1 AND revocada_en IS NULL AND expira_en > CURRENT_TIMESTAMP
       RETURNING id`,
      [sessionId, idleTimeoutMinutes],
    );
    return refreshed.length > 0;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE auth_session SET revocada_en = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND revocada_en IS NULL`,
      [sessionId, userId],
    );
  }
}
