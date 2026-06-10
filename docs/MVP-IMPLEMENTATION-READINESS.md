# 智能体工厂平台 MVP 实施前就绪评审

## 1. 结论

当前 docs 已经具备开始实施 MVP 的主要依据，但在真正写代码前，需要把实施顺序、任务边界和验收门槛固定下来。

本次评审结论：

> 可以进入实施准备阶段；建议先按本文档的 MVP 实施路线拆任务，再开始编码。当前不建议直接无计划开工。

原因：

- 产品目标、用户边界、MVP 范围已经明确。
- 技术选型已经统一，未采用未来必然替换的临时路线。
- 架构图、流程图、时序图、API、数据结构已经具备。
- 仍需在实施前把任务拆分成可验收的工程里程碑，避免开发时来回切换上下文。

## 2. 已具备文档

| 文档 | 状态 | 用途 |
| --- | --- | --- |
| `docs/PRD-智能体工厂平台.md` | 已具备 | 产品目标、用户角色、模块需求、验收标准 |
| `docs/TECH-智能体工厂平台-React-Nodejs.md` | 已具备 | 技术选型、架构原则、模块拆分、部署与测试 |
| `docs/architecture/README.md` | 已具备 | 架构文档索引和统一原则 |
| `docs/architecture/01-architecture-diagrams.md` | 已具备 | 上下文图、容器图、模块图、部署图、数据流图 |
| `docs/architecture/02-flowcharts.md` | 已具备 | 业务流程和操作流程 |
| `docs/architecture/03-sequence-diagrams.md` | 已具备 | 运行时序和模块协作 |
| `docs/architecture/04-api-design.md` | 已具备 | REST API、Socket.IO 事件、错误码 |
| `docs/architecture/05-data-model.md` | 已具备 | ER 图、状态机、Prisma Schema、JSON 字段 |
| `docs/architecture/06-openapi-draft.md` | 已具备 | Swagger / OpenAPI 草案 |
| `docs/superpowers/specs/2026-06-10-agent-foundry-design.md` | 已具备 | 早期产品设计草案和已确定关键技术决策 |

## 3. 架构一致性检查

以下底层架构路线已经统一，不存在“先临时方案、后推翻重做”的冲突：

| 架构点 | MVP 路线 | 后续增强方式 |
| --- | --- | --- |
| 工作流画布 | React Flow 线性流程模式 | 在同一 React Flow 架构上扩展 DAG、分支、条件节点 |
| 实时通信 | Socket.IO / WebSocket | 扩展多人协作、实时画布同步、复杂运行控制 |
| 任务调度 | BullMQ + Redis | 扩展多队列、多 Worker、优先级、重试和隔离 |
| 文件存储 | S3 兼容 StorageProvider，默认 MinIO | 切换 AWS S3、阿里云 OSS、腾讯云 COS 或多区域存储 |
| 鉴权 | JWT + Refresh Token，单组织单管理员 | 扩展组织、角色、OAuth、SSO、API Token |
| 模板 | Template / TemplateVersion 入库管理 | 扩展模板市场、模板升级、导入导出 |
| 应用发布 | PublishedApp 绑定 WorkflowSnapshot | 扩展灰度发布、版本回滚、多版本并存 |
| Provider | Tool / Provider Adapter | 新增音频、图片、视频、Embedding Provider |

## 4. 当前还不应阻塞 MVP 的问题

以下问题可以在架构中预留，但不应阻塞第一版实现：

- 多租户套餐、计费和额度。
- OAuth / SSO。
- 复杂 DAG 分支和条件节点。
- 真实音频、图片、视频生成闭环。
- 模板市场。
- 多人协作编辑。
- 自动评测和批量回归。
- Kubernetes 生产部署。

这些能力的关键是：第一版不做完整功能，但底层技术路线已经兼容。

## 5. 实施前仍需明确的工程默认值

以下默认值建议在开工时直接采用，不再反复讨论：

| 项目 | 默认值 |
| --- | --- |
| Monorepo | pnpm workspace + Turborepo |
| 前端目录 | `apps/web` |
| 后端 API 目录 | `apps/api` |
| Worker 目录 | `apps/worker` |
| 共享类型目录 | `packages/shared` |
| 数据库 | PostgreSQL 16 |
| 队列 | Redis 7 + BullMQ |
| 对象存储 | MinIO |
| 后端框架 | NestJS + Fastify Adapter |
| 前端框架 | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| 工作流画布 | React Flow |
| 实时通信 | Socket.IO |
| ORM | Prisma |
| API 文档 | OpenAPI / Swagger |

## 6. MVP 实施路线

### 6.1 里程碑一：工程骨架与基础设施

目标：

- 建立 monorepo。
- 建立 React Web、NestJS API、BullMQ Worker、shared types。
- 接入 Docker Compose：PostgreSQL、Redis、MinIO。
- 建立 Prisma、配置管理、统一错误响应、requestId、基础日志。
- 建立 JWT + Refresh Token 的单组织单管理员登录。

完成标准：

- 本地一条命令启动基础设施。
- Web/API/Worker 可以同时启动。
- API 可以连接 PostgreSQL、Redis、MinIO。
- 登录后可以访问受保护 API。

### 6.2 里程碑二：模板与项目工作区

目标：

- 实现 Template / TemplateVersion。
- seed 内置“小说/故事生成视频素材包”模板。
- 基于 TemplateVersion 创建 Project。
- 自动复制预置 Agent、AgentVersion、Workflow、WorkflowNode。

完成标准：

- 可以从系统模板创建项目。
- 新项目中存在六个预置 Agent 和默认 Workflow。
- 修改项目副本不影响系统模板。

### 6.3 里程碑三：Agent Studio

目标：

- 实现 Agent CRUD。
- 实现 Agent draftConfig 编辑。
- 实现 OpenAI-compatible LLM Provider。
- 实现聊天式测试。
- 保存 ChatSession / ChatMessage。
- 保存 AgentVersion。

完成标准：

- 可以创建和编辑 Agent。
- 可以发送测试输入并看到模型输出。
- JSON 解析失败时保留 rawText 和 parseError。
- 可以保存版本并从版本恢复配置。

### 6.4 里程碑四：Evaluation Lab

目标：

- 从聊天结果创建 TestCase。
- 使用指定 AgentVersion 运行 TestCase。
- 保存 TestResult。
- 人工评分：满意、一般、不满意。
- 同输入多版本对比。

完成标准：

- 可以沉淀测试用例。
- 可以对同一输入比较多个 AgentVersion 输出。
- 可以保存评分和备注。

### 6.5 里程碑五：Workflow Builder

目标：

- 使用 React Flow 实现线性流程模式。
- 实现 Workflow / WorkflowNode CRUD。
- 节点绑定 AgentVersion。
- 配置 inputMapping、outputKey、failurePolicy、allowManualEdit。
- 创建 WorkflowSnapshot。

完成标准：

- 可以在 React Flow 中看到线性节点。
- 可以新增、删除、禁用、排序节点。
- 可以创建发布快照。
- WorkflowSnapshot 创建后不可变。

### 6.6 里程碑六：Workflow Runner

目标：

- 使用 BullMQ + Redis 创建 WorkflowRun Job。
- Worker 按 WorkflowSnapshot 或 Workflow 草稿执行节点。
- 保存 WorkflowRun / WorkflowNodeRun。
- Socket.IO 推送 run 和 node 状态。
- 支持失败节点重跑。
- 支持编辑中间输出后继续运行。

完成标准：

- 创建运行后 API 快速返回 runId。
- 前端通过 Socket.IO 看到状态更新。
- 节点失败后可以查看错误。
- 可以重跑失败节点。
- 可以编辑中间结果后继续。

### 6.7 里程碑七：Artifact 与导出包

目标：

- 保存 Artifact metadata。
- 使用 MinIO 保存对象。
- 生成 manifest.json、README.md、edit_plan.csv、字幕草案、任务清单。
- 生成 package.zip。
- 提供下载接口。

完成标准：

- 完成的 WorkflowRun 可以导出素材包。
- 导出包结构稳定。
- manifest 能追溯 workflowRunId、workflowNodeRunId、agentVersionId。
- 导出包不包含 API key。

### 6.8 里程碑八：Published App

目标：

- 创建 PublishedApp，绑定 WorkflowSnapshot。
- 公开应用详情 API。
- 小白用户提交文本和少量业务参数。
- 创建 public WorkflowRun。
- 展示实时进度。
- 下载结果包。

完成标准：

- 小白端不暴露 prompt、modelId、apiKeyRef、WorkflowNode 内部配置。
- 小白用户能输入故事并下载素材包。
- Published App 修改发布版本时通过新 WorkflowSnapshot 完成。

## 7. 推荐开工顺序

推荐顺序：

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

不要先做复杂页面细节，也不要先接真实媒体生成。

## 8. 开工前检查清单

开工前确认：

- Node.js 24 LTS 可用。
- pnpm 可用。
- Docker Desktop 可用。
- PostgreSQL、Redis、MinIO 端口未冲突，或已确定替代端口。
- 已确定默认 OpenAI-compatible Provider 的 base URL、modelId 和 apiKeyRef。
- 已确定第一版是否使用真实模型调用，还是先使用 mock provider。

## 9. 当前判断

如果只问“文档是否足够开始写代码”，答案是：

> 基本足够，但必须按本文档的实施路线开工，不建议跳过实施拆分直接进入编码。

如果下一步要真正实施，建议先生成更细的任务级实施计划，格式可以拆到每个里程碑的文件、接口、测试和验收命令。
