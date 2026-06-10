export type WorkflowStatus = 'draft' | 'valid' | 'published' | 'archived';

export type WorkflowRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_human_edit'
  | 'failed'
  | 'rerunning'
  | 'canceled'
  | 'succeeded'
  | 'exporting'
  | 'exported';

export type WorkflowNodeRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'rerunning';

export type PublishedAppStatus = 'draft' | 'enabled' | 'disabled' | 'archived';
