import { expect, test } from '@playwright/test';

test('runs a published app and exposes artifact download', async ({ page }) => {
  await page.route('**/api/published-apps/story-material-demo', async (route) => {
    await route.fulfill({
      json: {
        data: {
          id: 'app_1',
          slug: 'story-material-demo',
          name: 'Story Material App',
          description: 'Generate material package',
          publicInputSchema: { required: ['text'] }
        }
      }
    });
  });
  await page.route('**/api/published-apps/story-material-demo/runs', async (route) => {
    await route.fulfill({ json: { data: { workflowRunId: 'run_1', status: 'queued' } } });
  });
  await page.route('**/api/published-apps/story-material-demo/runs/run_1', async (route) => {
    await route.fulfill({
      json: {
        data: {
          id: 'run_1',
          status: 'exported',
          artifacts: [{ id: 'artifact_1', type: 'material_package', filename: 'material-package.json' }]
        }
      }
    });
  });
  await page.route('**/api/published-apps/story-material-demo/artifacts/artifact_1/download', async (route) => {
    await route.fulfill({ json: { data: { url: 'https://example.com/material-package.json' } } });
  });

  await page.goto('/app/story-material-demo');
  await expect(page.getByRole('heading', { name: 'Story Material App' })).toBeVisible();
  await page.getByLabel('Story text').fill('Once upon a time');
  await page.getByRole('button', { name: 'Run App' }).click();
  await expect(page.getByText('Run queued.')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('link', { name: 'Download package' })).toHaveAttribute(
    'href',
    'https://example.com/material-package.json'
  );
});
