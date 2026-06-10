import { expect, test } from '@playwright/test';

const agent = {
  id: 'agent_1',
  projectId: 'project_1',
  name: '小说分析智能体',
  draftConfig: {
    systemPrompt: '你是小说分析智能体',
    provider: { type: 'openai-compatible', apiKeyRef: 'PROVIDER_KEY_DEFAULT', modelId: 'gpt-4.1-mini' },
    runtimeParams: { responseFormat: 'json' },
    inputSchema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } },
    outputSchema: { type: 'object' },
    tools: [],
    skills: []
  }
};

test('opens Agent Studio, edits prompt, chats, and saves a version', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('agents_os_access_token', 'test-token');
  });

  await page.route('**/api/projects/project_1/agents', async (route) => {
    await route.fulfill({ json: { data: { items: [agent] }, requestId: 'req_test' } });
  });
  await page.route('**/api/agents/agent_1', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      await route.fulfill({ json: { data: { ...agent, ...payload }, requestId: 'req_test' } });
      return;
    }
    await route.fulfill({ json: { data: agent, requestId: 'req_test' } });
  });
  await page.route('**/api/agents/agent_1/chat', async (route) => {
    await route.fulfill({
      json: { data: { output: { mockOutput: true }, rawText: null, parseError: null, usage: { totalTokens: 10 } } }
    });
  });
  await page.route('**/api/agents/agent_1/versions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { data: { id: 'version_2', versionName: 'saved', createdAt: new Date().toISOString() } } });
      return;
    }
    await route.fulfill({ json: { data: { items: [{ id: 'version_1', versionName: 'v1', createdAt: new Date().toISOString() }] } } });
  });

  await page.goto('/projects/project_1/agents');
  await expect(page.getByRole('heading', { name: '小说分析智能体' })).toBeVisible();

  await page.getByLabel('System Prompt').fill('你是更稳定的小说分析智能体');
  await page.getByRole('button', { name: 'Save Config' }).click();
  await page.getByRole('button', { name: 'Send Test' }).click();
  await expect(page.getByLabel('Chat output')).toContainText('mockOutput');

  await page.getByRole('button', { name: 'Versions' }).click();
  await page.getByRole('button', { name: 'Save Version' }).click();
  await expect(page.getByText('v1')).toBeVisible();
});
