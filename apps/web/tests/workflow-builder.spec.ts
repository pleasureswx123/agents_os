import { expect, test } from '@playwright/test';

const workflow = {
  id: 'workflow_1',
  name: '默认工作流',
  nodes: [
    {
      id: 'node_1',
      name: '小说分析',
      orderIndex: 1,
      type: 'agent',
      agentVersionId: 'version_1',
      position: { x: 100, y: 120 },
      inputMapping: { source: 'workflow_input', path: '$.text', target: 'text' },
      outputKey: 'novel_analysis',
      allowManualEdit: true,
      failurePolicy: 'stop',
      enabled: true
    }
  ]
};

test('renders React Flow workflow builder and creates a snapshot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agents_os_access_token', 'test-token'));
  await page.route('**/api/projects/project_1/workflows', async (route) => {
    await route.fulfill({ json: { data: { items: [workflow] } } });
  });
  await page.route('**/api/workflows/workflow_1', async (route) => {
    await route.fulfill({ json: { data: workflow } });
  });
  await page.route('**/api/workflows/workflow_1/nodes', async (route) => {
    await route.fulfill({ json: { data: { ...workflow.nodes[0], id: 'node_2', name: 'Node 2' } } });
  });
  await page.route('**/api/workflows/workflow_1/snapshots', async (route) => {
    await route.fulfill({ json: { data: { id: 'snapshot_1' } } });
  });

  await page.goto('/projects/project_1/workflows');
  await expect(page.getByRole('heading', { name: '默认工作流' })).toBeVisible();
  await expect(page.locator('.react-flow')).toBeVisible();
  await page.getByRole('button', { name: 'Add Node' }).click();
  await page.getByRole('button', { name: 'Create Snapshot' }).click();
  await expect(page.getByText('Snapshot created.')).toBeVisible();
});
