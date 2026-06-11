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
    const outputs = (run.controlState as { outputs?: Record<string, unknown> } | null)?.outputs ?? {};
    const nodeRuns = run.nodeRuns.map((nodeRun) => ({
      id: nodeRun.id,
      workflowNodeId: nodeRun.workflowNodeId,
      status: nodeRun.status,
      input: nodeRun.input,
      output: nodeRun.editedOutput ?? nodeRun.output,
      usage: nodeRun.usage,
      startedAt: nodeRun.startedAt,
      finishedAt: nodeRun.finishedAt
    }));
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
      outputs,
      nodeRuns
    };
    const packageFiles = buildMaterialPackageFiles(packageBody);

    const manifest = {
      schemaVersion: 'artifact-manifest.v1',
      projectId: run.projectId,
      projectName: run.project.name,
      workflowRunId: run.id,
      workflowId: run.workflowId,
      workflowSnapshotId: run.workflowSnapshotId,
      generatedAt: new Date().toISOString(),
      nodeRuns: nodeRuns.map((nodeRun) => ({
        workflowNodeRunId: nodeRun.id,
        workflowNodeId: nodeRun.workflowNodeId,
        status: nodeRun.status
      })),
      files: packageFiles.map((file) => file.name)
    };
    const body = createZip(
      packageFiles.map((file) =>
        file.name === 'manifest.json'
          ? { name: file.name, content: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') }
          : file
      )
    );
    const objectKey = `projects/${run.projectId}/runs/${run.id}/package.zip`;
    const stored = await this.storage.putObject({
      objectKey,
      body,
      contentType: 'application/zip'
    });

    const artifact = await this.prisma.artifact.create({
      data: {
        projectId: run.projectId,
        workflowRunId: run.id,
        type: 'material_package',
        objectKey: stored.objectKey,
        filename: 'package.zip',
        contentType: 'application/zip',
        sizeBytes: stored.sizeBytes,
        metadata: { manifest, package: packageBody } as Prisma.InputJsonValue
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

type ZipEntry = {
  name: string;
  content: Buffer;
};

type MaterialPackage = {
  project: { name: string };
  workflowRun: { id: string; initialInput: unknown; finishedAt: Date | null };
  outputs: Record<string, unknown>;
  nodeRuns: Array<{
    id: string;
    workflowNodeId: string | null;
    status: string;
    input: unknown;
    output: unknown;
    usage: unknown;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>;
};

function buildMaterialPackageFiles(packageBody: MaterialPackage): ZipEntry[] {
  const outputJson = JSON.stringify(packageBody.outputs, null, 2);
  const storyText =
    typeof packageBody.workflowRun.initialInput === 'object' && packageBody.workflowRun.initialInput
      ? String((packageBody.workflowRun.initialInput as Record<string, unknown>).text ?? '')
      : '';
  const taskRows = packageBody.nodeRuns.map((nodeRun, index) => ({
    sceneId: `scene_${String(index + 1).padStart(2, '0')}`,
    workflowNodeRunId: nodeRun.id,
    workflowNodeId: nodeRun.workflowNodeId,
    status: nodeRun.status,
    output: nodeRun.output
  }));
  const editPlanRows = [
    'scene_id,source_node_run_id,asset_type,asset_path,notes',
    ...taskRows.map(
      (row) => `${row.sceneId},${row.workflowNodeRunId},json,material-package.json,"Generated from workflow node output"`
    )
  ];

  return [
    {
      name: 'README.md',
      content: text([
        '# Material Package',
        '',
        'This package was generated by Agents OS.',
        '',
        `WorkflowRun: ${packageBody.workflowRun.id}`,
        `Project: ${packageBody.project.name}`,
        '',
        'Open manifest.json for traceability and material-package.json for structured node outputs.'
      ])
    },
    { name: 'manifest.json', content: text('{}') },
    { name: 'material-package.json', content: text(JSON.stringify(packageBody, null, 2)) },
    {
      name: '01_script/storyboard.md',
      content: text(['# Storyboard Draft', '', storyText || 'No source text provided.', '', '```json', outputJson, '```'])
    },
    {
      name: '01_script/narration.md',
      content: text(['# Narration Draft', '', storyText || 'Narration should be refined from material-package.json.'])
    },
    { name: '02_voiceover/voiceover_tasks.json', content: text(JSON.stringify({ tasks: taskRows }, null, 2)) },
    { name: '03_dialogue/dialogue_tasks.json', content: text(JSON.stringify({ tasks: taskRows }, null, 2)) },
    { name: '04_video_clips/video_tasks.json', content: text(JSON.stringify({ tasks: taskRows }, null, 2)) },
    { name: '05_images/image_prompts.json', content: text(JSON.stringify({ prompts: taskRows }, null, 2)) },
    { name: '06_sfx/sfx_tasks.json', content: text(JSON.stringify({ tasks: taskRows }, null, 2)) },
    { name: '07_subtitles/subtitles.srt', content: text(['1', '00:00:00,000 --> 00:00:03,000', storyText || 'Subtitle draft pending.']) },
    { name: 'edit_plan.csv', content: text(editPlanRows) }
  ];
}

function text(lines: string[] | string) {
  return Buffer.from(Array.isArray(lines) ? lines.join('\n') : lines, 'utf8');
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  }
  return (value ^ 0xffffffff) >>> 0;
}

function dosTime(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, day };
}

function createZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { time, day } = dosTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.content.length, 18);
    localHeader.writeUInt32LE(entry.content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, entry.content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.content.length, 20);
    centralHeader.writeUInt32LE(entry.content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + entry.content.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, central, end]);
}
