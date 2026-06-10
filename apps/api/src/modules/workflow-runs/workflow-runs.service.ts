import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkflowRunsQueue } from './workflow-runs.queue';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowRunsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkflowRunsQueue) private readonly queue: WorkflowRunsQueue
  ) {}

  async createFromWorkflow(workflowId: string, body: { input?: Record<string, unknown>; workflowSnapshotId?: string }) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: { where: { enabled: true }, orderBy: { orderIndex: 'asc' } }, snapshots: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!workflow) {
      throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow 不存在' });
    }
    if (workflow.nodes.length === 0) {
      throw new BadRequestException({ code: 'WORKFLOW_INVALID', message: 'Workflow 没有可运行节点' });
    }

    const snapshotId = body.workflowSnapshotId ?? workflow.snapshots[0]?.id;
    const run = await this.prisma.workflowRun.create({
      data: {
        projectId: workflow.projectId,
        workflowId,
        workflowSnapshotId: snapshotId,
        source: 'studio',
        status: 'queued',
        initialInput: (body.input ?? {}) as Prisma.InputJsonValue,
        controlState: { outputs: {} }
      }
    });
    await this.queue.enqueue({ workflowRunId: run.id });
    return run;
  }

  async get(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        nodeRuns: { orderBy: { startedAt: 'asc' } },
        artifacts: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!run) {
      throw new NotFoundException({ code: 'WORKFLOW_RUN_NOT_FOUND', message: 'WorkflowRun 不存在' });
    }
    return run;
  }

  async createFromPublishedApp(
    app: { id: string; projectId: string; workflowSnapshotId: string },
    input: Record<string, unknown>
  ) {
    const snapshot = await this.prisma.workflowSnapshot.findUnique({ where: { id: app.workflowSnapshotId } });
    if (!snapshot) {
      throw new NotFoundException({ code: 'WORKFLOW_SNAPSHOT_NOT_FOUND', message: 'WorkflowSnapshot 不存在' });
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        projectId: app.projectId,
        workflowId: snapshot.workflowId,
        workflowSnapshotId: app.workflowSnapshotId,
        publishedAppId: app.id,
        source: 'published_app',
        status: 'queued',
        initialInput: input as Prisma.InputJsonValue,
        controlState: { outputs: {} }
      }
    });
    await this.queue.enqueue({ workflowRunId: run.id });
    return run;
  }

  async rerunNode(runId: string, nodeRunId: string) {
    const nodeRun = await this.prisma.workflowNodeRun.findUnique({ where: { id: nodeRunId } });
    if (!nodeRun || nodeRun.workflowRunId !== runId) {
      throw new NotFoundException({ code: 'NODE_RUN_NOT_FOUND', message: 'NodeRun 不存在' });
    }
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'rerunning', errorSummary: null }
    });
    await this.queue.enqueue({ workflowRunId: runId, retryNodeRunId: nodeRunId });
    return { queued: true };
  }
}
