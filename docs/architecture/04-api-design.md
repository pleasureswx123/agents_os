# 智能体工厂平台 API 设计文档

## 1. API 设计原则

- REST API 负责资源创建、查询、更新、删除和运行命令。
- Socket.IO 负责双向实时事件，包括运行状态、节点日志、运行控制和未来协作事件。
- Published App 使用公开 API，但公开 API 不返回 Agent 配置、prompt、modelId、provider baseUrl、apiKeyRef 或内部 WorkflowNode 配置。
- 所有写操作必须带鉴权上下文。
- 所有 API 响应必须包含 `requestId`，便于排错和链路追踪。
- WorkflowRun 使用“HTTP 创建运行 + BullMQ 后台执行 + Socket.IO 推送状态”的模型。

## 2. 通用约定

### 2.1 Base URL

```text
/api
```

### 2.2 鉴权 Header

```http
Authorization: Bearer <access_token>
```

### 2.3 成功响应

```json
{
  "data": {},
  "requestId": "req_01J..."
}
```

### 2.4 错误响应

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 不存在",
    "details": {}
  },
  "requestId": "req_01J..."
}
```

### 2.5 分页参数

```text
GET /api/projects?page=1&pageSize=20
```

分页响应：

```json
{
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  },
  "requestId": "req_01J..."
}
```

## 3. Auth API

### 3.1 登录

```text
POST /api/auth/login
```

请求：

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

响应：

```json
{
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin"
    }
  },
  "requestId": "req_01J..."
}
```

### 3.2 刷新 Token

```text
POST /api/auth/refresh
```

请求：

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

### 3.3 退出登录

```text
POST /api/auth/logout
```

## 4. Templates API

### 4.1 获取模板列表

```text
GET /api/templates
```

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "tpl_novel_assets",
        "name": "小说/故事生成视频素材包",
        "type": "system",
        "latestVersionId": "tplv_001",
        "description": "将小说或故事转化为视频制作素材规划包"
      }
    ]
  },
  "requestId": "req_01J..."
}
```

### 4.2 获取模板版本详情

```text
GET /api/templates/{templateId}/versions/{versionId}
```

### 4.3 保存项目为自定义模板

```text
POST /api/projects/{projectId}/save-as-template
```

请求：

```json
{
  "name": "我的悬疑小说素材模板",
  "description": "适合悬疑故事的视频素材规划"
}
```

## 5. Projects API

### 5.1 项目列表

```text
GET /api/projects
```

### 5.2 基于模板创建项目

```text
POST /api/projects
```

请求：

```json
{
  "name": "我的小说素材生产项目",
  "description": "用于打磨第一条小说视频素材流程",
  "templateVersionId": "tplv_001"
}
```

响应：

```json
{
  "data": {
    "id": "project_123",
    "name": "我的小说素材生产项目",
    "templateVersionId": "tplv_001",
    "createdAt": "2026-06-10T12:00:00.000Z"
  },
  "requestId": "req_01J..."
}
```

### 5.3 项目详情

```text
GET /api/projects/{projectId}
```

### 5.4 更新项目

```text
PATCH /api/projects/{projectId}
```

### 5.5 删除项目

```text
DELETE /api/projects/{projectId}
```

## 6. Agents API

### 6.1 获取项目 Agent 列表

```text
GET /api/projects/{projectId}/agents
```

### 6.2 创建 Agent

```text
POST /api/projects/{projectId}/agents
```

请求：

```json
{
  "name": "小说分析智能体",
  "description": "负责分析小说结构、角色和情绪基调",
  "draftConfig": {
    "systemPrompt": "你是小说分析智能体...",
    "provider": {
      "type": "openai-compatible",
      "providerConfigId": "provider_default",
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
}
```

### 6.3 获取 Agent 详情

```text
GET /api/agents/{agentId}
```

### 6.4 更新 Agent 草稿配置

```text
PATCH /api/agents/{agentId}
```

### 6.5 复制 Agent

```text
POST /api/agents/{agentId}/copy
```

### 6.6 删除 Agent

```text
DELETE /api/agents/{agentId}
```

如果 Agent 被 WorkflowNode 引用，返回：

```json
{
  "error": {
    "code": "AGENT_IN_USE",
    "message": "Agent 正在被工作流节点引用",
    "details": {
      "references": [
        {
          "workflowId": "wf_123",
          "workflowNodeId": "node_123",
          "nodeName": "小说分析"
        }
      ]
    }
  },
  "requestId": "req_01J..."
}
```

### 6.7 聊天调试

```text
POST /api/agents/{agentId}/chat
```

请求：

```json
{
  "chatSessionId": "chat_123",
  "input": {
    "text": "这里是一段故事文本"
  }
}
```

响应：

```json
{
  "data": {
    "chatSessionId": "chat_123",
    "messageId": "msg_456",
    "output": {
      "summary": "故事概要",
      "characters": []
    },
    "rawText": null,
    "parseError": null,
    "usage": {
      "promptTokens": 1200,
      "completionTokens": 600,
      "totalTokens": 1800
    }
  },
  "requestId": "req_01J..."
}
```

## 7. Agent Versions API

### 7.1 保存版本

```text
POST /api/agents/{agentId}/versions
```

请求：

```json
{
  "versionName": "v1-小说分析稳定版",
  "notes": "角色识别和章节拆分效果稳定"
}
```

### 7.2 版本列表

```text
GET /api/agents/{agentId}/versions
```

### 7.3 版本详情

```text
GET /api/agent-versions/{versionId}
```

### 7.4 恢复版本到草稿

```text
POST /api/agents/{agentId}/restore-version
```

请求：

```json
{
  "agentVersionId": "av_123"
}
```

## 8. Evaluation API

### 8.1 创建测试用例

```text
POST /api/agents/{agentId}/test-cases
```

请求：

```json
{
  "name": "短篇悬疑故事测试",
  "input": {
    "text": "测试故事文本"
  },
  "expectedNotes": "应输出角色、场景和情绪基调",
  "createdFromChatMessageId": "msg_456"
}
```

### 8.2 测试用例列表

```text
GET /api/agents/{agentId}/test-cases
```

### 8.3 运行测试用例

```text
POST /api/test-cases/{testCaseId}/run
```

请求：

```json
{
  "agentVersionId": "av_123"
}
```

### 8.4 更新测试结果评分

```text
PATCH /api/test-results/{testResultId}
```

请求：

```json
{
  "rating": "good",
  "notes": "输出结构稳定，角色识别正确"
}
```

## 9. Workflows API

### 9.1 Workflow 列表

```text
GET /api/projects/{projectId}/workflows
```

### 9.2 创建 Workflow

```text
POST /api/projects/{projectId}/workflows
```

### 9.3 更新 Workflow

```text
PATCH /api/workflows/{workflowId}
```

### 9.4 创建节点

```text
POST /api/workflows/{workflowId}/nodes
```

请求：

```json
{
  "name": "小说分析",
  "agentVersionId": "av_123",
  "position": {
    "x": 120,
    "y": 80
  },
  "inputMapping": {
    "source": "workflow_input",
    "path": "$.text",
    "target": "text"
  },
  "outputKey": "novel_analysis",
  "allowManualEdit": true,
  "failurePolicy": "stop",
  "enabled": true
}
```

### 9.5 更新节点

```text
PATCH /api/workflow-nodes/{nodeId}
```

### 9.6 删除节点

```text
DELETE /api/workflow-nodes/{nodeId}
```

### 9.7 创建发布快照

```text
POST /api/workflows/{workflowId}/snapshots
```

请求：

```json
{
  "versionName": "小说素材生产发布版 v1",
  "notes": "用于小白应用端首次发布"
}
```

## 10. Workflow Runs API

### 10.1 创建运行

```text
POST /api/workflows/{workflowId}/runs
```

请求：

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

响应：

```json
{
  "data": {
    "workflowRunId": "run_123",
    "status": "queued",
    "socketRoom": "workflow-run:run_123"
  },
  "requestId": "req_01J..."
}
```

### 10.2 查询运行详情

```text
GET /api/workflow-runs/{runId}
```

### 10.3 编辑节点输出

```text
PATCH /api/workflow-runs/{runId}/nodes/{nodeRunId}/output
```

请求：

```json
{
  "editedOutput": {
    "summary": "人工修正后的概要"
  },
  "reason": "修正角色关系"
}
```

### 10.4 重跑节点

```text
POST /api/workflow-runs/{runId}/rerun-node
```

请求：

```json
{
  "workflowNodeId": "node_123",
  "useEditedUpstreamOutput": true
}
```

### 10.5 继续运行

```text
POST /api/workflow-runs/{runId}/resume
```

请求：

```json
{
  "fromWorkflowNodeId": "node_456"
}
```

### 10.6 取消运行

```text
POST /api/workflow-runs/{runId}/cancel
```

## 11. Artifacts API

### 11.1 查询运行产物

```text
GET /api/workflow-runs/{runId}/artifacts
```

### 11.2 导出素材包

```text
POST /api/workflow-runs/{runId}/export
```

### 11.3 下载导出包

```text
GET /api/workflow-runs/{runId}/download
```

## 12. Published Apps API

### 12.1 创建 Published App

```text
POST /api/projects/{projectId}/published-apps
```

请求：

```json
{
  "workflowSnapshotId": "wfs_123",
  "slug": "novel-assets",
  "name": "小说视频素材生成器",
  "description": "输入故事，生成视频制作素材规划包",
  "publicInputSchema": {
    "type": "object",
    "required": ["text"],
    "properties": {
      "text": { "type": "string" },
      "style": { "type": "string" },
      "aspectRatio": { "type": "string" }
    }
  }
}
```

### 12.2 Published App 详情

```text
GET /api/published-apps/{slug}
```

只返回公开信息，不返回内部配置。

### 12.3 运行 Published App

```text
POST /api/published-apps/{slug}/runs
```

### 12.4 查询公开运行

```text
GET /api/public-runs/{publicRunId}
```

### 12.5 下载公开运行结果

```text
GET /api/public-runs/{publicRunId}/download
```

## 13. Socket.IO 事件

### 13.1 连接鉴权

客户端连接时传入：

```json
{
  "auth": {
    "token": "jwt_access_token"
  }
}
```

### 13.2 加入运行房间

客户端发送：

```text
run.join
```

payload：

```json
{
  "workflowRunId": "run_123"
}
```

### 13.3 运行状态事件

服务端发送：

```text
run.queued
run.running
run.waiting_for_human_edit
run.failed
run.succeeded
run.canceled
run.exporting
run.exported
```

payload：

```json
{
  "workflowRunId": "run_123",
  "status": "running",
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

### 13.4 节点状态事件

服务端发送：

```text
node.queued
node.running
node.output
node.failed
node.succeeded
node.rerunning
node.skipped
```

payload：

```json
{
  "workflowRunId": "run_123",
  "workflowNodeId": "node_123",
  "workflowNodeRunId": "noderun_123",
  "status": "succeeded",
  "outputPreview": {
    "summary": "输出摘要"
  },
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

### 13.5 运行控制事件

客户端发送：

```text
run.control
```

payload：

```json
{
  "workflowRunId": "run_123",
  "command": "cancel",
  "reason": "用户主动取消"
}
```

支持命令：

- `cancel`
- `pause`
- `resume`
- `rerun_node`

服务端响应：

```text
run.control.applied
run.control.rejected
```

## 14. 错误码

| 错误码 | 含义 |
| --- | --- |
| `UNAUTHORIZED` | 未登录或 token 无效 |
| `FORBIDDEN` | 无权限访问资源 |
| `VALIDATION_ERROR` | 请求参数校验失败 |
| `PROJECT_NOT_FOUND` | 项目不存在 |
| `TEMPLATE_NOT_FOUND` | 模板不存在 |
| `AGENT_NOT_FOUND` | Agent 不存在 |
| `AGENT_IN_USE` | Agent 被 WorkflowNode 引用，不能直接删除 |
| `AGENT_VERSION_NOT_FOUND` | AgentVersion 不存在 |
| `WORKFLOW_NOT_FOUND` | Workflow 不存在 |
| `WORKFLOW_INVALID` | Workflow 配置不完整，不能运行或发布 |
| `WORKFLOW_RUN_NOT_FOUND` | WorkflowRun 不存在 |
| `NODE_RUN_FAILED` | 节点运行失败 |
| `PROVIDER_CALL_FAILED` | 模型或工具调用失败 |
| `OUTPUT_PARSE_FAILED` | 模型输出无法按 schema 解析 |
| `ARTIFACT_NOT_FOUND` | Artifact 不存在 |
| `EXPORT_NOT_READY` | 导出包尚未生成 |
| `PUBLISHED_APP_NOT_FOUND` | Published App 不存在 |

## 15. 权限边界

| 场景 | 权限要求 |
| --- | --- |
| 工厂侧项目、Agent、Workflow 管理 | 登录用户，MVP 单组织管理员 |
| WorkflowRun 控制命令 | 登录用户，且可访问对应 Project |
| Published App 公开运行 | 可匿名或轻量 token，具体由 PublishedApp.accessPolicy 控制 |
| Published App 内部配置查看 | 不允许公开访问 |
| API key 明文读取 | 不允许 |
| 导出包下载 | 工厂侧需要登录；小白侧需要 publicRunId 或下载 token |
