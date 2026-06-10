import { createHash } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

interface AuthTokenPayload {
  sub: string;
  organizationId: string;
  email: string;
  tokenType: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.passwordHash !== this.hashPassword(password)) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '邮箱或密码错误'
      });
    }

    return {
      accessToken: this.signToken(user.id, user.organizationId, user.email, 'access'),
      refreshToken: this.signToken(user.id, user.organizationId, user.email, 'refresh'),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId
      }
    };
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyToken(refreshToken, 'refresh');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub }
    });

    return {
      accessToken: this.signToken(user.id, user.organizationId, user.email, 'access'),
      refreshToken: this.signToken(user.id, user.organizationId, user.email, 'refresh')
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true
      }
    });

    return user;
  }

  verifyAccessToken(token: string) {
    return this.verifyToken(token, 'access');
  }

  private hashPassword(password: string) {
    return `sha256:${createHash('sha256').update(password).digest('hex')}`;
  }

  private signToken(
    userId: string,
    organizationId: string,
    email: string,
    tokenType: AuthTokenPayload['tokenType']
  ) {
    const secret =
      tokenType === 'access'
        ? this.config.get<string>('JWT_ACCESS_SECRET', 'dev_access_secret')
        : this.config.get<string>('JWT_REFRESH_SECRET', 'dev_refresh_secret');

    return jwt.sign(
      {
        sub: userId,
        organizationId,
        email,
        tokenType
      },
      secret,
      {
        expiresIn: tokenType === 'access' ? '15m' : '7d'
      }
    );
  }

  private verifyToken(token: string, tokenType: AuthTokenPayload['tokenType']) {
    const secret =
      tokenType === 'access'
        ? this.config.get<string>('JWT_ACCESS_SECRET', 'dev_access_secret')
        : this.config.get<string>('JWT_REFRESH_SECRET', 'dev_refresh_secret');

    try {
      const payload = jwt.verify(token, secret) as AuthTokenPayload;
      if (payload.tokenType !== tokenType) {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token 无效或已过期'
      });
    }
  }
}
