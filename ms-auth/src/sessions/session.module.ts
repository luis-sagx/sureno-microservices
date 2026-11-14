import { Module } from '@nestjs/common';
import { SessionController } from './session.controller.js';
import { RolesGuard, SessionAuthGuard } from './session-auth.guard.js';
import { SessionService } from './session.service.js';
import {
  CREDENTIAL_VERIFIER,
  SESSION_REPOSITORY,
  SESSION_TOKEN_SERVICE,
} from './application/session.tokens.js';
import { TypeOrmSessionRepository } from './infrastructure/persistence/typeorm-session.repository.js';
import { ScryptCredentialVerifier } from './infrastructure/security/scrypt-credential-verifier.js';
import { HmacSessionTokenAdapter } from './infrastructure/security/hmac-session-token.adapter.js';

@Module({
  controllers: [SessionController],
  providers: [
    TypeOrmSessionRepository,
    ScryptCredentialVerifier,
    HmacSessionTokenAdapter,
    { provide: SESSION_REPOSITORY, useExisting: TypeOrmSessionRepository },
    { provide: CREDENTIAL_VERIFIER, useExisting: ScryptCredentialVerifier },
    { provide: SESSION_TOKEN_SERVICE, useExisting: HmacSessionTokenAdapter },
    {
      provide: SessionService,
      useFactory: (
        sessions: TypeOrmSessionRepository,
        credentialVerifier: ScryptCredentialVerifier,
        sessionTokens: HmacSessionTokenAdapter,
      ) => new SessionService(sessions, credentialVerifier, sessionTokens),
      inject: [SESSION_REPOSITORY, CREDENTIAL_VERIFIER, SESSION_TOKEN_SERVICE],
    },
    SessionAuthGuard,
    RolesGuard,
  ],
  exports: [SessionAuthGuard, RolesGuard, SessionService],
})
export class SessionModule {}
