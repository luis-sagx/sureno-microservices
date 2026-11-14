import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import { AdminReviewController } from './admin-review.controller.js';
import { SessionModule } from '../sessions/session.module.js';
import {
  IDENTITY_REPOSITORY,
  PASSWORD_HASHER,
} from './application/identity.tokens.js';
import { TypeOrmIdentityRepository } from './infrastructure/persistence/typeorm-identity.repository.js';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher.js';

@Module({
  imports: [SessionModule],
  controllers: [IdentityController, AdminReviewController],
  providers: [
    TypeOrmIdentityRepository,
    ScryptPasswordHasher,
    { provide: IDENTITY_REPOSITORY, useExisting: TypeOrmIdentityRepository },
    { provide: PASSWORD_HASHER, useExisting: ScryptPasswordHasher },
    {
      provide: IdentityService,
      useFactory: (
        repository: TypeOrmIdentityRepository,
        passwordHasher: ScryptPasswordHasher,
      ) => new IdentityService(repository, passwordHasher),
      inject: [IDENTITY_REPOSITORY, PASSWORD_HASHER],
    },
  ],
})
export class IdentityModule {}
