# 智能体工厂平台架构文档索引

## 1. 文档目的

本目录用于沉淀“智能体工厂平台”的完整架构说明，覆盖架构图、业务流程图、运行时序图、API 设计和数据结构。

这些文档遵循一个统一原则：

> MVP 可以减少功能范围，但不能选择临时、割裂、以后必然替换的技术路线。MVP 应在最终架构上交付较少能力，后续在同一架构上渐进增强。

因此，MVP 阶段即采用：

- React Flow 作为工作流画布，只先开放线性流程模式。
- Socket.IO / WebSocket 作为双向实时通信基础。
- BullMQ + Redis 作为 WorkflowRun / NodeRun 后台调度基础。
- MinIO / S3 兼容对象存储作为 Artifact 和导出包存储基础。
- JWT + Refresh Token 作为鉴权基础。
- Template / TemplateVersion 作为模板版本化基础。
- PublishedApp 绑定发布快照，不直接绑定可编辑 Workflow 草稿。

## 2. 文档清单

| 文档 | 内容 |
| --- | --- |
| [01-architecture-diagrams.md](./01-architecture-diagrams.md) | 系统上下文图、容器图、后端模块图、部署图、数据流图 |
| [02-flowcharts.md](./02-flowcharts.md) | 项目创建、Agent 调试、Workflow 编排、运行、导出、发布等流程图 |
| [03-sequence-diagrams.md](./03-sequence-diagrams.md) | 创建项目、聊天调试、保存版本、运行工作流、重跑节点、导出素材包、Published App 运行等时序图 |
| [04-api-design.md](./04-api-design.md) | REST API、Socket.IO 事件、统一响应格式、错误码、鉴权与权限边界 |
| [05-data-model.md](./05-data-model.md) | 核心实体、ER 图、状态机、Prisma 数据结构、JSON 字段约定 |
| [06-openapi-draft.md](./06-openapi-draft.md) | 可迁移到 Swagger / OpenAPI 的接口草案 |

## 3. 核心域对象

平台核心对象如下：

```text
Organization / User
  -> Project
    -> Agent
      -> AgentVersion
    -> Workflow
      -> WorkflowNode
      -> WorkflowSnapshot
      -> WorkflowRun
        -> WorkflowNodeRun
        -> Artifact
    -> TestCase
      -> TestResult
    -> PublishedApp
      -> PublishedAppRun
```

## 4. 首个业务模板

首个系统模板为“小说/故事生成视频素材包”。

默认工作流：

```text
输入小说/故事
-> 小说分析智能体
-> 角色画像智能体
-> 场景拆解智能体
-> 分镜脚本智能体
-> 素材生成规划智能体
-> 素材包整理智能体
-> 导出素材包
```

第一版以 LLM 文本智能体和结构化素材规划为主，不做最终视频合成。最终视频合成由剪映、Premiere Pro、DaVinci Resolve、万兴喵影等成熟视频编辑软件完成。

## 5. 架构边界

平台负责：

- 创建、配置、调试和版本化 Agent。
- 将 Agent 编排成 Workflow。
- 通过 BullMQ Worker 执行 WorkflowRun。
- 通过 Socket.IO 推送运行状态、节点日志和运行控制事件。
- 保存中间输出、最终产物和运行追踪信息。
- 导出结构化素材包。
- 将 Workflow 发布为小白用户可使用的 Published App。

平台不负责：

- 第一版不做最终视频合成。
- 第一版不做完整媒体生成闭环，只产出媒体生成任务和提示词。
- 第一版不开放复杂 DAG 功能，但 React Flow 画布从 MVP 即作为工作流基础。
- 第一版不做多租户套餐计费，但数据结构预留 Organization、UsageRecord 等演进空间。
