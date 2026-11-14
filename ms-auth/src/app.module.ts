import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { IdentityModule } from './identity/identity.module.js';
import { Person } from './identity/entities/person.entity.js';
import { AppUser } from './identity/entities/app-user.entity.js';
import { BusinessAccount } from './identity/entities/business-account.entity.js';
import { Role } from './identity/entities/role.entity.js';
import { UserRole } from './identity/entities/user-role.entity.js';
import { CreateIdentitySchema1700000000000 } from './identity/migrations/1700000000000-CreateIdentitySchema.js';
import { AuthSession } from './identity/entities/auth-session.entity.js';
import { CreateSessionsAndRoles1700000001000 } from './identity/migrations/1700000001000-CreateSessionsAndRoles.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.AUTH_DB_HOST ?? 'localhost',
      port: Number(process.env.AUTH_DB_PORT ?? 5432),
      username: process.env.AUTH_DB_USER ?? 'auth_app',
      password: process.env.AUTH_DB_PASSWORD,
      database: process.env.AUTH_DB_NAME ?? 'auth_db',
      entities: [Person, AppUser, BusinessAccount, Role, UserRole, AuthSession],
      migrations: [CreateIdentitySchema1700000000000, CreateSessionsAndRoles1700000001000],
      migrationsRun: true,
      synchronize: false,
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'ms-auth',
    }),
    IdentityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
