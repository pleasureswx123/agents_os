import { Injectable } from '@nestjs/common';
import type { LlmChatRequest, LlmChatResponse, LlmProvider } from './llm-provider.interface';

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const apiKey = process.env[request.apiKeyRef];
    if (!apiKey) {
      throw new Error(`Provider key ref ${request.apiKeyRef} is not configured`);
    }

    if (request.input.forceInvalidJson) {
      return {
        content: 'not-json',
        raw: { mocked: true },
        usage: { promptTokens: 8, completionTokens: 2, totalTokens: 10 }
      };
    }

    return {
      content: JSON.stringify({
        mockOutput: {
          modelId: request.modelId,
          input: request.input
        }
      }),
      raw: { mocked: true },
      usage: { promptTokens: 12, completionTokens: 16, totalTokens: 28 }
    };
  }
}
