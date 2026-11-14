import { Body, Controller, Post } from '@nestjs/common';
import type {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
} from './dto/registration.dto.js';
import { IdentityService } from './identity.service.js';

@Controller('identity')
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
