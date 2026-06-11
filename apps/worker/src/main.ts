import { PrismaClient, Prisma } from '@prisma/client';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import {
  runEventsRedisChannel,
  workflowRunQueueName,
  type WorkflowRunJob
} from '@agents-os/shared';

type AgentConfig = {
  systemPrompt: string;
  provider: {
    providerConfigId?: string;
    apiKeyRef?: string;
    modelId: string;
  };
  runtimeParams?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
  };
};

type SnapshotNode = {
  id: string;
  name: string;
  type: string;
  agentVersionId?: string | null;
  agentVersionSnapshot?: {
    configSnapshot: AgentConfig;
  } | null;
  inputMapping: Record<string, unknown>;
  outputKey: string;
  allowManualEdit: boolean;
  failurePolicy: string;
  enabled: boolean;
};

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const prisma = new PrismaClient();
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });

class NodeExecutionError extends Error {
  constructor(
    message: string,
    readonly nodeRunId: string
  ) {
    super(message);
  }
}

function timestamp() {
  return new Date().toISOString();
}

async function publish(event: string, payload: Record<string, unknown>) {
  await publisher.publish(runEventsRedisChannel, JSON.stringify({ event, payload: { ...payload, timestamp: timestamp() } }));
}

function pickPath(source: unknown, path?: unknown) {
  if (!path || path === '$') return source;
  if (typeof path !== 'string' || !path.startsWith('$.')) return source;
  return path
    .slice(2)
    .split('.')
    .reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), source);
}

function mapInput(mapping: Record<string, unknown>, workflowInput: Record<string, unknown>, outputs: Record<string, unknown>) {
  const target = typeof mapping.target === 'string' ? mapping.target : 'text';
  const source =
    mapping.source === 'node_output'
      ? outputs[String(mapping.nodeOutputKey)]
      : workflowInput;
  return {
    [target]: pickPath(source, mapping.path)
  };
}

function parseOutput(content: string, responseFormat?: 'text' | 'json') {
  if (responseFormat !== 'json') {
    return { output: { text: content }, rawText: null, parseError: null };
  }
  try {
    return { output: JSON.parse(content), rawText: null, parseError: null };
  } catch (error) {
    return {
      output: null,
      rawText: content,
      parseError: error instanceof Error ? error.message : 'OUTPUT_PARSE_FAILED'
    };
  }
}

async function callProvider(config: AgentConfig, input: Record<string, unknown>) {
  const apiKeyRef = config.provider.apiKeyRef;
  if (!apiKeyRef || !process.env[apiKeyRef]) {
    throw new Error(`Provider key ref ${apiKeyRef ?? '<missing>'} is not configured`);
  }
  if (input.forceInvalidJson) {
    return {
      content: 'not-json',
      usage: { promptTokens: 8, completionTokens: 2, totalTokens: 10 }
    };
  }
  return {
    content: JSON.stringify({
      mockOutput: {
        modelId: config.provider.modelId,
        input
      }
    }),
    usage: { promptTokens: 12, completionTokens: 16, totalTokens: 28 }
  };
}

async function loadNodes(runId: string): Promise<SnapshotNode[]> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflowSnapshot: true,
      workflow: {
        include: {
          nodes: {
            where: { enabled: true },
            orderBy: { orderIndex: 'asc' },
            include: { agentVersion: true }
          }
        }
      }
    }
  });
  if (!run) throw new Error(`WorkflowRun ${runId} not found`);

  if (run.workflowSnapshot) {
    const snapshot = run.workflowSnapshot.snapshot as { nodes?: SnapshotNode[] };
    return (snapshot.nodes ?? []).filter((node) => node.enabled);
  }

  return (
    run.workflow?.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      agentVersionId: node.agentVersionId,
      agentVersionSnapshot: node.agentVersion
        ? { configSnapshot: node.agentVersion.configSnapshot as AgentConfig }
        : null,
      inputMapping: node.inputMapping as Record<string, unknown>,
      outputKey: node.outputKey,
      allowManualEdit: node.allowManualEdit,
      failurePolicy: node.failurePolicy,
      enabled: node.enabled
    })) ?? []
  );
}

async function executeNode(workflowRunId: string, node: SnapshotNode, workflowInput: Record<string, unknown>, outputs: Record<string, unknown>, rerunOfNodeRunId?: string) {
  const startedAt = new Date();
  const input = mapInput(node.inputMapping, workflowInput, outputs);
  const nodeRun = await prisma.workflowNodeRun.create({
    data: {
      workflowRunId,
      workflowNodeId: node.id,
      rerunOfNodeRunId,
      status: 'running',
      input: input as Prisma.InputJsonValue,
      startedAt
    }
  });
  await publish('node.running', {
    workflowRunId,
    workflowNodeId: node.id,
    workflowNodeRunId: nodeRun.id,
    status: 'running'
  });

  try {
    const config = node.agentVersionSnapshot?.configSnapshot;
    if (!config) throw new Error(`Node ${node.name} is missing AgentVersion snapshot`);

    const response = await callProvider(config, input);
    const parsed = parseOutput(response.content, config.runtimeParams?.responseFormat);
    if (parsed.parseError) throw new Error(parsed.parseError);

    await prisma.workflowNodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'succeeded',
        output: parsed.output as Prisma.InputJsonValue,
        rawOutput: parsed.rawText,
        parseError: parsed.parseError === null ? Prisma.JsonNull : (parsed.parseError as Prisma.InputJsonValue),
        usage: response.usage as Prisma.InputJsonValue,
        finishedAt: new Date()
      }
    });
    outputs[node.outputKey] = parsed.output;
    await publish('node.succeeded', {
      workflowRunId,
      workflowNodeId: node.id,
      workflowNodeRunId: nodeRun.id,
      status: 'succeeded',
      outputPreview: parsed.output
    });
    return {
      nodeRunId: nodeRun.id,
      output: parsed.output,
      usage: response.usage,
      durationMs: Date.now() - startedAt.getTime()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.workflowNodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'failed',
        error: { message } as Prisma.InputJsonValue,
        finishedAt: new Date()
      }
    });
    await publish('node.failed', {
      workflowRunId,
      workflowNodeId: node.id,
      workflowNodeRunId: nodeRun.id,
      status: 'failed',
      error: { message }
    });
    throw new NodeExecutionError(message, nodeRun.id);
  }
}

async function recordUsage(workflowRunId: string, node: SnapshotNode, result: { usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number }; durationMs: number }) {
  const config = node.agentVersionSnapshot?.configSnapshot;
  await prisma.usageRecord.create({
    data: {
      workflowRunId,
      scope: 'workflow_node',
      providerType: 'openai-compatible',
      modelId: config?.provider.modelId,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      durationMs: result.durationMs,
      metadata: { workflowNodeId: node.id, outputKey: node.outputKey } as Prisma.InputJsonValue
    }
  });
}

export async function executeRun(job: WorkflowRunJob) {
  const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: job.workflowRunId } });
  const workflowInput = run.initialInput as Record<string, unknown>;
  const nodes = await loadNodes(job.workflowRunId);
  const state = (run.controlState as { outputs?: Record<string, unknown> } | null) ?? { outputs: {} };
  const outputs = state.outputs ?? {};
  const retryNode = job.retryNodeRunId
    ? await prisma.workflowNodeRun.findUniqueOrThrow({ where: { id: job.retryNodeRunId } })
    : null;
  const continueAfterNodeRun = job.continueAfterNodeRunId
    ? await prisma.workflowNodeRun.findUniqueOrThrow({ where: { id: job.continueAfterNodeRunId } })
    : null;
  const startIndex = continueAfterNodeRun
    ? nodes.findIndex((node) => node.id === continueAfterNodeRun.workflowNodeId) + 1
    : 0;
  const nodesToRun = retryNode
    ? nodes.filter((node) => node.id === retryNode.workflowNodeId)
    : nodes.slice(Math.max(startIndex, 0));

  await prisma.workflowRun.update({
    where: { id: job.workflowRunId },
    data: { status: 'running', startedAt: run.startedAt ?? new Date(), errorSummary: null }
  });
  await publish('run.running', { workflowRunId: job.workflowRunId, status: 'running' });

  try {
    for (const node of nodesToRun) {
      let result: Awaited<ReturnType<typeof executeNode>>;
      try {
        result = await executeNode(job.workflowRunId, node, workflowInput, outputs, retryNode?.id);
      } catch (error) {
        if (!retryNode && node.failurePolicy === 'skip' && error instanceof NodeExecutionError) {
          await prisma.workflowNodeRun.update({
            where: { id: error.nodeRunId },
            data: { status: 'skipped' }
          });
          await publish('node.skipped', {
            workflowRunId: job.workflowRunId,
            workflowNodeId: node.id,
            workflowNodeRunId: error.nodeRunId,
            status: 'skipped',
            error: { message: error.message }
          });
          continue;
        }
        throw error;
      }
      await recordUsage(job.workflowRunId, node, result);
      await prisma.workflowRun.update({
        where: { id: job.workflowRunId },
        data: { controlState: { outputs } as Prisma.InputJsonValue }
      });
      const nodeIndex = nodes.findIndex((candidate) => candidate.id === node.id);
      const hasNextNode = nodeIndex >= 0 && nodeIndex < nodes.length - 1;
      if (!retryNode && node.allowManualEdit && hasNextNode) {
        await prisma.workflowRun.update({
          where: { id: job.workflowRunId },
          data: {
            status: 'waiting_for_human_edit',
            controlState: {
              outputs,
              waitingFor: {
                workflowNodeId: node.id,
                workflowNodeRunId: result.nodeRunId,
                outputKey: node.outputKey
              }
            } as Prisma.InputJsonValue
          }
        });
        await publish('run.waiting_for_human_edit', {
          workflowRunId: job.workflowRunId,
          status: 'waiting_for_human_edit',
          workflowNodeId: node.id,
          workflowNodeRunId: result.nodeRunId
        });
        return;
      }
    }
    await prisma.workflowRun.update({
      where: { id: job.workflowRunId },
      data: { status: 'succeeded', finishedAt: new Date(), controlState: { outputs } as Prisma.InputJsonValue }
    });
    await publish('run.succeeded', { workflowRunId: job.workflowRunId, status: 'succeeded' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.workflowRun.update({
      where: { id: job.workflowRunId },
      data: { status: 'failed', errorSummary: message, finishedAt: new Date(), controlState: { outputs } as Prisma.InputJsonValue }
    });
    await publish('run.failed', { workflowRunId: job.workflowRunId, status: 'failed' });
  }
}

export function createWorkflowWorker() {
  return new Worker<WorkflowRunJob>(workflowRunQueueName, (job) => executeRun(job.data), {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  const worker = createWorkflowWorker();
  worker.on('ready', () => console.log(`Agents OS worker ready with Redis at ${redisUrl}`));
  worker.on('failed', (_job, error) => console.error(error));
}
