import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible.provider';
import { PrismaService } from '../prisma/prisma.service';

type AgentConfig = {
  systemPrompt: string;
  provider: {
    type: string;
    providerConfigId?: string;
    apiKeyRef?: string;
    modelId: string;
  };
  runtimeParams?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
  };
  inputSchema?: {
    required?: string[];
  };
};

@Injectable()
export class ChatsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpenAiCompatibleProvider) private readonly provider: OpenAiCompatibleProvider
  ) {}

  async chat(agentId: string, body: { chatSessionId?: string; input: Record<string, unknown> }) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' });
    }

    const config = agent.draftConfig as AgentConfig;
    this.validateInput(config, body.input);

    const providerConfig = config.provider.providerConfigId
      ? await this.prisma.providerConfig.findUnique({ where: { id: config.provider.providerConfigId } })
      : null;
    const apiKeyRef = config.provider.apiKeyRef ?? providerConfig?.apiKeyRef;
    if (!apiKeyRef) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '缺少 apiKeyRef' });
    }

    const llmResponse = await this.provider.chat({
      modelId: config.provider.modelId,
      apiKeyRef,
      input: body.input,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: JSON.stringify(body.input) }
      ],
      temperature: config.runtimeParams?.temperature,
      maxTokens: config.runtimeParams?.maxTokens,
      responseFormat: config.runtimeParams?.responseFormat
    });

    const parsed = this.parseOutput(llmResponse.content, config.runtimeParams?.responseFormat);
    const session = body.chatSessionId
      ? await this.prisma.chatSession.findUnique({ where: { id: body.chatSessionId } })
      : await this.prisma.chatSession.create({
          data: { agentId, title: 'Chat test' }
        });

    if (!session) {
      throw new NotFoundException({ code: 'CHAT_SESSION_NOT_FOUND', message: 'ChatSession 不存在' });
    }

    await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'user',
        content: JSON.stringify(body.input)
      }
    });

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'assistant',
        content: llmResponse.content,
        metadata: {
          output: parsed.output,
          rawText: parsed.rawText,
          parseError: parsed.parseError,
          usage: llmResponse.usage
        } as Prisma.InputJsonValue
      }
    });

    return {
      chatSessionId: session.id,
      messageId: assistantMessage.id,
      output: parsed.output,
      rawText: parsed.rawText,
      parseError: parsed.parseError,
      usage: llmResponse.usage ?? null
    };
  }

  private validateInput(config: AgentConfig, input: Record<string, unknown>) {
    const missing = config.inputSchema?.required?.filter((key) => input[key] === undefined) ?? [];
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '请求参数校验失败',
        details: { missing }
      });
    }
  }

  private parseOutput(content: string, responseFormat?: 'text' | 'json') {
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
}
