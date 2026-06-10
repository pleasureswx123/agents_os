import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

describe('Auth API', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in with the seeded admin user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'password'
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.requestId).toMatch(/^req_/);
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));
    expect(body.data.user.email).toBe('admin@example.com');
  });

  it('rejects protected requests without a token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me'
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.requestId).toMatch(/^req_/);
  });

  it('allows protected requests with a valid access token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'password'
      }
    });
    const token = login.json().data.accessToken;

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.email).toBe('admin@example.com');
    expect(body.data.organizationId).toEqual(expect.any(String));
  });
});
