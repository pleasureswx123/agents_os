# AGENTS.md

## 项目目标

本项目是“智能体工厂平台”：面向懂 AI 的开发者/业务设计者，支持创建、配置、调试、版本化和编排多个智能体，并将成熟 Workflow 发布成小白用户可运行的 Published App。

首个业务模板是“小说/故事生成视频素材包”。平台负责生成结构化素材包和剪辑辅助文件，不负责最终视频合成。

## 最高优先级架构规则

MVP 可以减少功能范围，但不能选择临时、割裂、以后必然替换的技术路线。

必须遵循：

- MVP 在最终架构上少开放功能，而不是先做一套以后要推翻的简单架构。
- 后续阶段应在同一架构上渐进增强。
- 对实时通信、任务队列、文件存储、鉴权、模板版本、发布快照等底层能力，禁止使用“先简单凑合，后面再换”的方案。

## 技术栈基线

- 前端：React 19 + TypeScript + Vite
- 路由：React Router
- 服务端状态：TanStack Query
- 客户端状态：Zustand
- UI：shadcn/ui + Radix UI + Tailwind CSS
- 工作流画布：React Flow，MVP 只开放线性流程模式
- 实时通信：Socket.IO / WebSocket
- 后端：Node.js 24 LTS + NestJS + Fastify adapter + TypeScript
- ORM：Prisma
- 数据库：PostgreSQL 16
- 队列：Redis 7 + BullMQ
- 文件/产物存储：S3 兼容 StorageProvider，开发与私有化默认 MinIO
- 鉴权：JWT + Refresh Token，MVP 单组织单管理员
- 测试：Vitest + Playwright
- Monorepo：pnpm workspace + Turborepo

## 禁止事项

- 不要用普通列表替代 React Flow；MVP 也必须使用 React Flow，只限制为线性流程模式。
- 不要用 SSE 或轮询替代 Socket.IO 作为主要实时方案。
- 不要用同步 HTTP 长请求执行 WorkflowRun；必须使用 BullMQ + Redis。
- 不要硬编码本地文件路径作为产物存储；必须走 S3 兼容 StorageProvider。
- 不要让 PublishedApp 直接引用可编辑 Workflow 草稿；必须绑定 WorkflowSnapshot。
- 不要把 API key 明文写入 Agent 配置、日志、快照或导出包；只能保存 `apiKeyRef`。
- 不要绕过 TemplateVersion；系统模板必须 seed 到数据库并按版本管理。
- 不要在未更新文档的情况下修改核心架构决策。

## 目录约定

```text
apps/web        React 前端工作台与 Published App 页面
apps/api        NestJS API、REST、Socket.IO Gateway
apps/worker     BullMQ Worker、WorkflowRun / NodeRun 执行
packages/shared 共享类型、Zod schema、Socket.IO 事件契约
prisma          Prisma schema、迁移、seed
docs            PRD、技术方案、架构图、API、数据结构、实施计划
```

## 必读文档

实施前先读：

- `docs/MVP-IMPLEMENTATION-READINESS.md`
- `docs/superpowers/plans/2026-06-10-agent-foundry-mvp-implementation.md`
- `docs/TECH-智能体工厂平台-React-Nodejs.md`
- `docs/architecture/README.md`
- `docs/architecture/04-api-design.md`
- `docs/architecture/05-data-model.md`

## 实施顺序

按以下顺序推进：

```text
基础设施
-> 数据模型与迁移
-> Auth
-> Template / Project
-> Agent Studio
-> AgentVersion
-> Evaluation Lab
-> Workflow Builder
-> Workflow Runner
-> Artifact Export
-> Published App
-> E2E 验收
```

实施开始后，必须持续推进直至 `docs/superpowers/plans/2026-06-10-agent-foundry-mvp-implementation.md` 中的任务列表全部完成。不能只完成部分任务后停止，也不能在未完成完整验证前声明项目完成。

## 验证要求

每个任务完成前必须至少运行对应测试。

整个项目完成的标准：

- 实施计划中的所有任务均已完成。
- Web、API、Worker、PostgreSQL、Redis、MinIO 能按文档正常启动。
- 核心功能链路可正常运行：登录、模板创建项目、Agent 调试、保存版本、测试用例、Workflow 编排、WorkflowRun 执行、Socket.IO 状态推送、失败重跑、Artifact 导出、Published App 运行与下载。
- `pnpm lint`、`pnpm test`、`pnpm build`、`pnpm --filter @agents-os/web test:e2e` 均通过，或在最终回复中明确说明无法运行的原因和剩余风险。

常用命令：

```powershell
pnpm lint
pnpm test
pnpm build
pnpm --filter @agents-os/web test:e2e
```

如果某条命令暂时无法运行，必须在最终回复中说明原因、已验证内容和剩余风险。

## 文档同步要求

如果实现与文档发生偏差，优先判断是否违反架构规则。

- 不违反架构规则：同步更新相关文档。
- 可能违反架构规则：不要停下来等待用户确认；必须基于 `AGENTS.md`、`docs/MVP-IMPLEMENTATION-READINESS.md`、技术方案和架构文档自行判断，选择最符合“最终架构渐进增强”原则的方案，并在实施记录或最终回复中说明决策依据。
- 只有在现有文档无法支持继续实施、且继续推进会明显破坏项目目标或造成不可逆风险时，才允许标记为 blocked；不要因为普通技术取舍、实现细节不确定或需要偏好确认而暂停。
