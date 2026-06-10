import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    const items = await this.prisma.workflow.findMany({
      where: { projectId },
      include: { nodes: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { createdAt: 'asc' }
    });
    return { items };
  }

  async create(projectId: string, body: Record<string, unknown>) {
    return this.prisma.workflow.create({
      data: {
        projectId,
        name: String(body.name),
        description: body.description ? String(body.description) : undefined,
        status: 'draft'
      }
    });
  }

  async get(workflowId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: { orderBy: { orderIndex: 'asc' }, include: { agentVersion: true } },
        snapshots: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!workflow) {
      throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow 不存在' });
    }
    return workflow;
  }

  async update(workflowId: string, body: Record<string, unknown>) {
    await this.get(workflowId);
    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: body.name ? String(body.name) : undefined,
        description: body.description === undefined ? undefined : String(body.description),
        status: body.status ? String(body.status) : undefined
      }
    });
  }

  async delete(workflowId: string) {
    await this.get(workflowId);
    await this.prisma.workflow.delete({ where: { id: workflowId } });
    return { deleted: true };
  }

  async createNode(workflowId: string, body: Record<string, unknown>) {
    await this.get(workflowId);
    const orderIndex =
      typeof body.orderIndex === 'number'
        ? body.orderIndex
        : (await this.prisma.workflowNode.count({ where: { workflowId } })) + 1;

    return this.prisma.workflowNode.create({
      data: {
        workflowId,
        orderIndex,
        name: String(body.name),
        type: String(body.type ?? 'agent'),
        agentVersionId: body.agentVersionId ? String(body.agentVersionId) : undefined,
        position: (body.position as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        inputMapping: body.inputMapping as Prisma.InputJsonValue,
        outputKey: String(body.outputKey),
        allowManualEdit: body.allowManualEdit !== false,
        failurePolicy: String(body.failurePolicy ?? 'stop'),
        enabled: body.enabled !== false
      }
    });
  }

  async updateNode(nodeId: string, body: Record<string, unknown>) {
    return this.prisma.workflowNode.update({
      where: { id: nodeId },
      data: {
        orderIndex: typeof body.orderIndex === 'number' ? body.orderIndex : undefined,
        name: body.name ? String(body.name) : undefined,
        type: body.type ? String(body.type) : undefined,
        agentVersionId: body.agentVersionId ? String(body.agentVersionId) : undefined,
        position: body.position as Prisma.InputJsonValue | undefined,
        inputMapping: body.inputMapping as Prisma.InputJsonValue | undefined,
        outputKey: body.outputKey ? String(body.outputKey) : undefined,
        allowManualEdit: typeof body.allowManualEdit === 'boolean' ? body.allowManualEdit : undefined,
        failurePolicy: body.failurePolicy ? String(body.failurePolicy) : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined
      }
    });
  }

  async deleteNode(nodeId: string) {
    await this.prisma.workflowNode.delete({ where: { id: nodeId } });
    return { deleted: true };
  }

  async createSnapshot(workflowId: string, body: { versionName: string; notes?: string }) {
    const workflow = await this.get(workflowId);
    const enabledNodes = workflow.nodes.filter((node) => node.enabled);

    for (const node of enabledNodes) {
      if (!node.type || !node.inputMapping || !node.outputKey) {
        throw new BadRequestException({ code: 'WORKFLOW_INVALID', message: '节点配置不完整' });
      }
      if (node.type === 'agent' && !node.agentVersionId) {
        throw new BadRequestException({ code: 'WORKFLOW_INVALID', message: 'Agent 节点缺少 AgentVersion' });
      }
    }

    const snapshot = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description
      },
      nodes: workflow.nodes.map((node) => ({
        id: node.id,
        orderIndex: node.orderIndex,
        name: node.name,
        type: node.type,
        agentVersionId: node.agentVersionId,
        agentVersionSnapshot: node.agentVersion
          ? {
              id: node.agentVersion.id,
              versionName: node.agentVersion.versionName,
              configSnapshot: node.agentVersion.configSnapshot
            }
          : null,
        inputMapping: node.inputMapping,
        outputKey: node.outputKey,
        allowManualEdit: node.allowManualEdit,
        failurePolicy: node.failurePolicy,
        enabled: node.enabled
      }))
    };

    const created = await this.prisma.workflowSnapshot.create({
      data: {
        workflowId,
        versionName: body.versionName,
        notes: body.notes,
        snapshot
      }
    });

    await this.prisma.workflow.update({ where: { id: workflowId }, data: { status: 'published' } });
    return created;
  }
}
