export { SessionService } from './application/session.service.js';
export type {
  AuthenticatedSession,
  SessionPrincipal,
} from './application/session.service.js';
export { HmacSessionTokenAdapter } from './infrastructure/security/hmac-session-token.adapter.js';

export const SESSION_COOKIE_NAME = 'sureno_session';
export const CUSTOMER_IDLE_TIMEOUT_MINUTES = 30;
export const ADMIN_IDLE_TIMEOUT_MINUTES = 15;

export function createSessionCookie(
  token: string,
  idleTimeoutMinutes: number,
): string {
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.AUTH_COOKIE_SECURE === 'true';
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
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.AUTH_COOKIE_SECURE === 'true';
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
