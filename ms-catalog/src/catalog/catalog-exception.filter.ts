import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogError } from './domain/catalog-error.js';

const statusByCode = {
  bad_request: 400,
  conflict: 409,
  not_found: 404,
  unauthorized: 401,
  forbidden: 403,
  unavailable: 503,
} as const;

const labelByCode = {
  bad_request: 'Bad Request',
  conflict: 'Conflict',
  not_found: 'Not Found',
  unauthorized: 'Unauthorized',
  forbidden: 'Forbidden',
  unavailable: 'Service Unavailable',
} as const;

@Catch(CatalogError)
export class CatalogExceptionFilter implements ExceptionFilter {
  catch(exception: CatalogError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusByCode[exception.code];
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: labelByCode[exception.code],
    });
  }
}
