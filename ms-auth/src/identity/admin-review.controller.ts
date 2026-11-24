import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import {
  RolesGuard,
  SessionAuthGuard,
} from '../sessions/session-auth.guard.js';
import type { AuthenticatedRequest } from '../sessions/session-auth.guard.js';
import { Roles } from '../sessions/roles.decorator.js';
import { IdentityValidationExceptionFilter } from './identity-validation-exception.filter.js';

type ReviewDecision = 'APPROVED' | 'REJECTED';

function validateDecision(value: unknown): ReviewDecision {
  if (value !== 'APPROVED' && value !== 'REJECTED') {
    throw new BadRequestException('La decisión debe ser APPROVED o REJECTED.');
  }
  return value;
}

@Controller('identity/admin')
@UseFilters(IdentityValidationExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReviewController {
  constructor(private readonly identity: IdentityService) {}

  @Get('pending-reviews')
  listPendingReviews() {
    return this.identity.listPendingReviews();
  }

  @Patch('people/:personId/verification')
  reviewPerson(
    @Param('personId') personId: string,
    @Body() body: { decision?: unknown },
  ) {
    return this.identity.reviewPersonVerification(
      personId,
      validateDecision(body?.decision),
    );
  }

  @Patch('business-accounts/:businessAccountId/review')
  reviewBusinessAccount(
    @Param('businessAccountId') businessAccountId: string,
    @Body() body: { decision?: unknown; reason?: unknown },
    @Req() request: AuthenticatedRequest,
  ) {
    const decision = validateDecision(body?.decision);
    if (body?.reason !== undefined && typeof body.reason !== 'string') {
      throw new BadRequestException('El motivo debe ser texto.');
    }
    const reviewerUserId = request.user?.userId;
    if (!reviewerUserId)
      throw new BadRequestException('No se encontró el usuario revisor.');
    return this.identity.reviewBusinessAccount(
      businessAccountId,
      decision,
      body.reason as string | undefined,
      reviewerUserId,
    );
  }
}
