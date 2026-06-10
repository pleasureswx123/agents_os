import { describe, expect, it } from 'vitest';
import { createWorkflowWorker } from './main.js';

describe('workflow worker bootstrap', () => {
  it('creates a BullMQ worker bound to the workflow queue', async () => {
    const worker = createWorkflowWorker();
    expect(worker.name).toBe('agents-os.workflow-runs');
    await worker.close();
  });
});
