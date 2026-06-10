import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageProvider } from '../object-storage/storage.provider';

@Injectable()
export class ArtifactsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageProvider) private readonly storage: StorageProvider
  ) {}

  async exportRun(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        nodeRuns: { orderBy: { startedAt: 'asc' } },
        workflow: true,
        workflowSnapshot: true,
        project: true
      }
    });
    if (!run) {
      throw new NotFoundException({ code: 'WORKFLOW_RUN_NOT_FOUND', message: 'WorkflowRun 不存在' });
    }
    if (run.status !== 'succeeded' && run.status !== 'exported') {
      throw new BadRequestException({ code: 'RUN_NOT_EXPORTABLE', message: '只有成功完成的 WorkflowRun 可以导出' });
    }

    await this.prisma.workflowRun.update({ where: { id: runId }, data: { status: 'exporting' } });
    const packageBody = {
      schemaVersion: 'material-package.v1',
      project: {
        id: run.projectId,
        name: run.project.name
      },
      workflow: {
        id: run.workflowId,
        name: run.workflow?.name ?? (run.workflowSnapshot?.snapshot as { workflow?: { name?: string } } | null)?.workflow?.name
      },
      workflowRun: {
        id: run.id,
        source: run.source,
        initialInput: run.initialInput,
        finishedAt: run.finishedAt
      },
      outputs: (run.controlState as { outputs?: Record<string, unknown> } | null)?.outputs ?? {},
      nodeRuns: run.nodeRuns.map((nodeRun) => ({
        id: nodeRun.id,
        workflowNodeId: nodeRun.workflowNodeId,
        status: nodeRun.status,
        input: nodeRun.input,
        output: nodeRun.editedOutput ?? nodeRun.output,
        usage: nodeRun.usage,
        startedAt: nodeRun.startedAt,
        finishedAt: nodeRun.finishedAt
      }))
    };

    const body = Buffer.from(JSON.stringify(packageBody, null, 2), 'utf8');
    const objectKey = `projects/${run.projectId}/runs/${run.id}/material-package.json`;
    const stored = await this.storage.putObject({
      objectKey,
      body,
      contentType: 'application/json'
    });

    const artifact = await this.prisma.artifact.create({
      data: {
        projectId: run.projectId,
        workflowRunId: run.id,
        type: 'material_package',
        objectKey: stored.objectKey,
        filename: 'material-package.json',
        contentType: 'application/json',
        sizeBytes: stored.sizeBytes,
        metadata: packageBody as Prisma.InputJsonValue
      }
    });

    await this.prisma.workflowRun.update({ where: { id: runId }, data: { status: 'exported' } });
    return artifact;
  }

  async getDownload(artifactId: string) {
    const artifact = await this.prisma.artifact.findUnique({ where: { id: artifactId } });
    if (!artifact) {
      throw new NotFoundException({ code: 'ARTIFACT_NOT_FOUND', message: 'Artifact 不存在' });
    }
    return {
      artifactId,
      filename: artifact.filename,
      contentType: artifact.contentType,
      url: await this.storage.getDownloadUrl(artifact.objectKey)
    };
  }
}
