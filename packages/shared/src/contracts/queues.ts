export const workflowRunQueueName = 'agents-os.workflow-runs';

export interface WorkflowRunJob {
  workflowRunId: string;
  retryNodeRunId?: string;
}

export const runEventsRedisChannel = 'agents-os:run-events';
