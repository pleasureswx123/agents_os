import { expect, test } from '@playwright/test';

test('edits a node output, continues the run, and exports the package', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agents_os_access_token', 'test-token'));
  let status = 'waiting_for_human_edit';
  const nodeRun = {
    id: 'node_run_1',
    workflowNodeId: 'node_1',
    status: 'succeeded',
    input: { text: 'story' },
    output: { draft: true },
    finishedAt: new Date().toISOString()
  };

  await page.route('**/api/workflow-runs/run_1', async (route) => {
    await route.fulfill({
      json: {
        data: {
          id: 'run_1',
          source: 'studio',
          status,
          controlState: {
            outputs: { analysis: { approved: true } },
            waitingFor: { workflowNodeId: 'node_1', workflowNodeRunId: 'node_run_1', outputKey: 'analysis' }
          },
          nodeRuns: [nodeRun],
          artifacts: status === 'exported' ? [{ id: 'artifact_1', type: 'material_package', filename: 'package.zip' }] : []
        }
      }
    });
  });
  await page.route('**/api/workflow-runs/run_1/node-runs/node_run_1/edited-output', async (route) => {
    await route.fulfill({ json: { data: { ...nodeRun, editedOutput: { approved: true } } } });
  });
  await page.route('**/api/workflow-runs/run_1/control', async (route) => {
    status = 'succeeded';
    await route.fulfill({ json: { data: { queued: true } } });
  });
  await page.route('**/api/workflow-runs/run_1/export', async (route) => {
    status = 'exported';
    await route.fulfill({ json: { data: { id: 'artifact_1', type: 'material_package', filename: 'package.zip' } } });
  });
  await page.route('**/api/artifacts/artifact_1/download', async (route) => {
    await route.fulfill({ json: { data: { url: 'https://example.com/package.zip' } } });
  });

  await page.goto('/projects/project_1/runs/run_1');
  await expect(page.getByRole('heading', { name: 'Workflow Run' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Output' }).click();
  await page.getByRole('textbox').fill('{"approved":true}');
  await page.getByRole('button', { name: 'Save edited output' }).click();
  await expect(page.getByText('Edited output saved.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Continue queued.')).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByText('Artifact export queued.')).toBeVisible();
});
