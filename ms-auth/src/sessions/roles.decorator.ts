import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES } from './session-auth.guard.js';

export const Roles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES, roles);
