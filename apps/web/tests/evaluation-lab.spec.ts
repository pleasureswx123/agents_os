import { expect, test } from '@playwright/test';

test('creates and runs a test case in Evaluation Lab', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agents_os_access_token', 'test-token'));

  await page.route('**/api/agents/agent_1', async (route) => {
    await route.fulfill({ json: { data: { id: 'agent_1', name: '小说分析智能体', draftConfig: {} } } });
  });
  await page.route('**/api/agents/agent_1/versions', async (route) => {
    await route.fulfill({ json: { data: { items: [{ id: 'version_1', versionName: 'v1', createdAt: new Date().toISOString() }] } } });
  });
  await page.route('**/api/agents/agent_1/test-cases', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { data: { id: 'case_1', name: 'case-created', input: { text: '雨夜' } } } });
      return;
    }
    await route.fulfill({ json: { data: { items: [{ id: 'case_1', name: '悬疑短篇测试', input: { text: '雨夜' } }] } } });
  });
  await page.route('**/api/test-cases/case_1/run', async (route) => {
    await route.fulfill({ json: { data: { id: 'result_1', output: { mockOutput: true } } } });
  });
  await page.route('**/api/test-cases/case_1/results', async (route) => {
    await route.fulfill({
      json: { data: { items: [{ id: 'result_1', output: { mockOutput: true }, agentVersion: { versionName: 'v1' } }] } }
    });
  });
  await page.route('**/api/test-results/result_1', async (route) => {
    await route.fulfill({ json: { data: { id: 'result_1', output: { mockOutput: true }, rating: 'good' } } });
  });

  await page.goto('/projects/project_1/evaluations/agent_1');
  await expect(page.getByRole('heading', { name: '小说分析智能体' })).toBeVisible();
  await page.getByRole('button', { name: 'Create Test Case' }).click();
  await page.getByRole('button', { name: 'Run Selected Case' }).click();
  await expect(page.getByText('mockOutput')).toBeVisible();
  await page.getByRole('button', { name: 'good' }).click();
});
