const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

export interface AgentConfig {
  systemPrompt: string;
  provider: Record<string, unknown>;
  runtimeParams: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tools: unknown[];
  skills: unknown[];
}

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  draftConfig: AgentConfig;
  currentVersionId?: string;
}

export interface AgentVersion {
  id: string;
  versionName: string;
  notes?: string;
  createdAt: string;
}

function authHeaders() {
  const token = localStorage.getItem('agents_os_access_token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function readData<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const body = await response.json();
  return body.data;
}

export async function listAgents(projectId: string) {
  return readData<{ items: Agent[] }>(
    await fetch(`${apiBase}/api/projects/${projectId}/agents`, { headers: authHeaders() })
  );
}

export async function getAgent(agentId: string) {
  return readData<Agent>(await fetch(`${apiBase}/api/agents/${agentId}`, { headers: authHeaders() }));
}

export async function updateAgent(agentId: string, patch: Partial<Agent>) {
  return readData<Agent>(
    await fetch(`${apiBase}/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(patch)
    })
  );
}

export async function chatWithAgent(agentId: string, input: Record<string, unknown>) {
  return readData<{
    output: unknown;
    rawText: string | null;
    parseError: string | null;
    usage: Record<string, unknown> | null;
  }>(
    await fetch(`${apiBase}/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ input })
    })
  );
}

export async function createAgentVersion(agentId: string, versionName: string) {
  return readData<AgentVersion>(
    await fetch(`${apiBase}/api/agents/${agentId}/versions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ versionName })
    })
  );
}

export async function listAgentVersions(agentId: string) {
  return readData<{ items: AgentVersion[] }>(
    await fetch(`${apiBase}/api/agents/${agentId}/versions`, { headers: authHeaders() })
  );
}
