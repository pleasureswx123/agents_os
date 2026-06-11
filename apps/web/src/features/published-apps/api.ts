const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

async function readData<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const body = await response.json();
  return body.data;
}

export interface PublishedApp {
  id: string;
  slug: string;
  name: string;
  description?: string;
  publicInputSchema: { required?: string[] };
  branding?: Record<string, unknown>;
}

export interface PublicRun {
  id: string;
  status: string;
  artifacts: Array<{ id: string; filename?: string; type: string }>;
}

export async function getPublishedApp(slug: string) {
  return readData<PublishedApp>(await fetch(`${apiBase}/api/published-apps/${slug}`));
}

export async function runPublishedApp(slug: string, input: Record<string, unknown>) {
  return readData<{ workflowRunId: string; status: string }>(
    await fetch(`${apiBase}/api/published-apps/${slug}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input })
    })
  );
}

export async function getPublishedRun(slug: string, runId: string) {
  return readData<PublicRun>(await fetch(`${apiBase}/api/published-apps/${slug}/runs/${runId}`));
}

export async function exportPublishedRun(slug: string, runId: string) {
  return readData<{ id: string; filename?: string; type: string }>(
    await fetch(`${apiBase}/api/published-apps/${slug}/runs/${runId}/export`, { method: 'POST' })
  );
}

export async function getArtifactDownloadUrl(slug: string, artifactId: string) {
  return readData<{ url: string; filename?: string }>(
    await fetch(`${apiBase}/api/published-apps/${slug}/artifacts/${artifactId}/download`)
  );
}
