import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { JwtAccessGuard, type AuthenticatedRequest } from './jwt-access.guard';

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshBody) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  async logout() {
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@Req() request: FastifyRequest & AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.userId);
  }
}
