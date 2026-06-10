import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRunsService } from '../workflow-runs/workflow-runs.service';
import { StorageProvider } from '../object-storage/storage.provider';

@Injectable()
export class PublishedAppsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkflowRunsService) private readonly workflowRuns: WorkflowRunsService,
    @Inject(StorageProvider) private readonly storage: StorageProvider
  ) {}

  async list(projectId: string) {
    const items = await this.prisma.publishedApp.findMany({
      where: { projectId },
      include: { workflowSnapshot: true },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async create(projectId: string, body: Record<string, unknown>) {
    const workflowSnapshotId = String(body.workflowSnapshotId ?? '');
    const snapshot = await this.prisma.workflowSnapshot.findUnique({
      where: { id: workflowSnapshotId },
      include: { workflow: true }
    });
    if (!snapshot || snapshot.workflow.projectId !== projectId) {
      throw new BadRequestException({ code: 'SNAPSHOT_INVALID', message: '必须绑定当前项目下的 WorkflowSnapshot' });
    }

    const slug = String(body.slug ?? '').trim();
    if (!/^[a-z0-9-]{3,64}$/.test(slug)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'slug 只能包含小写字母、数字和短横线，长度 3-64' });
    }

    const existing = await this.prisma.publishedApp.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException({ code: 'SLUG_EXISTS', message: 'Published App slug 已存在' });
    }

    return this.prisma.publishedApp.create({
      data: {
        projectId,
        workflowSnapshotId,
        slug,
        name: String(body.name ?? snapshot.workflow.name),
        description: body.description ? String(body.description) : undefined,
        publicInputSchema: (body.publicInputSchema ?? { type: 'object', required: ['text'] }) as Prisma.InputJsonValue,
        publicParams: (body.publicParams ?? {}) as Prisma.InputJsonValue,
        branding: (body.branding ?? {}) as Prisma.InputJsonValue,
        accessPolicy: (body.accessPolicy ?? { mode: 'public' }) as Prisma.InputJsonValue,
        status: String(body.status ?? 'enabled')
      }
    });
  }

  async getBySlug(slug: string) {
    const app = await this.prisma.publishedApp.findUnique({
      where: { slug },
      include: { workflowSnapshot: true }
    });
    if (!app || app.status !== 'enabled') {
      throw new NotFoundException({ code: 'PUBLISHED_APP_NOT_FOUND', message: 'Published App 不存在或未启用' });
    }
    return app;
  }

  async run(slug: string, body: { input?: Record<string, unknown> }) {
    const app = await this.getBySlug(slug);
    const input = body.input ?? {};
    this.validateInput(app.publicInputSchema as Record<string, unknown>, input);
    const run = await this.workflowRuns.createFromPublishedApp(app, input);
    return {
      workflowRunId: run.id,
      status: run.status
    };
  }

  async getPublicRun(slug: string, runId: string) {
    const app = await this.getBySlug(slug);
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { artifacts: { orderBy: { createdAt: 'desc' } } }
    });
    if (!run || run.publishedAppId !== app.id) {
      throw new NotFoundException({ code: 'WORKFLOW_RUN_NOT_FOUND', message: 'WorkflowRun 不存在' });
    }
    return run;
  }

  async getPublicArtifactDownload(slug: string, artifactId: string) {
    const app = await this.getBySlug(slug);
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
      include: { workflowRun: true }
    });
    if (!artifact || artifact.workflowRun.publishedAppId !== app.id) {
      throw new NotFoundException({ code: 'ARTIFACT_NOT_FOUND', message: 'Artifact 不存在' });
    }
    return {
      artifactId,
      filename: artifact.filename,
      contentType: artifact.contentType,
      url: await this.storage.getDownloadUrl(artifact.objectKey)
    };
  }

  private validateInput(schema: Record<string, unknown>, input: Record<string, unknown>) {
    const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
    const missing = required.filter((key) => input[key] === undefined || input[key] === '');
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '公开应用参数校验失败',
        details: { missing }
      });
    }
  }
}
