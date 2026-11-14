import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  clearSessionCookie,
  createSessionCookie,
  SessionService,
} from './session.service.js';
import { extractSessionToken, SessionAuthGuard } from './session-auth.guard.js';
import type { AuthenticatedRequest } from './session-auth.guard.js';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Post()
  async login(
    @Body() body: { username?: unknown; password?: unknown },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.sessions.login(body);
    response.setHeader(
      'Set-Cookie',
      createSessionCookie(result.token, result.idleTimeoutMinutes),
    );
    return {
      ...result.user,
      session_expires_in_seconds: result.idleTimeoutMinutes * 60,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.logout(extractSessionToken(request));
    response.setHeader('Set-Cookie', clearSessionCookie());
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
