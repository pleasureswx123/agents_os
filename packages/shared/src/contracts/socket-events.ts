export const serverRunEvents = [
  'run.queued',
  'run.running',
  'run.waiting_for_human_edit',
  'run.failed',
  'run.succeeded',
  'run.canceled',
  'run.control.applied',
  'run.control.rejected',
  'run.exporting',
  'run.exported'
] as const;

export const serverNodeEvents = [
  'node.queued',
  'node.running',
  'node.output',
  'node.failed',
  'node.succeeded',
  'node.rerunning',
  'node.skipped'
] as const;

export const clientRunEvents = ['run.join', 'run.control'] as const;

export type ServerRunEvent = (typeof serverRunEvents)[number];
export type ServerNodeEvent = (typeof serverNodeEvents)[number];
export type ClientRunEvent = (typeof clientRunEvents)[number];

export interface RunEventPayload {
  workflowRunId: string;
  status: string;
  timestamp: string;
}

export interface NodeEventPayload {
  workflowRunId: string;
  workflowNodeId?: string | null;
  workflowNodeRunId: string;
  status: string;
  outputPreview?: unknown;
  error?: unknown;
  timestamp: string;
}
