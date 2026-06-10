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

export interface WorkflowNode {
  id: string;
  name: string;
  orderIndex: number;
  type: string;
  agentVersionId?: string;
  position?: { x: number; y: number };
  inputMapping: Record<string, unknown>;
  outputKey: string;
  allowManualEdit: boolean;
  failurePolicy: string;
  enabled: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

export async function listWorkflows(projectId: string) {
  return readData<{ items: Workflow[] }>(
    await fetch(`${apiBase}/api/projects/${projectId}/workflows`, { headers: authHeaders() })
  );
}

export async function getWorkflow(workflowId: string) {
  return readData<Workflow>(await fetch(`${apiBase}/api/workflows/${workflowId}`, { headers: authHeaders() }));
}

export async function createWorkflowNode(workflowId: string, payload: Record<string, unknown>) {
  return readData<WorkflowNode>(
    await fetch(`${apiBase}/api/workflows/${workflowId}/nodes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
  );
}

export async function updateWorkflowNode(nodeId: string, payload: Record<string, unknown>) {
  return readData<WorkflowNode>(
    await fetch(`${apiBase}/api/workflow-nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
  );
}

export async function createWorkflowSnapshot(workflowId: string, versionName: string) {
  return readData<{ id: string }>(
    await fetch(`${apiBase}/api/workflows/${workflowId}/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ versionName })
    })
  );
}
