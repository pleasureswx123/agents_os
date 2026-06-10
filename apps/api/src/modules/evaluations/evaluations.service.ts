import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible.provider';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class EvaluationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpenAiCompatibleProvider) private readonly provider: OpenAiCompatibleProvider
  ) {}

  async listTestCases(agentId: string) {
    const items = await this.prisma.testCase.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async createTestCase(agentId: string, body: Record<string, unknown>) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' });
    }

    return this.prisma.testCase.create({
      data: {
        projectId: agent.projectId,
        agentId,
        name: String(body.name),
        input: body.input as Prisma.InputJsonValue,
        expectedNotes: body.expectedNotes ? String(body.expectedNotes) : undefined,
        createdFromChatMessageId: body.createdFromChatMessageId ? String(body.createdFromChatMessageId) : undefined
      }
    });
  }

  async updateTestCase(testCaseId: string, body: Record<string, unknown>) {
    return this.prisma.testCase.update({
      where: { id: testCaseId },
      data: {
        name: body.name ? String(body.name) : undefined,
        input: body.input as Prisma.InputJsonValue | undefined,
        expectedNotes: body.expectedNotes === undefined ? undefined : String(body.expectedNotes)
      }
    });
  }

  async runTestCase(testCaseId: string, agentVersionId: string) {
    const testCase = await this.prisma.testCase.findUnique({ where: { id: testCaseId } });
    if (!testCase) {
      throw new NotFoundException({ code: 'TEST_CASE_NOT_FOUND', message: 'TestCase 不存在' });
    }

    const agentVersion = await this.prisma.agentVersion.findUnique({ where: { id: agentVersionId } });
    if (!agentVersion || agentVersion.agentId !== testCase.agentId) {
      throw new NotFoundException({ code: 'AGENT_VERSION_NOT_FOUND', message: 'AgentVersion 不存在' });
    }

    const config = agentVersion.configSnapshot as AgentConfig;
    const providerConfig = config.provider.providerConfigId
      ? await this.prisma.providerConfig.findUnique({ where: { id: config.provider.providerConfigId } })
      : null;
    const apiKeyRef = config.provider.apiKeyRef ?? providerConfig?.apiKeyRef;
    if (!apiKeyRef) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '缺少 apiKeyRef' });
    }

    const input = testCase.input as Record<string, unknown>;
    const llmResponse = await this.provider.chat({
      modelId: config.provider.modelId,
      apiKeyRef,
      input,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: JSON.stringify(input) }
      ],
      responseFormat: config.runtimeParams?.responseFormat,
      temperature: config.runtimeParams?.temperature,
      maxTokens: config.runtimeParams?.maxTokens
    });

    const output = this.parseOutput(llmResponse.content, config.runtimeParams?.responseFormat);
    return this.prisma.testResult.create({
      data: {
        testCaseId,
        agentVersionId,
        output: output as Prisma.InputJsonValue,
        usage: (llmResponse.usage ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  async listResults(testCaseId: string) {
    const items = await this.prisma.testResult.findMany({
      where: { testCaseId },
      include: { agentVersion: true },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async scoreResult(resultId: string, body: { rating?: string; notes?: string }) {
    return this.prisma.testResult.update({
      where: { id: resultId },
      data: {
        rating: body.rating,
        notes: body.notes
      }
    });
  }

  private parseOutput(content: string, responseFormat?: 'text' | 'json') {
    if (responseFormat !== 'json') {
      return { text: content };
    }

    try {
      return JSON.parse(content);
    } catch {
      return {
        rawText: content,
        parseError: 'OUTPUT_PARSE_FAILED'
      };
    }
  }
}
