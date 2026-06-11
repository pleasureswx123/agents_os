import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { createWorkflowWorker, executeRun } from './main.js';

const prisma = new PrismaClient();

describe('workflow worker bootstrap', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a BullMQ worker bound to the workflow queue', async () => {
    const worker = createWorkflowWorker();
    expect(worker.name).toBe('agents-os.workflow-runs');
    await worker.close();
  });

  it('skips failed nodes with skip policy and records usage for successful nodes', async () => {
    process.env.PROVIDER_KEY_DEFAULT ??= 'test-provider-key';
    const suffix = Date.now();
    const skipNodeId = `skip_node_${suffix}`;
    const successNodeId = `success_node_${suffix}`;
    const organization = await prisma.organization.create({ data: { name: `Worker Test Org ${suffix}` } });
    const project = await prisma.project.create({
      data: { organizationId: organization.id, name: `Worker Test Project ${suffix}` }
    });
    const workflow = await prisma.workflow.create({
      data: { projectId: project.id, name: `Worker Test Workflow ${suffix}` }
    });
    await prisma.workflowNode.createMany({
      data: [
        {
          id: skipNodeId,
          workflowId: workflow.id,
          orderIndex: 1,
          name: 'Skip node',
          type: 'agent',
          inputMapping: { source: 'workflow_input', path: '$', target: 'forceInvalidJson' },
          outputKey: 'skip_output',
          allowManualEdit: false,
          failurePolicy: 'skip',
          enabled: true
        },
        {
          id: successNodeId,
          workflowId: workflow.id,
          orderIndex: 2,
          name: 'Success node',
          type: 'agent',
          inputMapping: { source: 'workflow_input', path: '$.text', target: 'text' },
          outputKey: 'success_output',
          allowManualEdit: false,
          failurePolicy: 'stop',
          enabled: true
        }
      ]
    });
    const snapshot = await prisma.workflowSnapshot.create({
      data: {
        workflowId: workflow.id,
        versionName: 'worker-test',
        snapshot: {
          nodes: [
            {
              id: skipNodeId,
              name: 'Skip node',
              type: 'agent',
              inputMapping: { source: 'workflow_input', path: '$', target: 'forceInvalidJson' },
              outputKey: 'skip_output',
              allowManualEdit: false,
              failurePolicy: 'skip',
              enabled: true,
              agentVersionSnapshot: {
                configSnapshot: {
                  systemPrompt: 'skip',
                  provider: { apiKeyRef: 'PROVIDER_KEY_DEFAULT', modelId: 'mock-model' },
                  runtimeParams: { responseFormat: 'json' }
                }
              }
            },
            {
              id: successNodeId,
              name: 'Success node',
              type: 'agent',
              inputMapping: { source: 'workflow_input', path: '$.text', target: 'text' },
              outputKey: 'success_output',
              allowManualEdit: false,
              failurePolicy: 'stop',
              enabled: true,
              agentVersionSnapshot: {
                configSnapshot: {
                  systemPrompt: 'success',
                  provider: { apiKeyRef: 'PROVIDER_KEY_DEFAULT', modelId: 'mock-model' },
                  runtimeParams: { responseFormat: 'json' }
                }
              }
            }
          ]
        }
      }
    });
    const run = await prisma.workflowRun.create({
      data: {
        projectId: project.id,
        workflowId: workflow.id,
        workflowSnapshotId: snapshot.id,
        source: 'studio',
        status: 'queued',
        initialInput: { text: 'worker story' },
        controlState: { outputs: {} }
      }
    });

    await executeRun({ workflowRunId: run.id });

    const updatedRun = await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
    const nodeRuns = await prisma.workflowNodeRun.findMany({ where: { workflowRunId: run.id }, orderBy: { startedAt: 'asc' } });
    const usageRecords = await prisma.usageRecord.findMany({ where: { workflowRunId: run.id } });
    expect(updatedRun.status).toBe('succeeded');
    expect(nodeRuns.map((nodeRun) => nodeRun.status)).toEqual(['skipped', 'succeeded']);
    expect(usageRecords).toHaveLength(1);
    expect(usageRecords[0].modelId).toBe('mock-model');
  });
});
