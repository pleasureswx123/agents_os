# 智能体工厂 MVP 实施计划

> **给 agentic workers 的要求：** 实施本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，并按任务逐项执行。所有步骤使用 checkbox（`- [x]`）跟踪。

**目标：** 构建智能体工厂平台 MVP，并从第一版开始使用最终架构路线：React Flow、Socket.IO、BullMQ/Redis、MinIO/S3 兼容存储、JWT 鉴权、TemplateVersion、WorkflowSnapshot、PublishedApp 都属于 MVP 基线。

**架构：** 使用 TypeScript monorepo。前端在 `apps/web` 使用 React 19 + Vite；后端在 `apps/api` 使用 NestJS + Fastify；后台任务在 `apps/worker` 使用 BullMQ Worker；共享类型在 `packages/shared`；数据库使用 Prisma + PostgreSQL；队列使用 Redis + BullMQ；产物存储使用 MinIO/S3 兼容存储；运行状态通过 Socket.IO 推送。MVP 是“在最终架构上少开放功能”，不是“先做一套以后要推翻的临时架构”。

**技术栈：** React 19、TypeScript、Vite、React Router、TanStack Query、Zustand、shadcn/ui、Radix UI、Tailwind CSS、React Flow、Socket.IO、Node.js 24 LTS、NestJS、Fastify adapter、Prisma、PostgreSQL 16、Redis 7、BullMQ、MinIO、Vitest、Playwright、pnpm workspace、Turborepo。

---

## 1. 实施前必读文档

实施前必须阅读：

- `docs/MVP-IMPLEMENTATION-READINESS.md`
- `docs/PRD-智能体工厂平台.md`
- `docs/TECH-智能体工厂平台-React-Nodejs.md`
- `docs/architecture/README.md`
- `docs/architecture/01-architecture-diagrams.md`
- `docs/architecture/02-flowcharts.md`
- `docs/architecture/03-sequence-diagrams.md`
- `docs/architecture/04-api-design.md`
- `docs/architecture/05-data-model.md`
- `docs/architecture/06-openapi-draft.md`

## 2. 目标目录结构

实施过程中创建以下结构：

```text
.
  apps/
    api/
      src/
        main.ts
        app.module.ts
        common/
        modules/
          auth/
          templates/
          projects/
          agents/
          agent-versions/
          chats/
          evaluations/
          workflows/
          workflow-runs/
          artifacts/
          published-apps/
          providers/
          storage/
          realtime/
      test/
    web/
      src/
        app/
        pages/
        features/
        components/
        lib/
        styles/
      tests/
    worker/
      src/
        main.ts
        worker.module.ts
        processors/
        services/
      test/
  packages/
    shared/
      src/
        contracts/
        schemas/
        types/
  prisma/
    schema.prisma
    seed.ts
  docs/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## 3. 实施规则

- 不允许用普通列表替代 React Flow。MVP 也使用 React Flow，只限制为线性流程模式。
- 不允许用 SSE 或轮询替代 Socket.IO。HTTP 负责创建运行，Socket.IO 负责推送 run/node 事件和运行控制。
- 不允许通过 HTTP 长请求执行工作流。WorkflowRun / NodeRun 从第一版开始使用 BullMQ + Redis。
- 不允许硬编码本地文件路径。Artifact 从第一版开始走 S3 兼容 StorageProvider，开发默认 MinIO。
- PublishedApp 不允许引用可编辑 Workflow 草稿，必须绑定 WorkflowSnapshot。
- Agent 配置、快照、日志、导出包中不允许保存明文 API key，只允许保存 `apiKeyRef`。
- 每个功能完成前必须有测试。
- 如果当前目录初始化为 git 仓库，每个任务结束后做小粒度 commit。

## 4. 里程碑顺序

```text
任务 1  Monorepo 与基础设施
任务 2  共享类型与校验 schema
任务 3  Prisma schema、迁移与 seed
任务 4  API 基础、鉴权、requestId、Swagger
任务 5  Template 与 Project
任务 6  Agent Studio 后端
任务 7  Agent Studio 前端
任务 8  Evaluation Lab
任务 9  Workflow Builder
任务 10 Workflow Runner 与实时事件
任务 11 Artifact 存储与导出包
任务 12 Published App
任务 13 E2E 验收与文档同步
```

---

### 任务 1：Monorepo 与基础设施基线

**文件：**
- 创建：`package.json`
- 创建：`pnpm-workspace.yaml`
- 创建：`turbo.json`
- 创建：`docker-compose.yml`
- 创建：`.env.example`
- 创建：`apps/api/package.json`
- 创建：`apps/web/package.json`
- 创建：`apps/worker/package.json`
- 创建：`packages/shared/package.json`
- 创建：`apps/api/src/main.ts`
- 创建：`apps/web/src/app/App.tsx`
- 创建：`apps/worker/src/main.ts`

- [x] **步骤 1：初始化 workspace manifest**

根 `package.json` 至少包含：

```json
{
  "name": "agents-os",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "db:generate": "pnpm --filter @agents-os/api prisma generate",
    "db:migrate": "pnpm --filter @agents-os/api prisma migrate dev",
    "db:seed": "pnpm --filter @agents-os/api prisma db seed"
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  }
}
```

- [x] **步骤 2：创建 Docker Compose 基础设施**

`docker-compose.yml` 必须包含 PostgreSQL 16、Redis 7、MinIO：

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: agents_os
      POSTGRES_USER: agents_os
      POSTGRES_PASSWORD: agents_os
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: agents_os
      MINIO_ROOT_PASSWORD: agents_os_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [x] **步骤 3：创建环境变量样例**

`.env.example` 至少包含：

```text
DATABASE_URL=postgresql://agents_os:agents_os@localhost:5432/agents_os
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=agents-os
S3_ACCESS_KEY_ID=agents_os
S3_SECRET_ACCESS_KEY=agents_os_password
JWT_ACCESS_SECRET=dev_access_secret
JWT_REFRESH_SECRET=dev_refresh_secret
PROVIDER_KEY_DEFAULT=replace-with-real-key
OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1
OPENAI_COMPATIBLE_MODEL_ID=gpt-4.1-mini
```

- [x] **步骤 4：验证基础设施**

运行：

```powershell
docker compose up -d
docker compose ps
```

期望：`postgres`、`redis`、`minio` 都处于运行状态。

- [x] **步骤 5：提交**

```powershell
git add package.json pnpm-workspace.yaml turbo.json docker-compose.yml .env.example apps packages
git commit -m "chore: initialize agents os monorepo"
```

---

### 任务 2：共享类型与校验 Schema

**文件：**
- 创建：`packages/shared/src/types/core.ts`
- 创建：`packages/shared/src/types/status.ts`
- 创建：`packages/shared/src/schemas/agent-config.schema.ts`
- 创建：`packages/shared/src/schemas/workflow.schema.ts`
- 创建：`packages/shared/src/schemas/api-response.schema.ts`
- 创建：`packages/shared/src/contracts/socket-events.ts`
- 创建：`packages/shared/src/index.ts`
- 测试：`packages/shared/src/schemas/agent-config.schema.test.ts`
- 测试：`packages/shared/src/schemas/workflow.schema.test.ts`

- [x] **步骤 1：定义状态类型**

状态必须与 `docs/architecture/05-data-model.md` 一致：

```ts
export type WorkflowStatus = 'draft' | 'valid' | 'published' | 'archived';
export type WorkflowRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_human_edit'
  | 'failed'
  | 'rerunning'
  | 'canceled'
  | 'succeeded'
  | 'exporting'
  | 'exported';
export type WorkflowNodeRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'rerunning';
export type PublishedAppStatus = 'draft' | 'enabled' | 'disabled' | 'archived';
```

- [x] **步骤 2：定义 Agent 配置 schema**

使用 Zod 校验：

```text
systemPrompt
provider
runtimeParams
inputSchema
outputSchema
tools
skills
```

测试必须覆盖合法 OpenAI-compatible 配置。

- [x] **步骤 3：定义 WorkflowNode schema**

校验字段：

```text
type
agentVersionId
position
inputMapping
outputKey
allowManualEdit
failurePolicy
enabled
```

- [x] **步骤 4：定义 Socket.IO 事件契约**

事件名：

```ts
export const serverRunEvents = [
  'run.queued',
  'run.running',
  'run.waiting_for_human_edit',
  'run.failed',
  'run.succeeded',
  'run.canceled',
  'run.exporting',
  'run.exported'
] as const;

export const serverNodeEvents = [
  'node.queued',
  'node.running',
  'node.output',
  'node.failed',
  'node.succeeded',
  'node.rerunning',
  'node.skipped'
] as const;

export const clientRunEvents = ['run.join', 'run.control'] as const;
```

- [x] **步骤 5：运行测试**

```powershell
pnpm --filter @agents-os/shared test
```

期望：schema 测试通过。

- [x] **步骤 6：提交**

```powershell
git add packages/shared
git commit -m "feat: add shared contracts and schemas"
```

---

### 任务 3：Prisma Schema、迁移与 Seed 数据

**文件：**
- 创建：`prisma/schema.prisma`
- 创建：`prisma/seed.ts`
- 创建：`apps/api/src/modules/prisma/prisma.module.ts`
- 创建：`apps/api/src/modules/prisma/prisma.service.ts`
- 测试：`apps/api/test/prisma-schema.spec.ts`

- [x] **步骤 1：实现 Prisma schema**

必须包含这些模型：

```text
Organization
User
ProviderConfig
Template
TemplateVersion
Project
Agent
AgentVersion
ChatSession
ChatMessage
TestCase
TestResult
Workflow
WorkflowNode
WorkflowSnapshot
PublishedApp
WorkflowRun
WorkflowNodeRun
Artifact
UsageRecord
```

- [x] **步骤 2：实现 seed 数据**

seed 必须创建：

```text
默认 Organization
默认 admin User
默认 ProviderConfig，apiKeyRef=PROVIDER_KEY_DEFAULT
系统模板：小说/故事生成视频素材包
TemplateVersion v1，包含六个预置 Agent 和默认 Workflow
```

六个预置 Agent：

```text
小说分析智能体
角色画像智能体
场景拆解智能体
分镜脚本智能体
素材生成规划智能体
素材包整理智能体
```

- [x] **步骤 3：运行迁移**

```powershell
pnpm db:migrate
```

期望：所有表成功创建。

- [x] **步骤 4：运行 seed**

```powershell
pnpm db:seed
```

期望：至少存在一个组织、一个管理员、一个系统模板、一个模板版本。

- [x] **步骤 5：添加 schema smoke test**

测试连接 Prisma，并断言：

```text
TemplateVersion count >= 1
ProviderConfig count >= 1
User count >= 1
```

- [x] **步骤 6：提交**

```powershell
git add prisma apps/api/src/modules/prisma apps/api/test/prisma-schema.spec.ts
git commit -m "feat: add prisma schema and seed data"
```

---

### 任务 4：API 基础、鉴权、RequestId 与 Swagger

**文件：**
- 创建：`apps/api/src/main.ts`
- 创建：`apps/api/src/app.module.ts`
- 创建：`apps/api/src/common/interceptors/request-id.interceptor.ts`
- 创建：`apps/api/src/common/filters/api-exception.filter.ts`
- 创建：`apps/api/src/common/dto/api-response.dto.ts`
- 创建：`apps/api/src/modules/auth/auth.module.ts`
- 创建：`apps/api/src/modules/auth/auth.controller.ts`
- 创建：`apps/api/src/modules/auth/auth.service.ts`
- 创建：`apps/api/src/modules/auth/jwt-access.guard.ts`
- 测试：`apps/api/test/auth.e2e-spec.ts`

- [x] **步骤 1：配置 NestJS + Fastify**

`main.ts` 必须：

```text
使用 FastifyAdapter
为 web origin 启用 CORS
注册 requestId interceptor
注册 exception filter
在 /api/docs 启用 Swagger
监听 API_PORT 或 3000
```

- [x] **步骤 2：实现鉴权接口**

接口：

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

MVP 登录使用 seed 的 admin 用户。

- [x] **步骤 3：实现 JWT Guard**

Guard 必须：

```text
读取 Authorization Bearer token
校验 access token
将 userId 和 organizationId 注入 request context
缺失或无效 token 返回 UNAUTHORIZED
```

- [x] **步骤 4：统一响应与错误格式**

错误响应必须符合：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数校验失败",
    "details": {}
  },
  "requestId": "req_..."
}
```

- [x] **步骤 5：测试鉴权**

```powershell
pnpm --filter @agents-os/api test:e2e -- auth.e2e-spec.ts
```

期望：

```text
POST /api/auth/login 返回 accessToken 和 refreshToken
无 token 访问受保护接口返回 401
带 token 访问受保护接口返回 200
```

- [x] **步骤 6：提交**

```powershell
git add apps/api
git commit -m "feat: add api foundation and auth"
```

---

### 任务 5：Template 与 Project

**文件：**
- 创建：`apps/api/src/modules/templates/templates.module.ts`
- 创建：`apps/api/src/modules/templates/templates.controller.ts`
- 创建：`apps/api/src/modules/templates/templates.service.ts`
- 创建：`apps/api/src/modules/projects/projects.module.ts`
- 创建：`apps/api/src/modules/projects/projects.controller.ts`
- 创建：`apps/api/src/modules/projects/projects.service.ts`
- 测试：`apps/api/test/projects.e2e-spec.ts`
- 创建：`apps/web/src/pages/ProjectsPage.tsx`
- 创建：`apps/web/src/pages/ProjectWorkspacePage.tsx`

- [x] **步骤 1：实现模板 API**

接口：

```text
GET /api/templates
GET /api/templates/:templateId/versions/:versionId
```

- [x] **步骤 2：实现基于 TemplateVersion 创建 Project**

`POST /api/projects` 必须：

```text
读取 TemplateVersion.snapshot
创建 Project
复制预置 Agents
创建初始 AgentVersions
创建 Workflow
创建 WorkflowNodes
返回 Project 摘要
```

- [x] **步骤 3：实现 Project API**

接口：

```text
GET /api/projects
GET /api/projects/:projectId
PATCH /api/projects/:projectId
DELETE /api/projects/:projectId
POST /api/projects/:projectId/save-as-template
```

- [x] **步骤 4：实现前端项目列表和工作区壳**

页面：

```text
/projects
/projects/:projectId
```

工作区页面展示：

```text
Project name
Agent count
Workflow count
Recent runs placeholder area
Links to Agent Studio, Evaluation Lab, Workflow Builder
```

- [x] **步骤 5：测试项目创建**

```powershell
pnpm --filter @agents-os/api test:e2e -- projects.e2e-spec.ts
```

期望：

```text
从系统模板创建项目后生成六个 Agent 和一个默认 Workflow
项目副本修改不影响系统模板
```

- [x] **步骤 6：提交**

```powershell
git add apps/api/src/modules/templates apps/api/src/modules/projects apps/web/src/pages apps/api/test/projects.e2e-spec.ts
git commit -m "feat: add templates and project creation"
```

---

### 任务 6：Agent Studio 后端

**文件：**
- 创建：`apps/api/src/modules/agents/agents.module.ts`
- 创建：`apps/api/src/modules/agents/agents.controller.ts`
- 创建：`apps/api/src/modules/agents/agents.service.ts`
- 创建：`apps/api/src/modules/agent-versions/agent-versions.module.ts`
- 创建：`apps/api/src/modules/agent-versions/agent-versions.service.ts`
- 创建：`apps/api/src/modules/chats/chats.module.ts`
- 创建：`apps/api/src/modules/chats/chats.controller.ts`
- 创建：`apps/api/src/modules/chats/chats.service.ts`
- 创建：`apps/api/src/modules/providers/llm-provider.interface.ts`
- 创建：`apps/api/src/modules/providers/openai-compatible.provider.ts`
- 测试：`apps/api/test/agents.e2e-spec.ts`

- [x] **步骤 1：实现 Agent CRUD**

接口：

```text
GET /api/projects/:projectId/agents
POST /api/projects/:projectId/agents
GET /api/agents/:agentId
PATCH /api/agents/:agentId
POST /api/agents/:agentId/copy
DELETE /api/agents/:agentId
```

- [x] **步骤 2：实现 Agent 删除依赖规则**

如果任意 WorkflowNode 引用了该 Agent 下的 AgentVersion，返回 `AGENT_IN_USE`，并带上依赖详情。

- [x] **步骤 3：实现 AgentVersion API**

接口：

```text
POST /api/agents/:agentId/versions
GET /api/agents/:agentId/versions
GET /api/agent-versions/:versionId
POST /api/agents/:agentId/restore-version
```

- [x] **步骤 4：实现 LLM Provider 抽象**

接口：

```ts
chat(request: LlmChatRequest): Promise<LlmChatResponse>
```

Provider 必须通过 `apiKeyRef` 读取密钥，不允许从 Agent 配置读取明文 key。

- [x] **步骤 5：实现聊天测试接口**

`POST /api/agents/:agentId/chat` 必须：

```text
加载 Agent draftConfig
校验 inputSchema
调用 OpenAI-compatible provider
当 responseFormat=json 时解析 JSON
保存 ChatSession 和 ChatMessage
返回 output、rawText、parseError、usage
```

- [x] **步骤 6：测试 Agent 行为**

测试中使用 mock LLM provider。

```powershell
pnpm --filter @agents-os/api test:e2e -- agents.e2e-spec.ts
```

期望：

```text
Agent CRUD 可用
被引用的 Agent 删除失败并返回 AGENT_IN_USE
聊天接口返回解析后的 JSON
JSON 解析失败时保留 rawText 和 parseError
AgentVersion 快照不可变
```

- [x] **步骤 7：提交**

```powershell
git add apps/api/src/modules/agents apps/api/src/modules/agent-versions apps/api/src/modules/chats apps/api/src/modules/providers apps/api/test/agents.e2e-spec.ts
git commit -m "feat: add agent studio backend"
```

---

### 任务 7：Agent Studio 前端

**文件：**
- 创建：`apps/web/src/pages/AgentStudioPage.tsx`
- 创建：`apps/web/src/features/agents/api.ts`
- 创建：`apps/web/src/features/agents/components/AgentList.tsx`
- 创建：`apps/web/src/features/agents/components/AgentConfigPanel.tsx`
- 创建：`apps/web/src/features/agents/components/AgentChatPanel.tsx`
- 创建：`apps/web/src/features/agents/components/AgentVersionPanel.tsx`
- 创建：`apps/web/src/features/agents/store.ts`
- 测试：`apps/web/tests/agent-studio.spec.ts`

- [x] **步骤 1：添加路由**

路由：

```text
/projects/:projectId/agents/:agentId?
```

- [x] **步骤 2：实现 Agent Studio 布局**

布局：

```text
左侧：Agent 列表
中间：聊天测试区
右侧：配置 / 版本 / 测试用例 Tabs
```

- [x] **步骤 3：接入 Monaco Editor**

用于编辑：

```text
systemPrompt
inputSchema
outputSchema
runtimeParams
```

- [x] **步骤 4：接入聊天接口**

聊天面板必须：

```text
发送测试输入
展示解析后的 output
解析失败时展示 rawText 和 parseError
展示 usage
提供保存为测试用例的入口
提供保存版本入口
```

- [x] **步骤 5：添加 Playwright 测试**

```powershell
pnpm --filter @agents-os/web test:e2e -- agent-studio.spec.ts
```

期望：

```text
用户可以打开 Agent Studio
用户可以选择预置 Agent
用户可以编辑 prompt
用户可以通过 mock API 发送聊天测试
用户可以保存 AgentVersion
```

- [x] **步骤 6：提交**

```powershell
git add apps/web/src/pages/AgentStudioPage.tsx apps/web/src/features/agents apps/web/tests/agent-studio.spec.ts
git commit -m "feat: add agent studio frontend"
```

---

### 任务 8：Evaluation Lab

**文件：**
- 创建：`apps/api/src/modules/evaluations/evaluations.module.ts`
- 创建：`apps/api/src/modules/evaluations/evaluations.controller.ts`
- 创建：`apps/api/src/modules/evaluations/evaluations.service.ts`
- 创建：`apps/web/src/pages/EvaluationLabPage.tsx`
- 创建：`apps/web/src/features/evaluations/api.ts`
- 创建：`apps/web/src/features/evaluations/components/TestCaseList.tsx`
- 创建：`apps/web/src/features/evaluations/components/TestResultCompare.tsx`
- 测试：`apps/api/test/evaluations.e2e-spec.ts`
- 测试：`apps/web/tests/evaluation-lab.spec.ts`

- [x] **步骤 1：实现后端 API**

接口：

```text
GET /api/agents/:agentId/test-cases
POST /api/agents/:agentId/test-cases
PATCH /api/test-cases/:testCaseId
POST /api/test-cases/:testCaseId/run
GET /api/test-cases/:testCaseId/results
PATCH /api/test-results/:resultId
```

- [x] **步骤 2：通过 AgentVersion 运行测试用例**

运行测试用例必须使用 `AgentVersion.configSnapshot`，不能使用 `Agent.draftConfig`。

- [x] **步骤 3：实现前端版本对比 UI**

同一个 TestCase 可以对比多个 AgentVersion 的输出。

- [x] **步骤 4：测试 Evaluation Lab**

期望：

```text
可以从聊天消息创建 TestCase
可以用 AgentVersion 运行 TestCase
可以保存 TestResult output 和 usage
可以更新 good/average/bad 评分
可以对比两个版本
```

- [x] **步骤 5：提交**

```powershell
git add apps/api/src/modules/evaluations apps/web/src/pages/EvaluationLabPage.tsx apps/web/src/features/evaluations apps/api/test/evaluations.e2e-spec.ts apps/web/tests/evaluation-lab.spec.ts
git commit -m "feat: add evaluation lab"
```

---

### 任务 9：使用 React Flow 实现 Workflow Builder

**文件：**
- 创建：`apps/api/src/modules/workflows/workflows.module.ts`
- 创建：`apps/api/src/modules/workflows/workflows.controller.ts`
- 创建：`apps/api/src/modules/workflows/workflows.service.ts`
- 创建：`apps/web/src/pages/WorkflowBuilderPage.tsx`
- 创建：`apps/web/src/features/workflows/api.ts`
- 创建：`apps/web/src/features/workflows/components/WorkflowCanvas.tsx`
- 创建：`apps/web/src/features/workflows/components/WorkflowNodeConfigPanel.tsx`
- 创建：`apps/web/src/features/workflows/components/CreateSnapshotDialog.tsx`
- 测试：`apps/api/test/workflows.e2e-spec.ts`
- 测试：`apps/web/tests/workflow-builder.spec.ts`

- [x] **步骤 1：实现 Workflow API**

接口：

```text
GET /api/projects/:projectId/workflows
POST /api/projects/:projectId/workflows
GET /api/workflows/:workflowId
PATCH /api/workflows/:workflowId
DELETE /api/workflows/:workflowId
POST /api/workflows/:workflowId/nodes
PATCH /api/workflow-nodes/:nodeId
DELETE /api/workflow-nodes/:nodeId
POST /api/workflows/:workflowId/snapshots
```

- [x] **步骤 2：实现 WorkflowSnapshot 创建**

快照必须冻结：

```text
Workflow metadata
WorkflowNode list
AgentVersion IDs
AgentVersion configSnapshot
inputMapping
outputKey
failurePolicy
allowManualEdit
```

- [x] **步骤 3：实现 React Flow 线性模式**

MVP 只允许：

```text
一条 start-to-end 线性链路
新增节点
删除节点
节点排序
节点禁用
节点配置面板
```

- [x] **步骤 4：校验可发布性**

创建快照前，每个启用节点必须具备：

```text
type
agent 节点必须有 agentVersionId
inputMapping
outputKey
failurePolicy
```

- [x] **步骤 5：测试 Workflow Builder**

期望：

```text
用户可以在 React Flow 中新增节点
用户可以绑定 AgentVersion
用户可以保存 inputMapping
用户可以创建不可变 WorkflowSnapshot
```

- [x] **步骤 6：提交**

```powershell
git add apps/api/src/modules/workflows apps/web/src/pages/WorkflowBuilderPage.tsx apps/web/src/features/workflows apps/api/test/workflows.e2e-spec.ts apps/web/tests/workflow-builder.spec.ts
git commit -m "feat: add workflow builder"
```

---

### 任务 10：Workflow Runner、BullMQ 与 Socket.IO

**文件：**
- 创建：`apps/api/src/modules/workflow-runs/workflow-runs.module.ts`
- 创建：`apps/api/src/modules/workflow-runs/workflow-runs.controller.ts`
- 创建：`apps/api/src/modules/workflow-runs/workflow-runs.service.ts`
- 创建：`apps/api/src/modules/realtime/realtime.module.ts`
- 创建：`apps/api/src/modules/realtime/realtime.gateway.ts`
- 创建：`apps/worker/src/processors/workflow-run.processor.ts`
- 创建：`apps/worker/src/services/workflow-runner.service.ts`
- 创建：`apps/web/src/pages/WorkflowRunPage.tsx`
- 创建：`apps/web/src/features/workflow-runs/socket.ts`
- 测试：`apps/api/test/workflow-runs.e2e-spec.ts`
- 测试：`apps/worker/test/workflow-runner.spec.ts`
- 测试：`apps/web/tests/workflow-run.spec.ts`

- [x] **步骤 1：实现创建运行 API**

`POST /api/workflows/:workflowId/runs` 必须：

```text
校验 Workflow
创建 WorkflowRun(status=queued)
投递 BullMQ job
返回 workflowRunId 和 socketRoom
```

- [x] **步骤 2：实现 Socket.IO Gateway**

事件：

```text
run.join
run.control
run.queued
run.running
run.failed
run.succeeded
node.running
node.output
node.failed
node.succeeded
```

- [x] **步骤 3：实现 Worker Runner**

Worker 必须：

```text
加载 WorkflowSnapshot 或 Workflow
按顺序执行 enabled nodes
解析 inputMapping
使用 AgentVersion.configSnapshot 调用 LLM provider
保存 WorkflowNodeRun
保存 UsageRecord
通过 Socket.IO 发布事件
failurePolicy=stop 时停止
failurePolicy=skip 时跳过
```

- [x] **步骤 4：实现编辑输出和重跑**

接口：

```text
PATCH /api/workflow-runs/:runId/nodes/:nodeRunId/output
POST /api/workflow-runs/:runId/rerun-node
POST /api/workflow-runs/:runId/resume
POST /api/workflow-runs/:runId/cancel
```

- [x] **步骤 5：实现 WorkflowRun 前端页面**

页面展示：

```text
Run status
Node status list
Node input
Node output
Node errors
Edit output
Rerun failed node
Resume
Cancel
```

- [x] **步骤 6：测试 Runner**

期望：

```text
创建 run 后 API 快速返回 queued status
Worker 执行节点
Socket.IO 推送 run 和 node events
失败会停止 run
重跑会创建 rerun node record
edited output 会被下游节点使用
```

- [x] **步骤 7：提交**

```powershell
git add apps/api/src/modules/workflow-runs apps/api/src/modules/realtime apps/worker apps/web/src/pages/WorkflowRunPage.tsx apps/web/src/features/workflow-runs apps/api/test/workflow-runs.e2e-spec.ts apps/worker/test/workflow-runner.spec.ts apps/web/tests/workflow-run.spec.ts
git commit -m "feat: add workflow runner and realtime events"
```

---

### 任务 11：Artifact 存储与导出包

**文件：**
- 创建：`apps/api/src/modules/storage/storage.module.ts`
- 创建：`apps/api/src/modules/storage/storage.service.ts`
- 创建：`apps/api/src/modules/artifacts/artifacts.module.ts`
- 创建：`apps/api/src/modules/artifacts/artifacts.controller.ts`
- 创建：`apps/api/src/modules/artifacts/artifacts.service.ts`
- 创建：`apps/api/src/modules/artifacts/export-package.builder.ts`
- 创建：`apps/web/src/features/artifacts/api.ts`
- 创建：`apps/web/src/features/artifacts/components/ExportPackagePanel.tsx`
- 测试：`apps/api/test/artifacts.e2e-spec.ts`

- [x] **步骤 1：实现 S3 兼容存储服务**

Storage service 必须支持：

```text
putObject(key, body, contentType)
getObject(key)
getSignedDownloadUrl(key)
objectExists(key)
```

开发环境通过 S3-compatible client 连接 MinIO。

- [x] **步骤 2：实现导出包构建器**

完成的 WorkflowRun 导出：

```text
01_script/storyboard.md
01_script/narration.md
02_voiceover/voiceover_tasks.json
03_dialogue/dialogue_tasks.json
04_video_clips/video_tasks.json
05_images/image_prompts.json
06_sfx/sfx_tasks.json
07_subtitles/subtitles.srt
edit_plan.csv
manifest.json
README.md
package.zip
```

- [x] **步骤 3：保留可追溯信息**

`manifest.json` 必须包含：

```text
projectName
workflowRunId
workflowNodeRunId
agentVersionId
nodeOutputKey
generatedAt
asset paths
```

- [x] **步骤 4：确保不泄露密钥**

导出包不得包含：

```text
apiKeyRef
API key values
provider base URL if hidden from published app
system prompt unless explicitly exported by factory-side user
```

- [x] **步骤 5：测试导出**

期望：

```text
完成的 run 可以导出 package.zip
zip 包含 manifest.json 和 README.md
manifest 包含 run/node/version 可追溯信息
zip 内容不出现 API key 或 apiKeyRef
```

- [x] **步骤 6：提交**

```powershell
git add apps/api/src/modules/storage apps/api/src/modules/artifacts apps/web/src/features/artifacts apps/api/test/artifacts.e2e-spec.ts
git commit -m "feat: add artifact storage and export packages"
```

---

### 任务 12：Published App

**文件：**
- 创建：`apps/api/src/modules/published-apps/published-apps.module.ts`
- 创建：`apps/api/src/modules/published-apps/published-apps.controller.ts`
- 创建：`apps/api/src/modules/published-apps/published-apps.service.ts`
- 创建：`apps/web/src/pages/PublishedAppPage.tsx`
- 创建：`apps/web/src/features/published-apps/api.ts`
- 创建：`apps/web/src/features/published-apps/components/PublicRunProgress.tsx`
- 测试：`apps/api/test/published-apps.e2e-spec.ts`
- 测试：`apps/web/tests/published-app.spec.ts`

- [x] **步骤 1：实现 PublishedApp 管理 API**

接口：

```text
POST /api/projects/:projectId/published-apps
```

必须要求 `workflowSnapshotId`。

- [x] **步骤 2：实现公开应用信息 API**

`GET /api/published-apps/:slug` 只返回：

```text
name
description
publicInputSchema
publicParams
branding
status
```

不得返回：

```text
systemPrompt
modelId
providerConfig
apiKeyRef
WorkflowNode internals
AgentVersion configSnapshot
```

- [x] **步骤 3：实现公开运行 API**

`POST /api/published-apps/:slug/runs` 必须：

```text
校验 publicInputSchema
创建 WorkflowRun(source=published_app)
使用 PublishedApp.workflowSnapshotId
投递 BullMQ job
返回 publicRunId 和 socketRoom
```

- [x] **步骤 4：实现公开页面**

页面包含：

```text
Text input
Style selector
Aspect ratio selector
Run button
Realtime progress
Download button when exported
```

- [x] **步骤 5：测试 Published App**

期望：

```text
工厂侧用户可以基于 WorkflowSnapshot 创建 PublishedApp
公开应用信息不暴露内部配置
小白用户可以创建 run
即使 Workflow 草稿变化，public run 仍使用 snapshot
小白用户可以下载导出包
```

- [x] **步骤 6：提交**

```powershell
git add apps/api/src/modules/published-apps apps/web/src/pages/PublishedAppPage.tsx apps/web/src/features/published-apps apps/api/test/published-apps.e2e-spec.ts apps/web/tests/published-app.spec.ts
git commit -m "feat: add published app runtime"
```

---

### 任务 13：E2E 验收与文档同步

**文件：**
- 创建：`apps/web/tests/mvp-happy-path.spec.ts`
- 创建：`docs/RUNBOOK.md`
- 修改：`docs/MVP-IMPLEMENTATION-READINESS.md`
- 修改：`docs/TECH-智能体工厂平台-React-Nodejs.md`

- [x] **步骤 1：添加 E2E happy path**

Playwright 测试覆盖：

```text
Login
Create project from system template
Open preset Novel Analysis Agent
Run chat test with mock provider
Save AgentVersion
Open Workflow Builder
Create WorkflowSnapshot
Run Workflow
Observe Socket.IO status updates
Export package
Create PublishedApp
Run PublishedApp
Download package
```

- [x] **步骤 2：添加运行手册**

`docs/RUNBOOK.md` 必须包含：

```text
Prerequisites
Environment setup
Docker Compose startup
Database migration
Seed command
Web/API/Worker startup
Test commands
Troubleshooting
```

- [x] **步骤 3：运行完整验证**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm --filter @agents-os/web test:e2e
```

期望：

```text
Lint 通过
单元测试和集成测试通过
Build 通过
E2E happy path 通过
```

- [x] **步骤 4：同步文档**

允许更新：

```text
实际端口
最终脚本名
准确环境变量
已知 MVP 限制
```

不允许在没有明确评审的情况下修改核心架构决策。

- [x] **步骤 5：提交**

```powershell
git add apps docs
git commit -m "test: add mvp acceptance coverage and runbook"
```

---

## 5. 验证矩阵

| 需求 | 覆盖任务 |
| --- | --- |
| 基于模板创建项目 | 任务 5 |
| 六个预置 Agent | 任务 3、任务 5 |
| Agent CRUD 与聊天测试 | 任务 6、任务 7 |
| AgentVersion 快照 | 任务 6 |
| TestCase 与 TestResult | 任务 8 |
| React Flow 线性工作流 | 任务 9 |
| WorkflowSnapshot 发布模型 | 任务 9、任务 12 |
| BullMQ 工作流执行 | 任务 10 |
| Socket.IO 运行事件 | 任务 10 |
| 失败节点重跑 | 任务 10 |
| 中间输出编辑 | 任务 10 |
| MinIO/S3 Artifact 存储 | 任务 11 |
| 导出素材包 | 任务 11 |
| Published App 公开运行 | 任务 12 |
| 公开应用和导出包不泄露密钥 | 任务 11、任务 12 |
| MVP 端到端验收 | 任务 13 |

## 6. 自检记录

需求覆盖：

- 产品范围由任务 5 至任务 13 覆盖。
- 技术架构基线由任务 1 至任务 4，以及任务 10 至任务 12 覆盖。
- 数据模型由任务 3 覆盖。
- API 与实时事件契约由任务 4 至任务 12 覆盖。
- 导出与 Artifact 可追溯性由任务 11 覆盖。

MVP 架构连续性：

- React Flow 从 MVP 开始使用。
- Socket.IO 从 MVP 开始使用。
- BullMQ + Redis 从 MVP 开始使用。
- MinIO/S3 兼容存储从 MVP 开始使用。
- JWT + Refresh Token 从 MVP 开始使用。
- TemplateVersion 和 WorkflowSnapshot 从 MVP 开始使用。

有意保留的 MVP 功能边界：

- 第一版不要求真实媒体生成 Provider。
- 第一版不要求复杂 DAG 分支。
- 第一版不要求多组织角色矩阵。
- 第一版不要求计费和额度控制。
