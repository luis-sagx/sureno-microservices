import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import type {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
} from './dto/registration.dto.js';
import { IdentityService } from './identity.service.js';
import { IdentityValidationExceptionFilter } from './identity-validation-exception.filter.js';

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
}
