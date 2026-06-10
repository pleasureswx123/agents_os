import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

describe('Workflow Builder API', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let projectId: string;
  let agentVersionId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@example.com', password: 'password' } });
    accessToken = login.json().data.accessToken;
    const templates = await app.inject({ method: 'GET', url: '/api/templates', headers: { authorization: `Bearer ${accessToken}` } });
    const project = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: `Workflow E2E ${Date.now()}`, templateVersionId: templates.json().data.items[0].latestVersionId }
    });
    projectId = project.json().data.id;
    const agents = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/agents`, headers: { authorization: `Bearer ${accessToken}` } });
    agentVersionId = agents.json().data.items[0].currentVersionId;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates workflow nodes and freezes an immutable snapshot', async () => {
    const createdWorkflow = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/workflows`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: '自定义工作流' }
    });
    expect(createdWorkflow.statusCode).toBe(201);
    const workflowId = createdWorkflow.json().data.id;

    const node = await app.inject({
      method: 'POST',
      url: `/api/workflows/${workflowId}/nodes`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: '小说分析',
        type: 'agent',
        agentVersionId,
        position: { x: 120, y: 80 },
        inputMapping: { source: 'workflow_input', path: '$.text', target: 'text' },
        outputKey: 'novel_analysis',
        allowManualEdit: true,
        failurePolicy: 'stop',
        enabled: true
      }
    });
    expect(node.statusCode).toBe(201);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/workflow-nodes/${node.json().data.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { outputKey: 'analysis_v2' }
    });
    expect(patched.json().data.outputKey).toBe('analysis_v2');

    const snapshot = await app.inject({
      method: 'POST',
      url: `/api/workflows/${workflowId}/snapshots`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { versionName: 'publish-v1' }
    });
    expect(snapshot.statusCode).toBe(201);
    expect(snapshot.json().data.snapshot.nodes[0].agentVersionSnapshot.configSnapshot).toBeTruthy();
  });
});
