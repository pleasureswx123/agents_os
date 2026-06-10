import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

describe('Evaluation Lab API', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let agentId: string;
  let agentVersionId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';
    process.env.PROVIDER_KEY_DEFAULT = 'test-provider-key';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'password' }
    });
    accessToken = login.json().data.accessToken;

    const templates = await app.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${accessToken}` }
    });
    const project = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: `Eval E2E ${Date.now()}`, templateVersionId: templates.json().data.items[0].latestVersionId }
    });
    const agents = await app.inject({
      method: 'GET',
      url: `/api/projects/${project.json().data.id}/agents`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    agentId = agents.json().data.items[0].id;
    agentVersionId = agents.json().data.items[0].currentVersionId;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates, runs, scores, and compares test results for agent versions', async () => {
    const testCase = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/test-cases`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: '悬疑短篇测试',
        input: { text: '雨夜，主角发现密信。' },
        expectedNotes: '应输出结构化分析'
      }
    });
    expect(testCase.statusCode).toBe(201);
    const testCaseId = testCase.json().data.id;

    const run = await app.inject({
      method: 'POST',
      url: `/api/test-cases/${testCaseId}/run`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { agentVersionId }
    });
    expect(run.statusCode).toBe(201);
    expect(run.json().data.output).toHaveProperty('mockOutput');

    const scored = await app.inject({
      method: 'PATCH',
      url: `/api/test-results/${run.json().data.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { rating: 'good', notes: '结构稳定' }
    });
    expect(scored.statusCode).toBe(200);
    expect(scored.json().data.rating).toBe('good');

    const results = await app.inject({
      method: 'GET',
      url: `/api/test-cases/${testCaseId}/results`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(results.statusCode).toBe(200);
    expect(results.json().data.items).toHaveLength(1);
  });
});
