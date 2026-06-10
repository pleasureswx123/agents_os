# 智能体工厂平台架构图

## 1. 来龙去脉

一句话：智能体工厂平台让 AI 开发者创建、调试、版本化和编排多个智能体，并将成熟工作流发布成小白用户可运行的业务应用。

解决的问题：避免把复杂 AI 生产流程写死成一次性工具，而是沉淀为可调优、可复用、可追踪、可发布的多智能体业务流程。

上下游：

- 上游：平台拥有者、小白用户、Published App 入口、外部模型供应商。
- 下游：PostgreSQL、Redis/BullMQ、MinIO/S3、LLM Provider、未来媒体生成 Provider、外部视频编辑软件。

## 2. C4 Level 1：系统上下文图

```mermaid
flowchart LR
  owner["平台拥有者<br/>AI 开发者 / 业务设计者"]
  beginner["小白用户<br/>内容创作者 / 运营"]
  platform["智能体工厂平台"]
  llm["LLM Provider<br/>OpenAI-compatible"]
  media["未来媒体生成 Provider<br/>音频 / 图片 / 视频"]
  editor["外部视频编辑软件<br/>剪映 / PR / 达芬奇 / 万兴喵影"]
  storage["对象存储<br/>MinIO / S3"]

  owner -->|"创建、配置、调试 Agent 和 Workflow"| platform
  beginner -->|"运行 Published App，下载素材包"| platform
  platform -->|"模型调用"| llm
  platform -.->|"后续 Tool 调用"| media
  platform -->|"保存 Artifact / 导出包"| storage
  beginner -->|"导入素材包完成最终合成"| editor
```

## 3. C4 Level 2：容器图

```mermaid
flowchart TB
  web["React Web App<br/>Agent Studio / Workflow Builder / Published App"]
  api["Node.js NestJS API<br/>REST / Socket.IO Gateway"]
  worker["BullMQ Worker<br/>WorkflowRun / NodeRun 执行"]
  db["PostgreSQL<br/>业务数据 / JSONB / pgvector"]
  redis["Redis<br/>BullMQ / 会话 / 缓存"]
  objectStore["MinIO / S3<br/>Artifact / Export Zip"]
  llmProvider["OpenAI-compatible LLM Provider"]
  mediaProvider["Media Provider<br/>后续音频 / 图片 / 视频"]

  web -->|"REST API"| api
  web <-->|"Socket.IO 双向事件"| api
  api -->|"读写业务数据"| db
  api -->|"投递任务 / 查询队列"| redis
  api -->|"上传 / 下载 Artifact"| objectStore
  worker -->|"消费 BullMQ Job"| redis
  worker -->|"读写 Run / NodeRun"| db
  worker -->|"保存 Artifact"| objectStore
  worker -->|"调用模型"| llmProvider
  worker -.->|"后续调用媒体生成"| mediaProvider
  api -->|"推送运行事件"| web
```

## 4. C4 Level 3：后端模块图

```mermaid
flowchart TB
  apiLayer["API 接入层<br/>Controllers / DTO / Guards / Pipes"]
  auth["AuthModule<br/>JWT / Refresh Token"]
  templates["TemplatesModule<br/>Template / TemplateVersion"]
  projects["ProjectsModule<br/>Project 工作区"]
  agents["AgentsModule<br/>Agent 草稿配置"]
  versions["AgentVersionsModule<br/>配置快照"]
  chats["ChatsModule<br/>聊天调试"]
  evals["EvaluationsModule<br/>TestCase / TestResult"]
  workflows["WorkflowsModule<br/>Workflow / Node / Snapshot"]
  runs["WorkflowRunsModule<br/>Run / NodeRun / 控制命令"]
  artifacts["ArtifactsModule<br/>Artifact / Export Package"]
  apps["PublishedAppsModule<br/>发布入口 / 运行入口"]
  providers["ProvidersModule<br/>LLM / Tool / Media Adapter"]
  storage["StorageModule<br/>S3-compatible Storage"]
  realtime["RealtimeGateway<br/>Socket.IO rooms / events"]

  apiLayer --> auth
  apiLayer --> templates
  apiLayer --> projects
  apiLayer --> agents
  apiLayer --> versions
  apiLayer --> chats
  apiLayer --> evals
  apiLayer --> workflows
  apiLayer --> runs
  apiLayer --> artifacts
  apiLayer --> apps
  runs --> providers
  runs --> realtime
  runs --> artifacts
  artifacts --> storage
  chats --> providers
  apps --> runs
  workflows --> versions
```

## 5. 前端模块图

```mermaid
flowchart TB
  router["React Router"]
  query["TanStack Query<br/>服务端状态"]
  store["Zustand<br/>局部 UI 状态"]
  socket["Socket.IO Client<br/>运行事件 / 控制事件"]
  pages["Pages"]
  projects["ProjectsPage"]
  workspace["ProjectWorkspacePage"]
  studio["AgentStudioPage"]
  lab["EvaluationLabPage"]
  builder["WorkflowBuilderPage<br/>React Flow 线性模式"]
  runPage["WorkflowRunPage"]
  appPage["PublishedAppPage"]
  apiClient["API Client"]

  router --> pages
  pages --> projects
  pages --> workspace
  pages --> studio
  pages --> lab
  pages --> builder
  pages --> runPage
  pages --> appPage
  pages --> query
  pages --> store
  query --> apiClient
  socket --> runPage
  socket --> builder
```

## 6. 部署架构图

```mermaid
flowchart TB
  subgraph client["Client"]
    browser["Browser"]
  end

  subgraph app["Application Runtime"]
    nginx["Nginx / Reverse Proxy"]
    webStatic["React Static Assets"]
    api["NestJS API Process"]
    worker["BullMQ Worker Process"]
  end

  subgraph infra["Infrastructure"]
    postgres["PostgreSQL"]
    redis["Redis"]
    minio["MinIO / S3-compatible Storage"]
  end

  subgraph external["External Providers"]
    llm["LLM Provider"]
    media["Media Provider<br/>后续"]
  end

  browser --> nginx
  nginx --> webStatic
  nginx --> api
  browser <-->|"Socket.IO"| api
  api --> postgres
  api --> redis
  api --> minio
  worker --> postgres
  worker --> redis
  worker --> minio
  worker --> llm
  worker -.-> media
```

## 7. 数据流图

```mermaid
flowchart LR
  input["用户输入<br/>小说 / 故事 / 参数"]
  published["Published App<br/>公开输入 schema"]
  snapshot["WorkflowSnapshot<br/>发布快照"]
  queue["BullMQ Job"]
  runner["Workflow Worker"]
  llm["LLM Provider"]
  nodeOutput["WorkflowNodeRun Output"]
  artifact["Artifact Metadata"]
  object["MinIO / S3 Object"]
  exportZip["Export Package Zip"]
  editor["外部视频编辑软件"]

  input --> published
  published --> snapshot
  snapshot --> queue
  queue --> runner
  runner --> llm
  llm --> nodeOutput
  nodeOutput --> artifact
  artifact --> object
  object --> exportZip
  exportZip --> editor
```

## 8. 核心状态图：WorkflowRun

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> running: Worker picked job
  running --> waiting_for_human_edit: Node output requires edit
  waiting_for_human_edit --> running: Continue
  running --> failed: Node failed and policy is stop
  failed --> rerunning: Rerun failed node
  rerunning --> running: Node succeeded
  running --> canceled: User cancels
  running --> succeeded: All enabled nodes succeeded
  succeeded --> exporting: Export requested
  exporting --> exported: Zip uploaded
  exported --> [*]
  canceled --> [*]
```

## 9. 架构一致性要求

- MVP 使用 React Flow，但只开放线性模式，不使用普通列表替代未来画布。
- MVP 使用 Socket.IO，不使用 SSE 或轮询作为主要实时方案。
- MVP 使用 BullMQ + Redis，不使用同步 HTTP 长请求执行工作流。
- MVP 使用 S3 兼容 StorageProvider，开发默认 MinIO，不硬编码本地文件路径。
- MVP 使用 JWT + Refresh Token，只是先限制为单组织单管理员。
- Published App 绑定 WorkflowSnapshot，不直接绑定可编辑 Workflow 草稿。
