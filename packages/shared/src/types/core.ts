import type {
  PublishedAppStatus,
  WorkflowNodeRunStatus,
  WorkflowRunStatus,
  WorkflowStatus
} from './status';

export type JsonObject = Record<string, unknown>;

export interface TenantContext {
  organizationId: string;
  userId?: string;
}

export interface ProjectSummary {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  templateVersionId?: string | null;
}

export interface AgentSummary {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  currentVersionId?: string | null;
}

export interface WorkflowSummary {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
}

export interface WorkflowRunSummary {
  id: string;
  projectId: string;
  workflowId?: string | null;
  workflowSnapshotId?: string | null;
  publishedAppId?: string | null;
  source: 'factory' | 'published_app';
  status: WorkflowRunStatus;
}

export interface WorkflowNodeRunSummary {
  id: string;
  workflowRunId: string;
  workflowNodeId?: string | null;
  status: WorkflowNodeRunStatus;
}

export interface PublishedAppSummary {
  id: string;
  projectId: string;
  workflowSnapshotId: string;
  slug: string;
  name: string;
  status: PublishedAppStatus;
}
