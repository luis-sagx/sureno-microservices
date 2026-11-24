import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
  UpdateBusinessAccountSettingsDto,
} from './dto/registration.dto.js';
import { IdentityService } from './identity.service.js';
import { IdentityValidationExceptionFilter } from './identity-validation-exception.filter.js';
import { SessionAuthGuard, type AuthenticatedRequest } from '../sessions/session-auth.guard.js';

@Controller('identity')
@UseFilters(IdentityValidationExceptionFilter)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('individuals')
  registerIndividual(@Body() body: RegisterIndividualDto) {
    return this.identityService.registerIndividual(body);
  }

  @Post('business-requests')
  requestBusinessAccount(@Body() body: RequestBusinessAccountDto) {
    return this.identityService.requestBusinessAccount(body);
  }

  @Get('me/business-account')
  @UseGuards(SessionAuthGuard)
  getMyBusinessAccountSettings(@Req() request: AuthenticatedRequest) {
    return this.identityService.getBusinessAccountSettings(request.user!.userId);
  }

  @Patch('me/business-account')
  @UseGuards(SessionAuthGuard)
  updateMyBusinessAccountSettings(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateBusinessAccountSettingsDto,
  ) {
    return this.identityService.updateBusinessCommercialName(
      request.user!.userId,
      { nombre_comercial: body?.nombre_comercial },
    );
  }
}
