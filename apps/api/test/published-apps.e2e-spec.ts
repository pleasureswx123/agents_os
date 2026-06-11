import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { workflowRunQueueName, type WorkflowRunJob } from '@agents-os/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

const prisma = new PrismaClient();
const queue = new Queue<WorkflowRunJob>(workflowRunQueueName, {
  connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379', maxRetriesPerRequest: null }
});

describe('Published Apps API', () => {
  let app: NestFastifyApplication;
  let accessToken: string;

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

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'password' }
    });
    accessToken = login.json().data.accessToken;
  });

  afterAll(async () => {
    await queue.close();
    await app?.close();
    await prisma.$disconnect();
  });

  async function createSnapshot() {
    const template = (
      await app.inject({
        method: 'GET',
        url: '/api/templates',
        headers: { authorization: `Bearer ${accessToken}` }
      })
    ).json().data.items[0];
    const project = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: `Published 项目 ${Date.now()}`, templateVersionId: template.latestVersionId }
      })
    ).json().data;
    const workflow = await prisma.workflow.findFirstOrThrow({ where: { projectId: project.id } });
    const snapshot = (
      await app.inject({
        method: 'POST',
        url: `/api/workflows/${workflow.id}/snapshots`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { versionName: 'published-test' }
      })
    ).json().data;
    return { project, snapshot };
  }

  it('publishes a WorkflowSnapshot and queues public runs by slug', async () => {
    const { project, snapshot } = await createSnapshot();
    const slug = `story-app-${Date.now()}`;

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/published-apps`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        workflowSnapshotId: snapshot.id,
        slug,
        name: 'Story Material App',
        publicInputSchema: { type: 'object', required: ['text'] }
      }
    });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().data.workflowSnapshotId).toBe(snapshot.id);

    const publicResponse = await app.inject({ method: 'GET', url: `/api/published-apps/${slug}` });
    expect(publicResponse.statusCode).toBe(200);
    const publicApp = publicResponse.json().data;
    expect(publicApp.name).toBe('Story Material App');
    expect(publicApp.workflowSnapshot).toBeUndefined();
    expect(JSON.stringify(publicApp)).not.toContain('apiKeyRef');
    expect(JSON.stringify(publicApp)).not.toContain('systemPrompt');

    const runResponse = await app.inject({
      method: 'POST',
      url: `/api/published-apps/${slug}/runs`,
      payload: { input: { text: '公开运行文本' } }
    });
    expect(runResponse.statusCode).toBe(201);
    const runId = runResponse.json().data.workflowRunId;
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: runId } });
    expect(run.publishedAppId).toBe(createResponse.json().data.id);
    expect(run.workflowSnapshotId).toBe(snapshot.id);
    expect(run.source).toBe('published_app');
    expect((await queue.getJob(runId))?.data.workflowRunId).toBe(runId);

    const publicRunResponse = await app.inject({ method: 'GET', url: `/api/published-apps/${slug}/runs/${runId}` });
    expect(publicRunResponse.statusCode).toBe(200);
    const publicRun = publicRunResponse.json().data;
    expect(publicRun.id).toBe(runId);
    expect(publicRun.initialInput).toBeUndefined();
    expect(publicRun.controlState).toBeUndefined();

    await prisma.workflowRun.update({ where: { id: runId }, data: { status: 'succeeded', finishedAt: new Date() } });
    await prisma.workflowNodeRun.create({
      data: {
        workflowRunId: runId,
        workflowNodeId: null,
        status: 'succeeded',
        input: { text: '公开运行文本' },
        output: { material: 'package' },
        finishedAt: new Date()
      }
    });

    const exportResponse = await app.inject({ method: 'POST', url: `/api/published-apps/${slug}/runs/${runId}/export` });
    expect(exportResponse.statusCode).toBe(201);
    const artifact = exportResponse.json().data;
    expect(artifact.workflowRunId).toBe(runId);

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/api/published-apps/${slug}/artifacts/${artifact.id}/download`
    });
    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.json().data.url).toContain('/package.zip');
  });
});
