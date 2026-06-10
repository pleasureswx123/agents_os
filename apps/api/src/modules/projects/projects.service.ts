import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/jwt-access.guard';
import { PrismaService } from '../prisma/prisma.service';

type TemplateSnapshot = {
  agents: Array<{
    key: string;
    name: string;
    description?: string;
    draftConfig: Prisma.InputJsonValue;
    versionName: string;
    outputKey: string;
  }>;
  workflow: {
    name: string;
    description?: string;
    nodes: Array<{
      name: string;
      type: string;
      agentKey: string;
      orderIndex: number;
      position?: Prisma.InputJsonValue;
      inputMapping: Prisma.InputJsonValue;
      outputKey: string;
      allowManualEdit: boolean;
      failurePolicy: string;
      enabled: boolean;
    }>;
  };
};

interface CreateProjectBody {
  name: string;
  description?: string;
  templateVersionId?: string;
}

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listProjects(organizationId: string) {
    const items = await this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { agents: true, workflows: true }
        }
      }
    });

    return { items };
  }

  async createProject(user: AuthenticatedRequest['user'], body: CreateProjectBody) {
    if (!body.templateVersionId) {
      return this.prisma.project.create({
        data: {
          organizationId: user.organizationId,
          createdByUserId: user.userId,
          name: body.name,
          description: body.description
        }
      });
    }

    const templateVersion = await this.prisma.templateVersion.findUnique({
      where: { id: body.templateVersionId }
    });

    if (!templateVersion) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: '模板版本不存在'
      });
    }

    const snapshot = templateVersion.snapshot as TemplateSnapshot;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: user.organizationId,
          createdByUserId: user.userId,
          templateVersionId: templateVersion.id,
          name: body.name,
          description: body.description
        }
      });

      const versionByAgentKey = new Map<string, string>();

      for (const presetAgent of snapshot.agents) {
        const agent = await tx.agent.create({
          data: {
            projectId: project.id,
            name: presetAgent.name,
            description: presetAgent.description,
            draftConfig: presetAgent.draftConfig
          }
        });

        const version = await tx.agentVersion.create({
          data: {
            agentId: agent.id,
            versionName: presetAgent.versionName,
            configSnapshot: presetAgent.draftConfig,
            notes: 'Seeded from TemplateVersion'
          }
        });

        await tx.agent.update({
          where: { id: agent.id },
          data: { currentVersionId: version.id }
        });

        versionByAgentKey.set(presetAgent.key, version.id);
      }

      const workflow = await tx.workflow.create({
        data: {
          projectId: project.id,
          name: snapshot.workflow.name,
          description: snapshot.workflow.description,
          status: 'draft'
        }
      });

      for (const node of snapshot.workflow.nodes) {
        await tx.workflowNode.create({
          data: {
            workflowId: workflow.id,
            orderIndex: node.orderIndex,
            name: node.name,
            type: node.type,
            agentVersionId: versionByAgentKey.get(node.agentKey),
            position: node.position ?? Prisma.JsonNull,
            inputMapping: node.inputMapping,
            outputKey: node.outputKey,
            allowManualEdit: node.allowManualEdit,
            failurePolicy: node.failurePolicy,
            enabled: node.enabled
          }
        });
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        templateVersionId: project.templateVersionId,
        createdAt: project.createdAt
      };
    });
  }

  async getProject(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        agents: { orderBy: { createdAt: 'asc' } },
        workflows: {
          orderBy: { createdAt: 'asc' },
          include: {
            nodes: { orderBy: { orderIndex: 'asc' } }
          }
        }
      }
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: '项目不存在'
      });
    }

    return project;
  }

  async updateProject(organizationId: string, projectId: string, body: { name?: string; description?: string }) {
    await this.getProject(organizationId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name,
        description: body.description
      }
    });
  }

  async deleteProject(organizationId: string, projectId: string) {
    await this.getProject(organizationId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { deleted: true };
  }

  async saveAsTemplate(
    organizationId: string,
    projectId: string,
    body: { name: string; description?: string }
  ) {
    const project = await this.getProject(organizationId, projectId);
    const template = await this.prisma.template.create({
      data: {
        name: body.name,
        description: body.description,
        type: 'custom',
        status: 'active',
        versions: {
          create: {
            versionName: 'v1',
            snapshot: {
              sourceProjectId: project.id,
              agents: project.agents,
              workflows: project.workflows
            }
          }
        }
      },
      include: {
        versions: true
      }
    });

    return template;
  }
}
