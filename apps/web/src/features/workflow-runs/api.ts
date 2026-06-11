const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('agents_os_access_token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function readData<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const body = await response.json();
  return body.data;
}

export interface WorkflowNodeRun {
  id: string;
  workflowNodeId?: string | null;
  status: string;
  input: unknown;
  output?: unknown;
  editedOutput?: unknown;
  error?: unknown;
  startedAt?: string;
  finishedAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId?: string;
  source: string;
  status: string;
  errorSummary?: string;
  controlState?: {
    outputs?: Record<string, unknown>;
    waitingFor?: {
      workflowNodeId: string;
      workflowNodeRunId: string;
      outputKey: string;
    };
  };
  nodeRuns: WorkflowNodeRun[];
  artifacts: Array<{ id: string; filename?: string; type: string; contentType?: string }>;
}

export async function createWorkflowRun(workflowId: string, input: Record<string, unknown>) {
  return readData<{ id: string; status: string }>(
    await fetch(`${apiBase}/api/workflows/${workflowId}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ input })
    })
  );
}

export async function getWorkflowRun(runId: string) {
  return readData<WorkflowRun>(await fetch(`${apiBase}/api/workflow-runs/${runId}`, { headers: authHeaders() }));
}

export async function updateNodeRunEditedOutput(runId: string, nodeRunId: string, editedOutput: unknown) {
  return readData<WorkflowNodeRun>(
    await fetch(`${apiBase}/api/workflow-runs/${runId}/node-runs/${nodeRunId}/edited-output`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ editedOutput })
    })
  );
}

export async function continueWorkflowRun(runId: string) {
  return readData<{ queued: boolean }>(
    await fetch(`${apiBase}/api/workflow-runs/${runId}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ command: 'continue' })
    })
  );
}

export async function rerunNodeRun(runId: string, nodeRunId: string) {
  return readData<{ queued: boolean }>(
    await fetch(`${apiBase}/api/workflow-runs/${runId}/node-runs/${nodeRunId}/rerun`, {
      method: 'POST',
      headers: authHeaders()
    })
  );
}

export async function exportWorkflowRun(runId: string) {
  return readData<{ id: string }>(
    await fetch(`${apiBase}/api/workflow-runs/${runId}/export`, {
      method: 'POST',
      headers: authHeaders()
    })
  );
}

export async function getArtifactDownloadUrl(artifactId: string) {
  return readData<{ url: string; filename?: string }>(
    await fetch(`${apiBase}/api/artifacts/${artifactId}/download`, { headers: authHeaders() })
  );
}
