import { describe, expect, it } from 'vitest';
import { agentConfigSchema } from './agent-config.schema';

describe('agentConfigSchema', () => {
  it('accepts a valid OpenAI-compatible agent configuration', () => {
    const result = agentConfigSchema.safeParse({
      systemPrompt: 'You analyze stories and return JSON.',
      provider: {
        type: 'openai-compatible',
        providerConfigId: 'provider_default',
        apiKeyRef: 'PROVIDER_KEY_DEFAULT',
        modelId: 'gpt-4.1-mini'
      },
      runtimeParams: {
        temperature: 0.7,
        maxTokens: 4096,
        responseFormat: 'json'
      },
      inputSchema: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        required: ['summary'],
        properties: {
          summary: { type: 'string' }
        }
      },
      tools: [],
      skills: []
    });

    expect(result.success).toBe(true);
  });

  it('rejects configurations that try to store a plaintext api key', () => {
    const result = agentConfigSchema.safeParse({
      systemPrompt: 'No secrets.',
      provider: {
        type: 'openai-compatible',
        providerConfigId: 'provider_default',
        apiKey: 'sk-secret',
        modelId: 'gpt-4.1-mini'
      },
      runtimeParams: {},
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      tools: [],
      skills: []
    });

    expect(result.success).toBe(false);
  });
});
