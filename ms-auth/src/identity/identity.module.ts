import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import { AdminReviewController } from './admin-review.controller.js';
import { SessionModule } from '../sessions/session.module.js';

@Module({
  imports: [SessionModule],
  controllers: [IdentityController, AdminReviewController],
  providers: [IdentityService],
})
export class IdentityModule {}
