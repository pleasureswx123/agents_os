import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

describe('Agent Studio backend', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let projectId: string;
  let agentId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';
    process.env.PROVIDER_KEY_DEFAULT = 'test-provider-key';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

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
    const templateVersionId = templates.json().data.items[0].latestVersionId;
    const project = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: `Agent E2E ${Date.now()}`, templateVersionId }
    });
    projectId = project.json().data.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lists, creates, updates and copies agents', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/agents`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().data.items).toHaveLength(6);
    agentId = list.json().data.items[0].id;

    const created = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/agents`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: '自定义测试智能体',
        draftConfig: list.json().data.items[0].draftConfig
      }
    });
    expect(created.statusCode).toBe(201);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/agents/${created.json().data.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: '自定义测试智能体 v2' }
    });
    expect(patched.json().data.name).toBe('自定义测试智能体 v2');

    const copied = await app.inject({
      method: 'POST',
      url: `/api/agents/${created.json().data.id}/copy`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(copied.statusCode).toBe(201);
    expect(copied.json().data.name).toContain('Copy');
  });

  it('blocks deleting an agent referenced by a workflow node', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/agents/${agentId}`,
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('AGENT_IN_USE');
  });

  it('creates immutable agent versions and restores one to draft', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/versions`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { versionName: 'e2e-stable', notes: 'stable in test' }
    });
    expect(created.statusCode).toBe(201);
    const versionId = created.json().data.id;

    const version = await app.inject({
      method: 'GET',
      url: `/api/agent-versions/${versionId}`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(version.json().data.configSnapshot).toHaveProperty('systemPrompt');

    const restored = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/restore-version`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { agentVersionId: versionId }
    });
    expect(restored.statusCode).toBe(201);
    expect(restored.json().data.draftConfig).toEqual(version.json().data.configSnapshot);
  });

  it('runs chat tests and preserves raw text when JSON parsing fails', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/chat`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        input: { text: '一段测试故事' }
      }
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().data.output).toHaveProperty('mockOutput');
    expect(ok.json().data.parseError).toBeNull();

    const failedParse = await app.inject({
      method: 'POST',
      url: `/api/agents/${agentId}/chat`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        input: { text: '一段测试故事', forceInvalidJson: true }
      }
    });
    expect(failedParse.statusCode).toBe(201);
    expect(failedParse.json().data.output).toBeNull();
    expect(failedParse.json().data.rawText).toBe('not-json');
    expect(failedParse.json().data.parseError).toContain('Unexpected');
  });
});
