import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

const prisma = new PrismaClient();

describe('Artifact Export API', () => {
  let app: NestFastifyApplication;
  let accessToken: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';
    process.env.S3_ENDPOINT ??= 'http://localhost:9000';
    process.env.S3_ACCESS_KEY_ID ??= 'agents_os';
    process.env.S3_SECRET_ACCESS_KEY ??= 'agents_os_password';
    process.env.S3_BUCKET ??= 'agents-os-test';

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
    await app?.close();
    await prisma.$disconnect();
  });

  async function createSucceededRun() {
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
        payload: { name: `Export 项目 ${Date.now()}`, templateVersionId: template.latestVersionId }
      })
    ).json().data;
    const workflow = await prisma.workflow.findFirstOrThrow({ where: { projectId: project.id } });
    const run = await prisma.workflowRun.create({
      data: {
        projectId: project.id,
        workflowId: workflow.id,
        source: 'studio',
        status: 'succeeded',
        initialInput: { text: '小说正文' },
        controlState: {
          outputs: {
            novel_analysis: { title: '测试故事' }
          }
        },
        finishedAt: new Date()
      }
    });
    await prisma.workflowNodeRun.create({
      data: {
        workflowRunId: run.id,
        status: 'succeeded',
        input: { text: '小说正文' },
        output: { novel_analysis: { title: '测试故事' } },
        startedAt: new Date(),
        finishedAt: new Date()
      }
    });
    return run;
  }

  it('exports a succeeded workflow run to S3-compatible storage and returns a download URL', async () => {
    const run = await createSucceededRun();

    const exportResponse = await app.inject({
      method: 'POST',
      url: `/api/workflow-runs/${run.id}/export`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(exportResponse.statusCode).toBe(201);
    const artifact = exportResponse.json().data;
    expect(artifact.type).toBe('material_package');
    expect(artifact.objectKey).toContain(run.id);
    expect(artifact.objectKey).toContain('package.zip');
    expect(artifact.filename).toBe('package.zip');
    expect(artifact.contentType).toBe('application/zip');

    const updatedRun = await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(updatedRun.status).toBe('exported');

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/api/artifacts/${artifact.id}/download`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.json().data.url).toContain('X-Amz-Signature');
  });
});
