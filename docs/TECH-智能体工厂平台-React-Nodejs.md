# 智能体工厂平台技术方案

## 1. 文档信息

- 产品名称：智能体工厂平台
- 文档类型：技术方案文档
- 技术栈：React + Node.js
- 当前版本：v0.1
- 创建日期：2026-06-10
- 对应 PRD：`docs/PRD-智能体工厂平台.md`

## 2. 技术方案总目标

本技术方案用于支撑“智能体工厂平台”的 MVP 落地，并为后续商品化、模板化、SaaS 化和多模型接入预留架构空间。

平台不是一个一次性小说处理脚本，而是一个可持续演进的多智能体生产系统。技术方案要同时满足三个层面的目标：

```text
开发者工作台目标：
让 AI 开发者可以创建、配置、调试、评测、版本化和编排多个智能体。

业务应用目标：
让成熟工作流可以被发布成小白用户可直接使用的简化应用。

平台商品化目标：
让模板、模型供应商、工具能力、运行记录、素材产物、成本统计和用户入口具备后续商业化扩展空间。
```

### 2.1 MVP 交付目标

MVP 需要完成一个可运行、可调试、可导出的最小业务闭环：

- 基于系统模板创建项目。
- 在项目中生成预置 Agent 和默认 Workflow。
- 创建、配置、复制、删除和新增 Agent。
- 通过聊天方式调试单个 Agent。
- 保存 Agent Version，形成可回滚的配置快照。
- 将聊天输入输出沉淀为 Test Case。
- 对 Agent 输出进行人工评分和版本对比。
- 线性编排多个 Agent，形成 Workflow。
- 执行 WorkflowRun，并记录每个节点的输入、输出、状态、错误和耗时。
- 支持人工编辑中间结果后继续运行。
- 支持失败节点重跑。
- 导出结构化素材包。
- 将成熟 Workflow 发布为小白用户可使用的 Published App。

### 2.2 技术底座目标

技术底座必须支撑平台长期扩展，而不是只服务首个小说模板。

核心要求：

- 通用 Agent 模型：Agent 配置不绑定小说业务，可用于任意文本处理、规划、生成或工具调用场景。
- 版本化配置：每次稳定调优结果都能保存为 AgentVersion，Workflow 节点绑定具体版本，保证运行可复现。
- 结构化输入输出：Agent、WorkflowNode 和 Artifact 都以 schema 和 JSON 为核心，降低上下游断裂风险。
- 可观测运行：WorkflowRun 必须记录每一步的输入、输出、错误、状态、耗时和使用的 AgentVersion。
- 可替换 Provider：LLM、文件存储、未来媒体生成服务都通过适配层接入，避免供应商锁死。
- 可导出 Artifact：最终结果不仅能在页面查看，还能打包为外部软件可使用的素材目录。

### 2.3 开发体验目标

平台第一阶段由懂 AI 的开发者使用，因此技术方案要优先保障调试效率。

需要做到：

- 前端配置改动能快速保存和测试。
- Agent Studio 中聊天测试、prompt 编辑、版本保存处于同一工作上下文。
- Workflow Run 的每个节点都能展开查看输入、输出和错误。
- 模型原始输出必须保留，避免 JSON 解析失败后丢失排错信息。
- 后端模块边界清晰，后续新增 Provider、Tool、Workflow 节点类型时不需要大改核心代码。

### 2.4 小白应用目标

Published App 是商品化入口的雏形。

小白用户端需要做到：

- 不暴露 Agent、prompt、model、API key、WorkflowNode 等底层概念。
- 只展示业务输入、少量参数、运行进度和下载入口。
- Published App 调用的仍是同一套 Workflow Runtime，避免维护两套业务逻辑。
- 可为不同模板生成不同的小白入口，例如小说素材包、短剧分镜、儿童故事绘本等。

### 2.5 商品化目标

技术方案要为后续商品化预留以下能力：

- 模板商品化：系统模板、自定义模板、行业模板可以被复用、发布、复制和版本化。
- 应用商品化：成熟 Workflow 可以发布为独立业务应用，对小白用户隐藏复杂配置。
- Provider 商品化：不同模型供应商、媒体生成供应商可以通过统一 Provider 层接入。
- 运行计量：WorkflowRun、NodeRun、模型 token、文件产物和耗时都要可统计，后续可用于成本核算和套餐计费。
- 多租户演进：MVP 可单用户，但数据模型应避免阻碍后续 Organization、User、Role、Workspace 的加入。
- 部署形态演进：第一版支持本地或自托管，后续可演进为私有化部署和 SaaS。

### 2.6 技术原则

本方案坚持以下原则：

- 底层通用：数据模型、运行时和 API 不绑定单一小说业务。
- 首个体验具体：系统内置“小说/故事生成视频素材包”模板，用它验证完整链路。
- 先单体后拆分：MVP 使用模块化单体，避免过早微服务化，但模块边界按未来可拆分服务设计。
- 异步任务从第一版开始：MVP 即使用 BullMQ + Redis 承载 WorkflowRun 和 NodeRun 调度，避免先同步执行、后异步改造。
- 存储接口从第一版开始：MVP 即使用 S3 兼容 StorageProvider，开发和私有化默认 MinIO，避免先本地路径、后对象存储迁移。
- 鉴权模型从第一版开始：MVP 即使用 JWT + Refresh Token，可以只开放单组织单管理员能力，但不使用无鉴权或临时登录方案。
- 先文本后媒体：MVP 先完成 LLM 文本智能体和素材规划，但媒体生成也通过 Tool/Provider 架构占位，后续只新增 Provider，不改调用模型。
- 先人工评测后自动评测：MVP 先支持人工评分和版本对比，后续再做自动评测和批量回归。

## 3. 总体架构

### 3.1 架构形态

MVP 推荐采用单体 Web 应用架构，前后端分离：

```text
React Web App
  -> Node.js API Server
    -> PostgreSQL
    -> Redis / BullMQ
    -> MinIO / S3-compatible Object Storage
    -> LLM Provider APIs
```

第一版不引入复杂微服务，但 WorkflowRun 和 NodeRun 从 MVP 阶段即通过 BullMQ + Redis 调度。MVP 可以只启动一个 API 进程和一个 Worker 进程，功能上只开放线性流程；后续扩展时增加 Worker 数量、队列类型和节点能力，不改变任务调度架构。

### 3.2 技术选型总览

技术选型先给出一张总览表，便于快速判断平台的技术基线。表中的选型面向“可商品化演进”的完整平台；MVP 可以按后文说明做裁剪。

| 层级 | 技术选型 |
| --- | --- |
| 前端框架 | React 19 + TypeScript |
| 前端构建 | Vite |
| 前端路由 | React Router |
| 服务端状态 | TanStack Query |
| 客户端状态 | Zustand |
| UI 组件 | shadcn/ui + Radix UI + Tailwind CSS |
| 结构化编辑器 | Monaco Editor |
| 工作流画布 | React Flow，MVP 阶段以线性流程模式使用，后续扩展 DAG、分支和条件节点 |
| 实时通信 | Socket.IO + WebSocket，MVP 阶段即采用双向实时通信；SSE 不作为主方案 |
| 后端框架 | Node.js 24 LTS + NestJS + TypeScript |
| HTTP 适配 | Fastify 优先，Express 兼容 |
| ORM | Prisma |
| 主数据库 | PostgreSQL |
| 向量检索 | PostgreSQL + pgvector，后期可切 Qdrant |
| 缓存 / 会话 / 队列 | Redis |
| 异步任务队列 | BullMQ |
| 文件 / 产物存储 | S3 兼容对象存储，开发与私有化默认 MinIO，生产可接 AWS S3 / 阿里云 OSS / 腾讯云 COS |
| 鉴权 | JWT + Refresh Token，MVP 单组织单管理员，企业版支持 OAuth / SSO |
| API 文档 | OpenAPI / Swagger |
| LLM 接入 | OpenAI-compatible Provider Adapter |
| 媒体生成接入 | Tool / Provider Adapter，后续接音频、图片、视频生成服务 |
| 日志与链路追踪 | OpenTelemetry + structured logs |
| 配置管理 | dotenv + NestJS Config，生产环境接 Secret Manager |
| 测试 | Vitest + Playwright |
| Monorepo | pnpm workspace + Turborepo |
| 本地开发部署 | Docker Compose |
| 生产部署 | Kubernetes，私有化可用 Docker Compose 简化部署 |

#### 3.2.1 MVP 技术裁剪

MVP 不需要一次性把上表所有能力都做满。推荐裁剪如下：

| 能力 | MVP 做法 | 后续商品化做法 |
| --- | --- | --- |
| 工作流编排 | React Flow 线性流程模式，仅开放顺序节点 | 在同一 React Flow 架构上扩展 DAG、分支、条件节点和子流程 |
| 实时通信 | Socket.IO 推送 WorkflowRun 状态、节点日志和运行控制事件 | 扩展为多人协作、实时画布同步和更复杂的双向控制 |
| 异步任务 | BullMQ + Redis 调度 WorkflowRun / NodeRun，MVP 可只启动一个 Worker | 横向扩展多 Worker、优先级队列、重试策略和任务隔离 |
| 文件存储 | S3 兼容 StorageProvider，开发和私有化默认 MinIO | 按部署环境切换 AWS S3 / 阿里云 OSS / 腾讯云 COS |
| 鉴权 | JWT + Refresh Token，MVP 单组织单管理员 | 扩展组织、角色、OAuth / SSO、API Token |
| 向量检索 | 使用 PostgreSQL + pgvector 的数据结构占位，MVP 可不开放检索功能 | 规模扩大后切 Qdrant 或独立向量服务 |
| 部署 | 本地 Docker Compose | Kubernetes + 独立 Worker + 对象存储 |
| 观测 | structured logs | OpenTelemetry traces + metrics + logs |

#### 3.2.2 选型理由

| 层级 | 选择理由 |
| --- | --- |
| React 19 + TypeScript | 工作台页面交互复杂，React 组件生态成熟；TypeScript 有利于维护 Agent、Workflow、Schema、Artifact 等复杂对象。 |
| Vite | 本地启动快，适合早期高频迭代。 |
| TanStack Query | Agent、Workflow、Run、Artifact 都是服务端状态，可统一处理缓存、刷新和错误；实时事件由 Socket.IO 驱动局部失效和状态更新。 |
| Zustand | 当前选中 Agent、右侧面板状态、编辑器临时内容属于客户端状态，用 Zustand 足够轻量。 |
| shadcn/ui + Radix UI + Tailwind CSS | 可控性强，适合做专业工作台，不被重型组件库样式锁死。 |
| Monaco Editor | prompt、schema、JSON、input mapping 都需要结构化编辑体验。 |
| React Flow | MVP 也使用 React Flow，只以线性流程模式呈现；后续 DAG、分支和条件节点是在同一画布架构上渐进增强。 |
| Node.js 24 LTS + NestJS | Node.js 适合 IO 密集型模型调用；NestJS 模块化、依赖注入和装饰器体系适合平台型后端。 |
| Fastify | 性能更好，适合作为 NestJS HTTP adapter；保留 Express 兼容方便生态接入。 |
| Prisma + PostgreSQL | Prisma 提供类型安全查询；PostgreSQL 同时适合结构化数据和 JSONB 半结构化配置。 |
| Redis + BullMQ | WorkflowRun 天然是长任务，MVP 即使用队列调度，后续只扩展 worker 数量、队列策略和媒体任务类型。 |
| S3 兼容对象存储 | 素材包和媒体文件会快速增大，MVP 即使用对象存储接口，MinIO 可覆盖本地开发和私有化部署。 |
| JWT + Refresh Token | 从第一版建立稳定鉴权边界，MVP 只开放单组织单管理员，企业版再接 OAuth / SSO。 |
| OpenTelemetry | 商品化后需要排查慢节点、失败节点、供应商调用耗时和成本问题。 |
| pnpm workspace + Turborepo | 适合 React Web、Node API、shared types、未来 worker 多包协作。 |

### 3.3 分层技术架构

系统按职责分为七层：

```text
展示层
  React 页面、组件、路由、工作台交互、小白应用入口

前端业务层
  Agent feature、Workflow feature、Evaluation feature、Artifact feature

API 接入层
  NestJS Controller、DTO、Guard、Pipe、统一错误响应

领域服务层
  ProjectsService、AgentsService、WorkflowRunner、ArtifactsService、PublishedAppsService

基础设施层
  Prisma、StorageProvider、LlmProvider、ZipExporter、ConfigService

数据层
  PostgreSQL、JSONB 配置、WorkflowRun 记录、Artifact 元数据

外部能力层
  LLM Provider APIs、未来音频/图片/视频生成服务、未来对象存储
```

各层依赖方向必须从上到下：

```text
React UI -> API -> Domain Services -> Infrastructure -> Database / External Providers
```

不允许前端直接理解模型供应商密钥，不允许 WorkflowRunner 直接绑定具体模型厂商，不允许 Artifact 导出逻辑反向依赖页面结构。

### 3.4 NestJS 与 Fastify 选择

推荐 MVP 使用 NestJS。

原因：

- 模块边界清晰，适合 Agent、Workflow、Artifact、Template 等业务域拆分。
- 内置依赖注入，方便替换 LLM Provider、Storage Provider、Workflow Runner。
- 适合从 MVP 阶段组织队列、鉴权、WebSocket、后台 worker 等平台基础能力。

如果希望更轻量，也可以使用 Fastify。但考虑到本产品长期会演进为平台型系统，NestJS 更合适。

### 3.5 商品化架构

商品化架构指平台从“开发者自用工具”演进为“可发布、可复用、可计量、可部署、可运营的智能体平台”时，需要提前保留的系统结构。

MVP 不需要一次性实现完整商品化能力，但底层模型和模块边界必须为商品化做好准备。

#### 3.5.1 商品化对象模型

后续商品化至少包含六类对象：

```text
Template
  可复用的业务流程模板，例如小说素材包模板、短剧分镜模板。

Project
  平台拥有者基于模板创建的工作空间，用于调试和定制。

Agent
  可配置的原子能力单元，沉淀业务专家能力。

Workflow
  可运行的多智能体业务流程。

Published App
  面向小白用户开放的简化业务应用。

Run / Artifact / Usage
  运行实例、结果产物和用量记录，用于交付、排错和计费。
```

这六类对象的关系是：

```text
System Template
  -> Project Copy
    -> Agents + Workflows
      -> Published App
        -> Workflow Runs
          -> Artifacts + Usage Records
```

#### 3.5.2 商品化分层

商品化后，系统可以分为四个产品层：

```text
工厂层：
AI 开发者创建、配置、调试、版本化 Agent 和 Workflow。

模板层：
沉淀可复用业务模板，支持系统模板、自定义模板、行业模板。

应用层：
将成熟 Workflow 发布成小白用户可使用的 Published App。

运营层：
统计运行次数、耗时、token、失败率、产物数量和下载次数，支撑后续计费与运维。
```

MVP 优先实现工厂层和应用层的最小闭环，模板层实现基础复制能力，运营层先保留数据记录。

#### 3.5.3 多租户演进路径

MVP 采用单组织单管理员设计，但数据库和 API 从第一版保留组织上下文，不阻碍多租户扩展。

推荐演进路径：

```text
阶段 1：单用户本地/自托管
  Project、Agent、Workflow 不绑定 userId。

阶段 2：单组织多用户
  增加 User、Organization、Membership，Project 绑定 organizationId。

阶段 3：SaaS 多租户
  所有业务对象绑定 organizationId，API 通过租户上下文隔离数据。

阶段 4：商业化套餐
  增加 Plan、Subscription、UsageRecord、QuotaPolicy。
```

为避免后续大改，MVP 的 service 方法应尽量保留上下文参数，例如 `workspaceContext` 或 `tenantContext`，即使第一版内部只使用默认值。

#### 3.5.4 计量与成本架构

商品化必须能回答：

- 谁运行了哪个应用？
- 调用了哪些 AgentVersion？
- 消耗了多少 token？
- 生成了多少 Artifact？
- 失败发生在哪个节点？
- 单次运行成本大概是多少？

MVP 应在 WorkflowRun 和 WorkflowNodeRun 中保留 usage metadata：

```json
{
  "provider": "openai-compatible",
  "modelId": "example-model",
  "promptTokens": 1200,
  "completionTokens": 800,
  "totalTokens": 2000,
  "durationMs": 5300,
  "estimatedCost": null
}
```

第一版可以不计算真实费用，但必须记录 token、模型、耗时和节点来源。后续可以增加 `UsageRecord` 表，把运行用量汇总到用户、组织、应用和模板维度。

#### 3.5.5 模板商品化架构

模板不是简单复制文件，而是一组可版本化的业务资产：

```text
Template
  - template metadata
  - preset agents
  - preset agent versions
  - preset workflows
  - preset published app config
  - example inputs
  - recommended output schemas
```

MVP 中系统模板应由代码 seed 初始化到数据库，运行时按 Template / TemplateVersion 管理。这样第一版就使用正式模板模型，后续商品化时只扩展模板能力，不迁移模板存储方式。

模板应支持：

- 模板版本。
- 模板导入导出。
- 模板复制。
- 模板发布。
- 模板禁用。
- 模板升级提示。

#### 3.5.6 Provider 商品化架构

模型和媒体生成能力不应写死在 Agent 中。

推荐通过 Provider 层统一接入：

```text
LlmProvider
MediaProvider
StorageProvider
EmbeddingProvider
```

MVP 只实现 `OpenAICompatibleLlmProvider` 和 `S3CompatibleStorageProvider`，开发和私有化部署默认使用 MinIO。后续商品化时，可以接入：

- 官方 OpenAI API。
- Azure OpenAI。
- 豆包、通义千问、DeepSeek 等国内模型。
- 音频生成服务。
- 图片生成服务。
- 视频生成服务。
- S3、MinIO、阿里云 OSS、腾讯云 COS。

#### 3.5.7 Published App 商品化架构

Published App 是对小白用户售卖或交付的最终形态。

它不应复制 Workflow 逻辑，而应引用一个明确版本的 Workflow 发布配置：

```text
PublishedApp
  -> workflowId
  -> workflowVersion 或 publishedSnapshot
  -> public input schema
  -> public parameters
  -> branding config
  -> access policy
```

MVP 即应让 Published App 引用 Workflow 发布快照，而不是直接引用可编辑 Workflow 草稿。发布快照可以先只包含 Workflow、WorkflowNode、AgentVersion 和公开输入配置的 JSON 快照，后续再扩展版本回滚、灰度发布和多版本并存。

#### 3.5.8 部署商品化架构

平台未来至少支持三种部署形态：

```text
本地开发版：
开发者本机运行，用于快速打磨 Agent 和 Workflow。

私有化部署版：
部署到客户或团队服务器，数据和 API key 由客户自管。

SaaS 版：
平台统一托管，支持多租户、套餐、计量、权限和运营后台。
```

MVP 应优先服务本地开发版和自托管版。SaaS 相关能力先通过数据模型和模块边界预留，不在第一版实现。

#### 3.5.9 商品化架构的 MVP 落点

MVP 中必须落地：

- Project、Template、Agent、AgentVersion、Workflow、WorkflowRun、Artifact、PublishedApp 这些核心对象。
- WorkflowRun 和 WorkflowNodeRun 的完整运行记录。
- AgentVersion 快照，保证可复现。
- Published App 的最小发布入口。
- Artifact 导出包。

MVP 中只预留，不完整实现：

- Organization、User、Role。
- Subscription、Plan、Quota。
- Marketplace。
- Provider 计费。
- 模板版本升级。
- SaaS 运营后台。

## 4. 运行时视图

### 4.1 开发者调试智能体

```text
前端 Agent Studio
-> POST /api/agents/:agentId/chat
-> 后端读取当前 Agent 配置
-> 组装 system prompt、历史消息、输入 schema
-> 调用 LLM Provider
-> 保存 ChatSession 和 ChatMessage
-> 返回模型输出
```

### 4.2 保存智能体版本

```text
前端点击保存版本
-> POST /api/agents/:agentId/versions
-> 后端读取当前草稿配置
-> 生成 AgentVersion 快照
-> 更新 Agent.currentVersionId
-> 返回版本详情
```

### 4.3 执行工作流

```text
前端提交初始输入
-> POST /api/workflows/:workflowId/runs
-> 创建 WorkflowRun
-> 按 orderIndex 加载启用节点
-> 逐节点执行 AgentVersion
-> 保存 WorkflowNodeRun 输入输出
-> 节点失败时停止并记录错误
-> 全部成功后生成 artifacts
-> 返回 WorkflowRun 状态
```

### 4.4 编辑中间结果后继续运行

```text
前端编辑某个节点输出
-> PATCH /api/workflow-runs/:runId/nodes/:nodeRunId/output
-> 保存 editedOutput
-> POST /api/workflow-runs/:runId/resume
-> 从下一个节点继续运行
```

### 4.5 导出素材包

```text
前端点击导出
-> POST /api/workflow-runs/:runId/export
-> 后端读取 WorkflowRun、NodeRun、Artifact
-> 生成 manifest.json、README.md、edit_plan.csv、字幕草案
-> 写入本地 exports 目录
-> 压缩为 zip
-> 返回下载地址
```

## 5. 前端技术方案

### 5.1 前端应用结构

推荐目录：

```text
apps/web/
  src/
    app/
      App.tsx
      router.tsx
      queryClient.ts
    pages/
      ProjectsPage.tsx
      ProjectWorkspacePage.tsx
      AgentStudioPage.tsx
      EvaluationLabPage.tsx
      WorkflowBuilderPage.tsx
      WorkflowRunPage.tsx
      PublishedAppPage.tsx
    features/
      agents/
      workflows/
      templates/
      evaluations/
      artifacts/
      publishedApps/
    components/
      layout/
      ui/
    lib/
      apiClient.ts
      format.ts
      validators.ts
    styles/
      globals.css
```

### 5.2 页面规划

#### 5.2.1 ProjectsPage

职责：

- 展示项目列表。
- 展示系统模板和自定义模板入口。
- 创建项目。
- 进入项目工作区。

主要接口：

- `GET /api/projects`
- `GET /api/templates`
- `POST /api/projects`

#### 5.2.2 ProjectWorkspacePage

职责：

- 展示项目概览。
- 展示 Agent、Workflow、最近运行和最近测试。
- 提供进入 Agent Studio、Evaluation Lab、Workflow Builder、Artifact Manager 的入口。

主要接口：

- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/agents`
- `GET /api/projects/:projectId/workflows`
- `GET /api/projects/:projectId/workflow-runs`

#### 5.2.3 AgentStudioPage

职责：

- 左侧展示 Agent 列表。
- 中间展示聊天测试区。
- 右侧展示配置、版本、测试用例。

核心交互：

- 新增 Agent。
- 复制 Agent。
- 删除 Agent。
- 编辑 Agent 草稿配置。
- 发送聊天测试。
- 保存 Agent Version。
- 将聊天结果保存为 Test Case。

主要接口：

- `GET /api/projects/:projectId/agents`
- `POST /api/projects/:projectId/agents`
- `PATCH /api/agents/:agentId`
- `DELETE /api/agents/:agentId`
- `POST /api/agents/:agentId/chat`
- `POST /api/agents/:agentId/versions`
- `POST /api/agents/:agentId/test-cases`

#### 5.2.4 EvaluationLabPage

职责：

- 展示测试用例。
- 运行测试。
- 对比不同 Agent Version 的输出。
- 人工标记满意、一般、不满意。

主要接口：

- `GET /api/agents/:agentId/test-cases`
- `POST /api/test-cases/:testCaseId/run`
- `GET /api/test-cases/:testCaseId/results`
- `PATCH /api/test-results/:resultId`

#### 5.2.5 WorkflowBuilderPage

职责：

- 展示线性工作流节点。
- 新增、删除、禁用、排序节点。
- 配置节点 Agent Version。
- 配置输入映射、输出 key、失败策略。

主要接口：

- `GET /api/projects/:projectId/workflows`
- `POST /api/projects/:projectId/workflows`
- `PATCH /api/workflows/:workflowId`
- `POST /api/workflows/:workflowId/nodes`
- `PATCH /api/workflow-nodes/:nodeId`
- `DELETE /api/workflow-nodes/:nodeId`
- `POST /api/workflows/:workflowId/runs`

#### 5.2.6 WorkflowRunPage

职责：

- 展示一次 WorkflowRun 的执行状态。
- 展示节点输入、输出、错误。
- 支持编辑中间输出。
- 支持失败节点重跑。
- 支持继续运行。
- 支持导出结果包。

主要接口：

- `GET /api/workflow-runs/:runId`
- `PATCH /api/workflow-runs/:runId/nodes/:nodeRunId/output`
- `POST /api/workflow-runs/:runId/rerun-node`
- `POST /api/workflow-runs/:runId/resume`
- `POST /api/workflow-runs/:runId/export`

#### 5.2.7 PublishedAppPage

职责：

- 面向小白用户提供简化入口。
- 输入文本。
- 设置少量业务参数。
- 启动流程。
- 查看进度。
- 下载结果包。

主要接口：

- `GET /api/published-apps/:slug`
- `POST /api/published-apps/:slug/runs`
- `GET /api/public-runs/:runId`
- `GET /api/public-runs/:runId/download`

### 5.3 前端状态管理

前端状态分两类：

- 服务端状态：项目、Agent、版本、测试用例、工作流、运行记录，使用 TanStack Query 管理。
- 页面临时状态：当前选中的 Agent、右侧面板 tab、编辑器临时内容，使用 Zustand 或组件本地状态管理。

### 5.4 前端编辑器

以下内容建议使用 Monaco Editor：

- system prompt。
- input schema。
- output schema。
- JSON 输入。
- JSON 输出。
- workflow input mapping。

原因是这些内容多为结构化文本，普通 textarea 难以支撑调试体验。

## 6. 后端技术方案

### 6.1 后端模块结构

推荐目录：

```text
apps/api/
  src/
    main.ts
    app.module.ts
    common/
      errors/
      guards/
      pipes/
      utils/
    modules/
      projects/
      templates/
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
```

### 6.2 业务模块职责

#### 6.2.1 ProjectsModule

职责：

- 项目创建、查询、更新。
- 从模板复制项目。
- 保存项目为自定义模板。

#### 6.2.2 TemplatesModule

职责：

- 管理系统模板和自定义模板。
- 提供“小说/故事生成视频素材包”系统模板初始化逻辑。

#### 6.2.3 AgentsModule

职责：

- Agent CRUD。
- Agent 草稿配置管理。
- Agent 删除依赖检查。
- Agent 复制。

#### 6.2.4 AgentVersionsModule

职责：

- 创建 AgentVersion 快照。
- 查询版本列表和详情。
- 恢复历史版本。
- 设置当前推荐版本。

#### 6.2.5 ChatsModule

职责：

- 管理 Agent 聊天测试会话。
- 调用 LLM Provider。
- 保存聊天消息。
- 将聊天结果转为测试用例。

#### 6.2.6 EvaluationsModule

职责：

- TestCase CRUD。
- TestResult 生成。
- 多版本输出对比。
- 人工评分和备注。

#### 6.2.7 WorkflowsModule

职责：

- Workflow CRUD。
- WorkflowNode CRUD。
- 节点排序。
- 节点配置校验。

#### 6.2.8 WorkflowRunsModule

职责：

- 创建 WorkflowRun。
- 执行线性工作流。
- 保存 WorkflowNodeRun。
- 编辑中间输出。
- 失败节点重跑。
- 从指定节点继续运行。

#### 6.2.9 ArtifactsModule

职责：

- 保存节点产物。
- 生成导出目录。
- 生成 manifest、README、edit_plan、字幕草案。
- 打包 zip。

#### 6.2.10 PublishedAppsModule

职责：

- 将 Workflow 发布成小白应用。
- 管理发布配置。
- 提供小白应用运行入口。

#### 6.2.11 ProvidersModule

职责：

- 管理模型供应商配置。
- 提供 OpenAI-compatible LLM 调用适配器。
- 后续扩展音频、图片、视频生成 provider。

#### 6.2.12 StorageModule

职责：

- 提供 S3 兼容对象存储接口。
- 保存导出包。
- 开发和私有化部署默认使用 MinIO。
- 生产环境可切换 AWS S3、阿里云 OSS、腾讯云 COS 等 S3 兼容或类 S3 存储。

## 7. 数据库设计

### 7.1 数据库选择

MVP 推荐 PostgreSQL。

原因：

- 结构化数据强。
- JSONB 适合保存 schema、runtime params、input mapping、模型输出等半结构化内容。
- 后续可以扩展全文检索、向量扩展或复杂查询。

### 7.2 Prisma Schema 草案

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  templateId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agents      Agent[]
  workflows   Workflow[]
}

model Agent {
  id               String   @id @default(cuid())
  projectId        String
  name             String
  description      String?
  draftConfig      Json
  currentVersionId String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  project          Project  @relation(fields: [projectId], references: [id])
  versions         AgentVersion[]
  testCases        TestCase[]
}

model AgentVersion {
  id             String   @id @default(cuid())
  agentId        String
  versionName    String
  configSnapshot Json
  notes          String?
  createdAt      DateTime @default(now())

  agent          Agent    @relation(fields: [agentId], references: [id])
  workflowNodes  WorkflowNode[]
  testResults    TestResult[]
}

model ChatSession {
  id        String   @id @default(cuid())
  agentId   String
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages  ChatMessage[]
}

model ChatMessage {
  id            String   @id @default(cuid())
  chatSessionId String
  role          String
  content       String
  metadata      Json?
  createdAt     DateTime @default(now())

  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id])
}

model TestCase {
  id                String   @id @default(cuid())
  projectId          String
  agentId            String
  name               String
  input              Json
  expectedNotes      String?
  createdFromChatId  String?
  createdAt          DateTime @default(now())

  agent              Agent    @relation(fields: [agentId], references: [id])
  results            TestResult[]
}

model TestResult {
  id             String   @id @default(cuid())
  testCaseId     String
  agentVersionId String
  output         Json
  rating         String?
  notes          String?
  createdAt      DateTime @default(now())

  testCase       TestCase     @relation(fields: [testCaseId], references: [id])
  agentVersion   AgentVersion @relation(fields: [agentVersionId], references: [id])
}

model Workflow {
  id          String   @id @default(cuid())
  projectId   String
  name        String
  description String?
  status      String   @default("draft")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id])
  nodes       WorkflowNode[]
  runs        WorkflowRun[]
}

model WorkflowNode {
  id              String   @id @default(cuid())
  workflowId      String
  orderIndex      Int
  name            String
  agentVersionId  String
  inputMapping    Json
  outputKey       String
  allowManualEdit Boolean  @default(true)
  failurePolicy   String   @default("stop")
  enabled         Boolean  @default(true)

  workflow        Workflow     @relation(fields: [workflowId], references: [id])
  agentVersion    AgentVersion @relation(fields: [agentVersionId], references: [id])
  nodeRuns        WorkflowNodeRun[]
}

model WorkflowRun {
  id           String    @id @default(cuid())
  workflowId   String
  status       String
  initialInput Json
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?
  errorSummary String?

  workflow     Workflow  @relation(fields: [workflowId], references: [id])
  nodeRuns     WorkflowNodeRun[]
  artifacts    Artifact[]
}

model WorkflowNodeRun {
  id             String    @id @default(cuid())
  workflowRunId  String
  workflowNodeId String
  status         String
  input          Json
  output         Json?
  editedOutput   Json?
  error          Json?
  startedAt      DateTime?
  finishedAt     DateTime?

  workflowRun    WorkflowRun  @relation(fields: [workflowRunId], references: [id])
  workflowNode   WorkflowNode @relation(fields: [workflowNodeId], references: [id])
}

model Artifact {
  id                String   @id @default(cuid())
  projectId          String
  workflowRunId      String
  workflowNodeRunId  String?
  type              String
  path              String
  metadata          Json?
  createdAt         DateTime @default(now())

  workflowRun       WorkflowRun @relation(fields: [workflowRunId], references: [id])
}

model PublishedApp {
  id          String   @id @default(cuid())
  workflowId  String
  slug        String   @unique
  name        String
  description String?
  config      Json
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 7.3 JSON 字段约定

`Agent.draftConfig` 和 `AgentVersion.configSnapshot` 建议结构：

```json
{
  "systemPrompt": "你是小说分析智能体...",
  "provider": {
    "type": "openai-compatible",
    "baseUrl": "https://api.example.com/v1",
    "apiKeyRef": "default-provider-key",
    "modelId": "example-model"
  },
  "runtimeParams": {
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "inputSchema": {
    "type": "object",
    "required": ["text"],
    "properties": {
      "text": { "type": "string" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["summary", "characters"],
    "properties": {
      "summary": { "type": "string" },
      "characters": { "type": "array" }
    }
  },
  "tools": [],
  "skills": []
}
```

`WorkflowNode.inputMapping` 建议结构：

```json
{
  "source": "workflow_input",
  "path": "$.text",
  "target": "text"
}
```

下游节点读取上游输出时：

```json
{
  "source": "node_output",
  "nodeOutputKey": "novel_analysis",
  "path": "$",
  "target": "analysis"
}
```

## 8. API 设计

### 8.1 响应格式

统一成功响应：

```json
{
  "data": {},
  "requestId": "req_123"
}
```

统一错误响应：

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 不存在",
    "details": {}
  },
  "requestId": "req_123"
}
```

### 8.2 Projects API

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
POST   /api/projects/:projectId/save-as-template
```

创建项目请求：

```json
{
  "name": "我的小说素材生产项目",
  "description": "用于打磨第一条小说视频素材流程",
  "templateId": "system_novel_video_assets_v1"
}
```

### 8.3 Agents API

```text
GET    /api/projects/:projectId/agents
POST   /api/projects/:projectId/agents
GET    /api/agents/:agentId
PATCH  /api/agents/:agentId
POST   /api/agents/:agentId/copy
DELETE /api/agents/:agentId
POST   /api/agents/:agentId/chat
POST   /api/agents/:agentId/versions
GET    /api/agents/:agentId/versions
POST   /api/agents/:agentId/restore-version
```

聊天测试请求：

```json
{
  "chatSessionId": "chat_123",
  "input": {
    "text": "这里是一段故事文本"
  }
}
```

### 8.4 Evaluation API

```text
GET   /api/agents/:agentId/test-cases
POST  /api/agents/:agentId/test-cases
PATCH /api/test-cases/:testCaseId
POST  /api/test-cases/:testCaseId/run
GET   /api/test-cases/:testCaseId/results
PATCH /api/test-results/:resultId
```

测试结果评分请求：

```json
{
  "rating": "good",
  "notes": "角色关系清晰，输出格式稳定"
}
```

### 8.5 Workflow API

```text
GET    /api/projects/:projectId/workflows
POST   /api/projects/:projectId/workflows
GET    /api/workflows/:workflowId
PATCH  /api/workflows/:workflowId
DELETE /api/workflows/:workflowId
POST   /api/workflows/:workflowId/nodes
PATCH  /api/workflow-nodes/:nodeId
DELETE /api/workflow-nodes/:nodeId
POST   /api/workflows/:workflowId/runs
```

创建节点请求：

```json
{
  "name": "小说分析",
  "agentVersionId": "agent_version_123",
  "orderIndex": 1,
  "inputMapping": {
    "source": "workflow_input",
    "path": "$.text",
    "target": "text"
  },
  "outputKey": "novel_analysis",
  "allowManualEdit": true,
  "failurePolicy": "stop"
}
```

### 8.6 Workflow Run API

```text
GET   /api/workflow-runs/:runId
PATCH /api/workflow-runs/:runId/nodes/:nodeRunId/output
POST  /api/workflow-runs/:runId/rerun-node
POST  /api/workflow-runs/:runId/resume
POST  /api/workflow-runs/:runId/export
GET   /api/workflow-runs/:runId/download
```

创建运行请求：

```json
{
  "initialInput": {
    "text": "完整小说或故事文本",
    "style": "悬疑",
    "targetDurationMinutes": 8,
    "aspectRatio": "16:9"
  }
}
```

### 8.7 Published App API

```text
GET   /api/published-apps/:slug
POST  /api/published-apps/:slug/runs
GET   /api/public-runs/:runId
GET   /api/public-runs/:runId/download
```

## 9. LLM Provider 方案

### 9.1 Provider 抽象

后端应定义统一接口：

```ts
export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatRequest {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  messages: LlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface LlmChatResponse {
  content: string;
  raw: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmProvider {
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
}
```

### 9.2 OpenAI-Compatible Provider

MVP 优先支持 OpenAI-compatible API，原因是很多模型服务都兼容类似接口。

后续可以扩展：

- OpenAI 官方 API。
- Azure OpenAI。
- 豆包。
- 通义千问。
- DeepSeek。
- 本地模型网关。

### 9.3 输出格式控制

对于需要结构化输出的 Agent，应尽量要求 JSON 输出。

后端需要做三层处理：

- 在 system prompt 中明确输出 JSON。
- 使用 outputSchema 描述字段。
- 后端解析 JSON，失败时记录错误并返回给前端。

MVP 不强制实现复杂自动修复。解析失败时，应把原始输出保存下来，并允许用户人工编辑后继续。

## 10. Workflow Runner 方案

### 10.1 执行策略

MVP 使用 BullMQ + Redis 执行线性工作流：

```text
加载 Workflow
-> 加载 enabled nodes
-> 按 orderIndex 排序
-> 创建 WorkflowRun
-> 投递 WorkflowRun Job
-> Worker 逐节点执行
-> 每个节点写入 WorkflowNodeRun
-> 通过 Socket.IO 推送节点状态和日志
-> 遇到失败停止
-> 全部成功后生成 artifacts
```

### 10.2 节点输入解析

节点输入由 `inputMapping` 决定。

来源包括：

- `workflow_input`：来自初始输入。
- `node_output`：来自上游节点输出。
- `manual`：人工填写固定内容。

### 10.3 节点输出处理

节点输出保存为 JSON。

如果模型返回文本：

- 若 outputSchema 要求 JSON，则尝试 JSON.parse。
- 解析成功，保存结构化 JSON。
- 解析失败，保存 rawText 和 parseError。

### 10.4 失败处理

MVP 支持两种失败策略：

- `stop`：节点失败后停止工作流。
- `skip`：节点失败后记录错误并跳过。

默认使用 `stop`。

### 10.5 重跑策略

失败节点重跑时：

- 保留原 WorkflowRun。
- 创建新的 WorkflowNodeRun 或更新当前失败节点运行记录。
- 重新读取当前节点输入。
- 成功后允许从下一个节点继续。

为了追溯清晰，推荐创建新的 WorkflowNodeRun，并用 metadata 标记 `rerunOfNodeRunId`。

## 11. Artifact 与导出方案

### 11.1 存储目录

MVP 使用 S3 兼容对象存储接口，开发和私有化默认 MinIO。以下目录结构是对象 key 的逻辑组织方式，不绑定本地磁盘路径：

```text
exports/
  workflow-run-id/
    package/
    package.zip
artifacts/
  workflow-run-id/
```

### 11.2 导出内容

对于小说视频素材模板，导出包包含：

```text
project-name/
  01_script/
    storyboard.md
    narration.md
  02_voiceover/
    voiceover_tasks.json
  03_dialogue/
    dialogue_tasks.json
  04_video_clips/
    video_tasks.json
  05_images/
    image_prompts.json
  06_sfx/
    sfx_tasks.json
  07_subtitles/
    subtitles.srt
  edit_plan.csv
  manifest.json
  README.md
```

### 11.3 manifest.json 示例

```json
{
  "projectName": "我的小说素材生产项目",
  "workflowRunId": "run_123",
  "generatedAt": "2026-06-10T12:00:00.000Z",
  "source": {
    "type": "text",
    "title": "示例故事"
  },
  "assets": [
    {
      "type": "storyboard",
      "path": "01_script/storyboard.md",
      "nodeOutputKey": "storyboard_script",
      "agentVersionId": "agent_version_123"
    }
  ]
}
```

### 11.4 README.md 内容

导出包中的 README 应说明：

- 该包不是完整视频。
- 如何查看分镜脚本。
- 如何查看音频、图片、视频生成任务。
- 如何把素材导入剪映、PR、达芬奇或万兴喵影。
- 每个目录的用途。

## 12. 安全与配置

### 12.1 API Key 存储

MVP 推荐使用环境变量或后端加密存储。

最小实现：

- 在 `.env` 中保存 provider key。
- 数据库中只保存 `apiKeyRef`。
- 后端通过 `apiKeyRef` 读取环境变量。

示例：

```text
PROVIDER_KEY_DEFAULT=sk-xxxx
```

Agent 配置中只保存：

```json
{
  "apiKeyRef": "PROVIDER_KEY_DEFAULT"
}
```

### 12.2 小白端隔离

Published App 页面不得返回：

- system prompt。
- API key 引用。
- model ID。
- provider base URL。
- workflow 内部节点配置。

### 12.3 输入限制

MVP 应设置：

- 单次文本最大长度。
- 单次运行最大节点数。
- 单次导出最大文件数量。

具体默认值：

- 文本最大长度：200000 字符。
- 工作流最大节点数：50。
- 单次导出最大文件数量：1000。

## 13. 部署方案

### 13.1 本地开发

推荐使用 pnpm workspace：

```text
agents-os/
  apps/
    web/
    api/
  packages/
    shared/
  prisma/
  storage/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
```

本地依赖：

- Node.js 24 LTS
- pnpm
- Docker Desktop

本地服务：

```text
React Web: http://localhost:5173
Node API:  http://localhost:3000
Postgres:  localhost:5432
```

### 13.2 Docker Compose

MVP 推荐使用 Docker Compose 启动 PostgreSQL、Redis 和 MinIO：

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

### 13.3 自托管部署

第一版可部署为：

```text
Nginx
  -> React static files
  -> Node.js API process
PostgreSQL
Redis
MinIO or S3-compatible object storage
BullMQ Worker process
```

媒体生成接入后，不需要改变基础设施类型，只需要增加独立队列、扩展 Worker 数量，并按媒体任务类型配置并发和重试策略。

## 14. 测试方案

### 14.1 后端单元测试

重点覆盖：

- AgentVersion 快照创建。
- Agent 删除依赖检查。
- WorkflowNode 输入映射。
- WorkflowRunner 顺序执行。
- 节点失败停止。
- 节点重跑。
- Artifact manifest 生成。

### 14.2 后端集成测试

重点覆盖：

- 基于模板创建项目。
- 创建 Agent 并聊天测试。
- 保存版本。
- 创建 Workflow。
- 执行 WorkflowRun。
- 导出素材包。

LLM 调用应使用 mock provider，避免测试依赖真实模型。

### 14.3 前端组件测试

重点覆盖：

- Agent 列表和选择。
- Agent 配置表单。
- 聊天测试区。
- Workflow 节点列表。
- WorkflowRun 状态展示。

### 14.4 E2E 测试

使用 Playwright 覆盖最小主路径：

```text
创建项目
-> 打开 Agent Studio
-> 修改小说分析智能体 prompt
-> 发送聊天测试
-> 保存版本
-> 打开 Workflow Builder
-> 运行默认工作流
-> 查看节点输出
-> 导出结果包
```

## 15. 迭代拆分

### 15.1 迭代一：工程骨架与项目模板

交付：

- React + Node.js monorepo。
- PostgreSQL + Prisma。
- 项目与模板模型。
- 内置小说视频素材系统模板。
- 基于模板创建项目。

### 15.2 迭代二：Agent Studio

交付：

- Agent CRUD。
- Agent 配置编辑。
- OpenAI-compatible LLM 调用。
- 聊天式测试。
- Agent Version 保存与恢复。

### 15.3 迭代三：Evaluation Lab

交付：

- 从聊天记录创建 Test Case。
- 运行测试用例。
- 保存 Test Result。
- 人工评分。
- 多版本输出对比。

### 15.4 迭代四：Workflow Builder 与 Runner

交付：

- 线性 Workflow。
- WorkflowNode 管理。
- WorkflowRun 执行。
- 节点状态展示。
- 中间输出编辑。
- 失败节点重跑。

### 15.5 迭代五：Artifact 导出

交付：

- Artifact 保存。
- manifest、README、edit_plan、字幕草案生成。
- zip 导出。
- 下载接口。

### 15.6 迭代六：Published App

交付：

- Workflow 发布配置。
- 小白简化运行页。
- 文本输入。
- 运行进度。
- 结果下载。

## 16. 技术风险与应对

### 16.1 LLM 输出不稳定

风险：模型不按 schema 输出，导致下游节点失败。

应对：

- system prompt 明确 JSON 输出。
- AgentVersion 保存 outputSchema。
- 后端解析失败时保存 rawText 和 parseError。
- 前端允许人工编辑中间输出后继续运行。

### 16.2 Workflow 执行阻塞请求

风险：长文本和多节点流程会导致 HTTP 请求超时。

MVP 应对：

- 第一版即采用“HTTP 创建运行 + 后台执行 + Socket.IO 推送状态”的交互模型。
- WorkflowRun 状态写入数据库，保证页面刷新后仍可恢复运行状态。
- 前端通过 Socket.IO 订阅 WorkflowRun 事件，接收节点开始、节点输出、节点失败、运行完成等事件。

后续应对：

- 增加 Worker 数量。
- 按文本、音频、图片、视频任务拆分队列。
- 将 Socket.IO 扩展到多人协作、实时画布同步和更复杂的运行中控制。

### 16.3 文件导出目录混乱

风险：产物无法追溯，不利于后续合成和排错。

应对：

- 所有 artifact 记录 workflowRunId、workflowNodeRunId、agentVersionId。
- manifest 中写入每个文件来源。
- 导出目录使用固定结构。

### 16.4 过早接入媒体生成

风险：音频、图片、视频生成异步复杂，拖慢平台底座。

应对：

- MVP 即定义 Tool / Provider 调用结构。
- 首先产出生成任务和提示词。
- 后续新增音频、图片、视频 Provider 实现，不改变上层 Workflow 调用模型。

### 16.5 API Key 泄露

风险：配置和导出中泄露密钥。

应对：

- 数据库保存 apiKeyRef，不保存明文 key。
- 前端不展示明文 key。
- Published App API 不返回 provider 配置。
- 导出包不包含任何 key。

## 17. 后续扩展方向

MVP 后可扩展：

- 多队列 BullMQ Worker 扩展。
- Socket.IO / WebSocket 多人协作和实时画布同步。
- 多对象存储后端和跨区域存储策略。
- 音频生成 provider。
- 图片生成 provider。
- 视频生成 provider。
- 多分支 DAG 工作流。
- 自动 schema 修复。
- 批量回归评测。
- 成本统计。
- 多用户权限。
- 模板市场。
- 剪映、PR、达芬奇工程辅助导出。

## 18. 推荐结论

推荐第一版按以下路线实现：

> 使用 React 19 + TypeScript 构建前端工作台，使用 Node.js 24 LTS + NestJS + Prisma + PostgreSQL 构建后端。MVP 即采用 React Flow 线性流程模式、Socket.IO 双向实时通信、BullMQ + Redis 后台任务调度、MinIO/S3 兼容对象存储和 JWT + Refresh Token 鉴权。首个模板内置小说视频素材生产流程，第一版以 LLM 文本智能体、聊天调试、版本管理、线性编排和结构化导出为核心，不急于接入真实音频视频生成。

这条路线可以最快验证“智能体工厂”是否能真正帮助平台拥有者打磨多智能体业务流程，同时为后续小白应用端和媒体生成能力留下清晰扩展空间。
