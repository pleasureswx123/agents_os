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

  async updateEditedOutput(runId: string, nodeRunId: string, body: { editedOutput?: unknown }) {
    const nodeRun = await this.prisma.workflowNodeRun.findUnique({
      where: { id: nodeRunId },
      include: { workflowRun: true, workflowNode: true }
    });
    if (!nodeRun || nodeRun.workflowRunId !== runId) {
      throw new NotFoundException({ code: 'NODE_RUN_NOT_FOUND', message: 'NodeRun 不存在' });
    }
    if (nodeRun.status !== 'succeeded') {
      throw new BadRequestException({ code: 'NODE_RUN_NOT_EDITABLE', message: '只有成功完成的 NodeRun 可以编辑输出' });
    }

    const editedOutput = body.editedOutput ?? {};
    const state = (nodeRun.workflowRun.controlState as { outputs?: Record<string, unknown> } | null) ?? { outputs: {} };
    const outputs = { ...(state.outputs ?? {}) };
    const outputKey = nodeRun.workflowNode?.outputKey;
    if (outputKey) {
      outputs[outputKey] = editedOutput;
    }

    const updated = await this.prisma.workflowNodeRun.update({
      where: { id: nodeRunId },
      data: { editedOutput: editedOutput as Prisma.InputJsonValue }
    });
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { controlState: { ...state, outputs } as Prisma.InputJsonValue }
    });
    return updated;
  }

  async control(runId: string, body: { command?: string }) {
    if (body.command !== 'continue') {
      throw new BadRequestException({ code: 'RUN_CONTROL_UNSUPPORTED', message: '仅支持 continue 控制命令' });
    }

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { nodeRuns: { where: { status: 'succeeded' }, orderBy: { finishedAt: 'desc' }, take: 1 } }
    });
    if (!run) {
      throw new NotFoundException({ code: 'WORKFLOW_RUN_NOT_FOUND', message: 'WorkflowRun 不存在' });
    }
    if (run.status !== 'waiting_for_human_edit') {
      throw new BadRequestException({ code: 'RUN_NOT_WAITING_FOR_EDIT', message: 'WorkflowRun 当前不在人工编辑等待状态' });
    }
    const lastNodeRun = run.nodeRuns[0];
    if (!lastNodeRun) {
      throw new BadRequestException({ code: 'RUN_CONTROL_STATE_INVALID', message: '缺少可继续的 NodeRun' });
    }

    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'queued', errorSummary: null }
    });
    await this.queue.enqueue({ workflowRunId: runId, continueAfterNodeRunId: lastNodeRun.id });
    return { queued: true, continueAfterNodeRunId: lastNodeRun.id };
  }
}
