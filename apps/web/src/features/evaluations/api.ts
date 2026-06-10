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

export interface TestCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expectedNotes?: string;
}

export interface TestResult {
  id: string;
  output: Record<string, unknown>;
  rating?: string;
  notes?: string;
  agentVersion?: { versionName: string };
}

export async function listTestCases(agentId: string) {
  return readData<{ items: TestCase[] }>(
    await fetch(`${apiBase}/api/agents/${agentId}/test-cases`, { headers: authHeaders() })
  );
}

export async function createTestCase(agentId: string, payload: { name: string; input: Record<string, unknown> }) {
  return readData<TestCase>(
    await fetch(`${apiBase}/api/agents/${agentId}/test-cases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
  );
}

export async function runTestCase(testCaseId: string, agentVersionId: string) {
  return readData<TestResult>(
    await fetch(`${apiBase}/api/test-cases/${testCaseId}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ agentVersionId })
    })
  );
}

export async function listTestResults(testCaseId: string) {
  return readData<{ items: TestResult[] }>(
    await fetch(`${apiBase}/api/test-cases/${testCaseId}/results`, { headers: authHeaders() })
  );
}

export async function scoreTestResult(resultId: string, rating: string) {
  return readData<TestResult>(
    await fetch(`${apiBase}/api/test-results/${resultId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ rating })
    })
  );
}
