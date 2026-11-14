import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { SessionError } from './domain/session-error.js';

@Catch(SessionError)
export class SessionExceptionFilter implements ExceptionFilter {
  catch(exception: SessionError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(401).json({
      statusCode: 401,
      message: exception.message,
      error: 'Unauthorized',
    });
  }
}
