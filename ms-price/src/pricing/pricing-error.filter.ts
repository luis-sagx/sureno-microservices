import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { PricingError } from './domain/pricing-error.js';

@Catch(PricingError)
export class PricingErrorFilter implements ExceptionFilter {
  catch(error: PricingError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = ({ bad_request: 400, not_found: 404, conflict: 409, unauthorized: 401, forbidden: 403, unavailable: 503 })[error.code];
    response.status(status).json({ statusCode: status, message: error.message });
  }
}
