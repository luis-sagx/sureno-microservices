import { Module } from '@nestjs/common';
import { SessionController } from './session.controller.js';
import { RolesGuard, SessionAuthGuard } from './session-auth.guard.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [SessionController],
  providers: [SessionService, SessionAuthGuard, RolesGuard],
  exports: [SessionAuthGuard, RolesGuard, SessionService],
})
export class SessionModule {}
