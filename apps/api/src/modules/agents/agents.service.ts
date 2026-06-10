import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    const items = await this.prisma.agent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });
    return { items };
  }

  async create(projectId: string, body: Record<string, unknown>) {
    return this.prisma.agent.create({
      data: {
        projectId,
        name: String(body.name),
        description: body.description ? String(body.description) : undefined,
        draftConfig: body.draftConfig as Prisma.InputJsonValue
      }
    });
  }

  async get(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { versions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!agent) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' });
    }
    return agent;
  }

  async update(agentId: string, body: Record<string, unknown>) {
    await this.get(agentId);
    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        name: body.name ? String(body.name) : undefined,
        description: body.description === undefined ? undefined : String(body.description),
        draftConfig: body.draftConfig as Prisma.InputJsonValue | undefined
      }
    });
  }

  async copy(agentId: string) {
    const agent = await this.get(agentId);
    return this.prisma.agent.create({
      data: {
        projectId: agent.projectId,
        name: `${agent.name} Copy`,
        description: agent.description,
        draftConfig: agent.draftConfig as Prisma.InputJsonValue
      }
    });
  }

  async delete(agentId: string) {
    const agent = await this.get(agentId);
    const references = await this.prisma.workflowNode.findMany({
      where: {
        agentVersion: {
          agentId
        }
      },
      include: {
        workflow: true
      }
    });

    if (references.length > 0) {
      throw new ConflictException({
        code: 'AGENT_IN_USE',
        message: 'Agent 正在被工作流节点引用',
        details: {
          references: references.map((reference) => ({
            workflowId: reference.workflowId,
            workflowNodeId: reference.id,
            nodeName: reference.name,
            workflowName: reference.workflow.name
          }))
        }
      });
    }

    await this.prisma.agent.delete({ where: { id: agent.id } });
    return { deleted: true };
  }
}
