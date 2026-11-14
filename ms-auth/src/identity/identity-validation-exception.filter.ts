import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { IdentityError } from './domain/identity-error.js';

const statusByCode = {
  bad_request: 400,
  conflict: 409,
  not_found: 404,
  internal: 500,
} as const;

const labelByCode = {
  bad_request: 'Bad Request',
  conflict: 'Conflict',
  not_found: 'Not Found',
  internal: 'Internal Server Error',
} as const;

@Catch(IdentityError)
export class IdentityValidationExceptionFilter implements ExceptionFilter {
  catch(exception: IdentityError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusByCode[exception.code];
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: labelByCode[exception.code],
    });
  }
}
