import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest {
  user: {
    userId: string;
    organizationId: string;
    email: string;
  };
}

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest & Partial<AuthenticatedRequest>>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '缺少访问令牌'
      });
    }

    const payload = this.authService.verifyAccessToken(authorization.slice('Bearer '.length));
    request.user = {
      userId: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email
    };

    return true;
  }
}
