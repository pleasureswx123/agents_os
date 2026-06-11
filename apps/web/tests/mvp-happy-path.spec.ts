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

test('covers the MVP happy path from login to published app download', async ({ page }) => {
  let projectCreated = false;

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ json: { data: { accessToken: 'test-token', refreshToken: 'refresh-token' } } });
  });
  await page.route('**/api/templates', async (route) => {
    await route.fulfill({ json: { data: { items: [{ id: 'template_1', name: '小说视频素材包', latestVersionId: 'template_version_1' }] } } });
  });
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'POST') {
      projectCreated = true;
      await route.fulfill({ json: { data: { id: 'project_1', name: '我的小说素材生产项目' } } });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          items: projectCreated
            ? [{ id: 'project_1', name: '我的小说素材生产项目', _count: { agents: 6, workflows: 1 } }]
            : []
        }
      }
    });
  });
  await page.route('**/api/projects/project_1', async (route) => {
    await route.fulfill({
      json: {
        data: {
          id: 'project_1',
          name: '我的小说素材生产项目',
          agents: [{ id: 'agent_1', name: '小说分析智能体' }],
          workflows: [{ ...workflow, nodes: workflow.nodes }]
        }
      }
    });
  });
  await page.route('**/api/projects/project_1/agents', async (route) => {
    await route.fulfill({ json: { data: { items: [agent] } } });
  });
  await page.route('**/api/agents/agent_1', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ json: { data: agent } });
      return;
    }
    await route.fulfill({ json: { data: agent } });
  });
  await page.route('**/api/agents/agent_1/chat', async (route) => {
    await route.fulfill({ json: { data: { output: { mockOutput: true }, rawText: null, parseError: null, usage: { totalTokens: 10 } } } });
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
    await route.fulfill({ json: { data: { items: [{ id: 'result_1', output: { mockOutput: true }, agentVersion: { versionName: 'v1' } }] } } });
  });
  await page.route('**/api/projects/project_1/workflows', async (route) => {
    await route.fulfill({ json: { data: { items: [workflow] } } });
  });
  await page.route('**/api/workflows/workflow_1', async (route) => {
    await route.fulfill({ json: { data: workflow } });
  });
  await page.route('**/api/workflows/workflow_1/snapshots', async (route) => {
    await route.fulfill({ json: { data: { id: 'snapshot_1' } } });
  });
  await page.route('**/api/workflows/workflow_1/runs', async (route) => {
    await route.fulfill({ json: { data: { id: 'run_1', status: 'queued' } } });
  });
  await page.route('**/api/workflow-runs/run_1', async (route) => {
    await route.fulfill({ json: { data: { id: 'run_1', source: 'studio', status: 'succeeded', nodeRuns: [], artifacts: [] } } });
  });
  await page.route('**/api/workflow-runs/run_1/export', async (route) => {
    await route.fulfill({ json: { data: { id: 'artifact_1', type: 'material_package', filename: 'package.zip' } } });
  });
  await page.route('**/api/published-apps/story-material-demo', async (route) => {
    await route.fulfill({ json: { data: { id: 'app_1', slug: 'story-material-demo', name: 'Story Material App', publicInputSchema: { required: ['text'] } } } });
  });
  await page.route('**/api/published-apps/story-material-demo/runs', async (route) => {
    await route.fulfill({ json: { data: { workflowRunId: 'public_run_1', status: 'queued' } } });
  });
  await page.route('**/api/published-apps/story-material-demo/runs/public_run_1', async (route) => {
    await route.fulfill({ json: { data: { id: 'public_run_1', status: 'exported', artifacts: [{ id: 'artifact_1', type: 'material_package', filename: 'package.zip' }] } } });
  });
  await page.route('**/api/published-apps/story-material-demo/artifacts/artifact_1/download', async (route) => {
    await route.fulfill({ json: { data: { url: 'https://example.com/package.zip' } } });
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByText('项目已创建。')).toBeVisible();
  await page.getByRole('link', { name: '我的小说素材生产项目' }).click();
  await expect(page.getByRole('heading', { name: '我的小说素材生产项目' })).toBeVisible();

  await page.getByRole('link', { name: 'Agent Studio' }).click();
  await expect(page.getByRole('heading', { name: '小说分析智能体' })).toBeVisible();
  await page.getByRole('button', { name: 'Send Test' }).click();
  await expect(page.getByLabel('Chat output')).toContainText('mockOutput');
  await page.getByRole('button', { name: 'Versions' }).click();
  await page.getByRole('button', { name: 'Save Version' }).click();

  await page.goto('/projects/project_1/evaluations/agent_1');
  await page.getByRole('button', { name: 'Create Test Case' }).click();
  await page.getByRole('button', { name: 'Run Selected Case' }).click();
  await expect(page.getByText('mockOutput')).toBeVisible();

  await page.goto('/projects/project_1/workflows');
  await expect(page.locator('.react-flow')).toBeVisible();
  await page.getByRole('button', { name: 'Create Snapshot' }).click();
  await page.getByRole('button', { name: 'Run Workflow' }).click();
  await expect(page.getByRole('heading', { name: 'Workflow Run' })).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByText('Artifact export queued.')).toBeVisible();

  await page.goto('/app/story-material-demo');
  await page.getByLabel('Story text').fill('Once upon a time');
  await page.getByRole('button', { name: 'Run App' }).click();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('link', { name: 'Download package' })).toHaveAttribute('href', 'https://example.com/package.zip');
});
