export interface SessionTokenPayload {
  sid: string;
  sub: string;
}

export interface IssuedSessionToken {
  sessionId: string;
  token: string;
}

export interface SessionTokenService {
  issue(userId: string): Promise<IssuedSessionToken>;
  verify(token: string): SessionTokenPayload;
}
