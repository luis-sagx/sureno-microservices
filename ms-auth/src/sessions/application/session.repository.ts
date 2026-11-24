export interface LoginCredentials {
  userId: string;
  username: string;
  passwordHash: string;
  state: string;
  verificationState: string;
  businessRequestState: string | null;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  username: string;
  state: string;
  verificationState: string;
  businessRequestState: string | null;
  roles: string[];
}

export interface SessionRepository {
  findCredentials(username: string): Promise<LoginCredentials | null>;
  findRoles(userId: string): Promise<string[]>;
  createSession(input: {
    sessionId: string;
    userId: string;
    idleTimeoutMinutes: number;
  }): Promise<void>;
  findActiveSession(sessionId: string, userId: string): Promise<ActiveSession | null>;
  refreshSession(sessionId: string, idleTimeoutMinutes: number): Promise<boolean>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
}
