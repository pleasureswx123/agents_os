import { z } from 'zod';

const jsonSchemaLike = z.record(z.unknown());

export const openAiCompatibleProviderSchema = z
  .object({
    type: z.literal('openai-compatible'),
    providerConfigId: z.string().min(1).optional(),
    apiKeyRef: z.string().min(1).optional(),
    modelId: z.string().min(1),
    baseUrl: z.string().url().optional()
  })
  .strict()
  .superRefine((provider, ctx) => {
    if (!provider.providerConfigId && !provider.apiKeyRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provider must reference providerConfigId or apiKeyRef'
      });
    }
  });

export const agentRuntimeParamsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    responseFormat: z.enum(['text', 'json']).optional()
  })
  .catchall(z.unknown());

export const agentConfigSchema = z
  .object({
    systemPrompt: z.string().min(1),
    provider: openAiCompatibleProviderSchema,
    runtimeParams: agentRuntimeParamsSchema.default({}),
    inputSchema: jsonSchemaLike,
    outputSchema: jsonSchemaLike,
    tools: z.array(z.record(z.unknown())).default([]),
    skills: z.array(z.record(z.unknown())).default([])
  })
  .strict();

export type AgentConfig = z.infer<typeof agentConfigSchema>;
