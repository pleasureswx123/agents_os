import { z } from 'zod';

export const workflowNodeTypeSchema = z.enum(['agent', 'tool', 'manual']);
export const workflowFailurePolicySchema = z.enum(['stop', 'skip']);

export const workflowInputMappingSchema = z
  .object({
    source: z.enum(['workflow_input', 'node_output', 'manual']),
    path: z.string().min(1).optional(),
    target: z.string().min(1),
    nodeOutputKey: z.string().min(1).optional(),
    value: z.unknown().optional()
  })
  .strict()
  .superRefine((mapping, ctx) => {
    if (mapping.source === 'node_output' && !mapping.nodeOutputKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodeOutputKey'],
        message: 'node_output mappings require nodeOutputKey'
      });
    }

    if (mapping.source !== 'manual' && !mapping.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['path'],
        message: 'workflow_input and node_output mappings require path'
      });
    }
  });

export const workflowNodeSchema = z
  .object({
    type: workflowNodeTypeSchema,
    agentVersionId: z.string().min(1).optional(),
    position: z
      .object({
        x: z.number(),
        y: z.number()
      })
      .strict()
      .optional(),
    inputMapping: workflowInputMappingSchema,
    outputKey: z.string().min(1),
    allowManualEdit: z.boolean().default(true),
    failurePolicy: workflowFailurePolicySchema.default('stop'),
    enabled: z.boolean().default(true)
  })
  .strict()
  .superRefine((node, ctx) => {
    if (node.enabled && node.type === 'agent' && !node.agentVersionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agentVersionId'],
        message: 'Enabled agent nodes require agentVersionId'
      });
    }
  });

export type WorkflowNodeInput = z.infer<typeof workflowNodeSchema>;
