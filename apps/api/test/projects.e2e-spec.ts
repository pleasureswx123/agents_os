import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

const prisma = new PrismaClient();

describe('Templates and Projects API', () => {
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
    await app?.close();
    await prisma.$disconnect();
  });

  it('creates a project from the system template with six agents and one workflow', async () => {
    const templatesResponse = await app.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(templatesResponse.statusCode).toBe(200);
    const template = templatesResponse.json().data.items[0];

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: `E2E 小说项目 ${Date.now()}`,
        description: 'created by projects.e2e-spec',
        templateVersionId: template.latestVersionId
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const projectId = createResponse.json().data.id;

    const [agentCount, workflowCount, templateVersion] = await Promise.all([
      prisma.agent.count({ where: { projectId } }),
      prisma.workflow.count({ where: { projectId } }),
      prisma.templateVersion.findUniqueOrThrow({ where: { id: template.latestVersionId } })
    ]);

    expect(agentCount).toBe(6);
    expect(workflowCount).toBe(1);

    const projectDetail = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(projectDetail.statusCode).toBe(200);
    expect(projectDetail.json().data.agents).toHaveLength(6);
    expect(projectDetail.json().data.workflows).toHaveLength(1);
    expect(templateVersion.snapshot).toHaveProperty('agents');
  });
});
