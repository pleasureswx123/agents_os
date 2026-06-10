import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTemplates() {
    const templates = await this.prisma.template.findMany({
      where: { status: 'active' },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      items: templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        status: template.status,
        latestVersionId: template.versions[0]?.id ?? null
      }))
    };
  }

  async getTemplateVersion(templateId: string, versionId: string) {
    const version = await this.prisma.templateVersion.findFirst({
      where: {
        id: versionId,
        templateId
      },
      include: {
        template: true
      }
    });

    if (!version) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: '模板版本不存在'
      });
    }

    return version;
  }
}
