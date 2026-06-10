import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentVersionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(agentId: string, body: { versionName: string; notes?: string }) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' });
    }

    const version = await this.prisma.agentVersion.create({
      data: {
        agentId,
        versionName: body.versionName,
        notes: body.notes,
        configSnapshot: agent.draftConfig as Prisma.InputJsonValue
      }
    });

    await this.prisma.agent.update({
      where: { id: agentId },
      data: { currentVersionId: version.id }
    });

    return version;
  }

  async list(agentId: string) {
    const items = await this.prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async get(versionId: string) {
    const version = await this.prisma.agentVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException({ code: 'AGENT_VERSION_NOT_FOUND', message: 'AgentVersion 不存在' });
    }
    return version;
  }

  async restore(agentId: string, versionId: string) {
    const version = await this.get(versionId);
    if (version.agentId !== agentId) {
      throw new NotFoundException({ code: 'AGENT_VERSION_NOT_FOUND', message: 'AgentVersion 不存在' });
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        draftConfig: version.configSnapshot as Prisma.InputJsonValue,
        currentVersionId: version.id
      }
    });
  }
}
