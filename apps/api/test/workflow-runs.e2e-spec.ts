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

describe('Workflow Runs API', () => {
  let app: NestFastifyApplication;
  let accessToken: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'dev_access_secret';
    process.env.JWT_REFRESH_SECRET ??= 'dev_refresh_secret';
    process.env.PROVIDER_KEY_DEFAULT ??= 'test-provider-key';

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

  async function createProjectWorkflow() {
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
        payload: {
          name: `Runner 项目 ${Date.now()}`,
          templateVersionId: template.latestVersionId
        }
      })
    ).json().data;

    const workflow = await prisma.workflow.findFirstOrThrow({
      where: { projectId: project.id },
      include: { nodes: { include: { agentVersion: true }, orderBy: { orderIndex: 'asc' } } }
    });
    const snapshotResponse = await app.inject({
      method: 'POST',
      url: `/api/workflows/${workflow.id}/snapshots`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { versionName: 'runner-test' }
    });
    expect(snapshotResponse.statusCode).toBe(201);
    return { project, workflow, snapshot: snapshotResponse.json().data };
  }

  it('queues a workflow run against a WorkflowSnapshot', async () => {
    const { workflow, snapshot } = await createProjectWorkflow();

    const response = await app.inject({
      method: 'POST',
      url: `/api/workflows/${workflow.id}/runs`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { input: { text: '测试小说正文' }, workflowSnapshotId: snapshot.id }
    });

    expect(response.statusCode).toBe(201);
    const run = response.json().data;
    expect(run.status).toBe('queued');
    expect(run.workflowSnapshotId).toBe(snapshot.id);

    const job = await queue.getJob(run.id);
    expect(job?.data.workflowRunId).toBe(run.id);
  });

  it('queues a failed node rerun without mutating the original node run', async () => {
    const { workflow, snapshot } = await createProjectWorkflow();
    const run = await prisma.workflowRun.create({
      data: {
        projectId: workflow.projectId,
        workflowId: workflow.id,
        workflowSnapshotId: snapshot.id,
        source: 'studio',
        status: 'failed',
        initialInput: { text: '失败后重跑' },
        errorSummary: 'node failed'
      }
    });
    const failedNodeRun = await prisma.workflowNodeRun.create({
      data: {
        workflowRunId: run.id,
        workflowNodeId: workflow.nodes[0].id,
        status: 'failed',
        input: { text: '失败后重跑' },
        error: { message: 'boom' }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/workflow-runs/${run.id}/node-runs/${failedNodeRun.id}/rerun`,
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(response.statusCode).toBe(201);
    const updated = await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(updated.status).toBe('rerunning');
    const job = await queue.getJob(`${run.id}__retry__${failedNodeRun.id}`);
    expect(job?.data.retryNodeRunId).toBe(failedNodeRun.id);
  });

  it('saves edited node output and queues a continue control job', async () => {
    const { workflow, snapshot } = await createProjectWorkflow();
    const run = await prisma.workflowRun.create({
      data: {
        projectId: workflow.projectId,
        workflowId: workflow.id,
        workflowSnapshotId: snapshot.id,
        source: 'studio',
        status: 'waiting_for_human_edit',
        initialInput: { text: '人工编辑继续' },
        controlState: { outputs: { [workflow.nodes[0].outputKey]: { draft: true } } }
      }
    });
    const nodeRun = await prisma.workflowNodeRun.create({
      data: {
        workflowRunId: run.id,
        workflowNodeId: workflow.nodes[0].id,
        status: 'succeeded',
        input: { text: '人工编辑继续' },
        output: { draft: true },
        finishedAt: new Date()
      }
    });

    const editedResponse = await app.inject({
      method: 'PATCH',
      url: `/api/workflow-runs/${run.id}/node-runs/${nodeRun.id}/edited-output`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { editedOutput: { approved: true } }
    });
    expect(editedResponse.statusCode).toBe(200);
    const editedRun = await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
    expect((editedRun.controlState as { outputs: Record<string, unknown> }).outputs[workflow.nodes[0].outputKey]).toEqual({
      approved: true
    });

    const controlResponse = await app.inject({
      method: 'POST',
      url: `/api/workflow-runs/${run.id}/control`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { command: 'continue' }
    });
    expect(controlResponse.statusCode).toBe(201);
    const job = await queue.getJob(`${run.id}__continue__${nodeRun.id}`);
    expect(job?.data.continueAfterNodeRunId).toBe(nodeRun.id);
  });
});
