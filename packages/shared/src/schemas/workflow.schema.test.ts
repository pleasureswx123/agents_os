import { describe, expect, it } from 'vitest';
import { workflowNodeSchema } from './workflow.schema';

describe('workflowNodeSchema', () => {
  it('accepts a valid linear agent workflow node', () => {
    const result = workflowNodeSchema.safeParse({
      type: 'agent',
      agentVersionId: 'av_123',
      position: { x: 120, y: 80 },
      inputMapping: {
        source: 'workflow_input',
        path: '$.text',
        target: 'text'
      },
      outputKey: 'novel_analysis',
      allowManualEdit: true,
      failurePolicy: 'stop',
      enabled: true
    });

    expect(result.success).toBe(true);
  });

  it('requires an agentVersionId for enabled agent nodes', () => {
    const result = workflowNodeSchema.safeParse({
      type: 'agent',
      position: { x: 120, y: 80 },
      inputMapping: {
        source: 'workflow_input',
        path: '$.text',
        target: 'text'
      },
      outputKey: 'novel_analysis',
      allowManualEdit: true,
      failurePolicy: 'stop',
      enabled: true
    });

    expect(result.success).toBe(false);
  });
});
