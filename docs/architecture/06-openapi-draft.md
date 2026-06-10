# 智能体工厂平台 OpenAPI 草案

## 1. 说明

本文档不是完整可运行的 OpenAPI YAML，而是可直接迁移到 Swagger / OpenAPI 的接口草案。完整接口语义见 [04-api-design.md](./04-api-design.md)。

## 2. Tags

```yaml
tags:
  - name: Auth
  - name: Templates
  - name: Projects
  - name: Agents
  - name: AgentVersions
  - name: Evaluations
  - name: Workflows
  - name: WorkflowRuns
  - name: Artifacts
  - name: PublishedApps
```

## 3. Security

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## 4. 通用 Schemas

```yaml
components:
  schemas:
    ApiSuccess:
      type: object
      required: [data, requestId]
      properties:
        data:
          type: object
        requestId:
          type: string

    ApiError:
      type: object
      required: [error, requestId]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
        requestId:
          type: string

    Pagination:
      type: object
      properties:
        page:
          type: integer
        pageSize:
          type: integer
        total:
          type: integer
```

## 5. 核心资源 Schemas

```yaml
components:
  schemas:
    Project:
      type: object
      required: [id, organizationId, name, createdAt, updatedAt]
      properties:
        id:
          type: string
        organizationId:
          type: string
        templateVersionId:
          type: string
          nullable: true
        name:
          type: string
        description:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Agent:
      type: object
      required: [id, projectId, name, draftConfig, createdAt, updatedAt]
      properties:
        id:
          type: string
        projectId:
          type: string
        name:
          type: string
        description:
          type: string
          nullable: true
        draftConfig:
          type: object
        currentVersionId:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    AgentVersion:
      type: object
      required: [id, agentId, versionName, configSnapshot, createdAt]
      properties:
        id:
          type: string
        agentId:
          type: string
        versionName:
          type: string
        configSnapshot:
          type: object
        notes:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time

    Workflow:
      type: object
      required: [id, projectId, name, status, createdAt, updatedAt]
      properties:
        id:
          type: string
        projectId:
          type: string
        name:
          type: string
        description:
          type: string
          nullable: true
        status:
          type: string
          enum: [draft, valid, published, archived]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    WorkflowNode:
      type: object
      required: [id, workflowId, orderIndex, name, type, inputMapping, outputKey, enabled]
      properties:
        id:
          type: string
        workflowId:
          type: string
        orderIndex:
          type: integer
        name:
          type: string
        type:
          type: string
          enum: [agent, tool, manual]
        agentVersionId:
          type: string
          nullable: true
        position:
          type: object
          nullable: true
        inputMapping:
          type: object
        outputKey:
          type: string
        allowManualEdit:
          type: boolean
        failurePolicy:
          type: string
          enum: [stop, skip]
        enabled:
          type: boolean

    WorkflowRun:
      type: object
      required: [id, projectId, source, status, initialInput, queuedAt]
      properties:
        id:
          type: string
        projectId:
          type: string
        workflowId:
          type: string
          nullable: true
        workflowSnapshotId:
          type: string
          nullable: true
        publishedAppId:
          type: string
          nullable: true
        source:
          type: string
          enum: [factory, published_app]
        status:
          type: string
          enum: [queued, running, waiting_for_human_edit, failed, rerunning, canceled, succeeded, exporting, exported]
        initialInput:
          type: object
        errorSummary:
          type: string
          nullable: true
        queuedAt:
          type: string
          format: date-time
        startedAt:
          type: string
          format: date-time
          nullable: true
        finishedAt:
          type: string
          format: date-time
          nullable: true
```

## 6. Paths 草案

### 6.1 Auth

```yaml
paths:
  /api/auth/login:
    post:
      tags: [Auth]
      summary: Login

  /api/auth/refresh:
    post:
      tags: [Auth]
      summary: Refresh access token

  /api/auth/logout:
    post:
      tags: [Auth]
      summary: Logout
```

### 6.2 Projects

```yaml
paths:
  /api/projects:
    get:
      tags: [Projects]
      summary: List projects
      security:
        - bearerAuth: []
    post:
      tags: [Projects]
      summary: Create project from template
      security:
        - bearerAuth: []

  /api/projects/{projectId}:
    get:
      tags: [Projects]
      summary: Get project
      security:
        - bearerAuth: []
    patch:
      tags: [Projects]
      summary: Update project
      security:
        - bearerAuth: []
    delete:
      tags: [Projects]
      summary: Delete project
      security:
        - bearerAuth: []

  /api/projects/{projectId}/save-as-template:
    post:
      tags: [Templates]
      summary: Save project as custom template
      security:
        - bearerAuth: []
```

### 6.3 Agents

```yaml
paths:
  /api/projects/{projectId}/agents:
    get:
      tags: [Agents]
      summary: List project agents
      security:
        - bearerAuth: []
    post:
      tags: [Agents]
      summary: Create agent
      security:
        - bearerAuth: []

  /api/agents/{agentId}:
    get:
      tags: [Agents]
      summary: Get agent
      security:
        - bearerAuth: []
    patch:
      tags: [Agents]
      summary: Update agent draft config
      security:
        - bearerAuth: []
    delete:
      tags: [Agents]
      summary: Delete agent
      security:
        - bearerAuth: []

  /api/agents/{agentId}/copy:
    post:
      tags: [Agents]
      summary: Copy agent
      security:
        - bearerAuth: []

  /api/agents/{agentId}/chat:
    post:
      tags: [Agents]
      summary: Test agent by chat
      security:
        - bearerAuth: []

  /api/agents/{agentId}/versions:
    get:
      tags: [AgentVersions]
      summary: List agent versions
      security:
        - bearerAuth: []
    post:
      tags: [AgentVersions]
      summary: Create agent version
      security:
        - bearerAuth: []
```

### 6.4 Workflows

```yaml
paths:
  /api/projects/{projectId}/workflows:
    get:
      tags: [Workflows]
      summary: List project workflows
      security:
        - bearerAuth: []
    post:
      tags: [Workflows]
      summary: Create workflow
      security:
        - bearerAuth: []

  /api/workflows/{workflowId}:
    get:
      tags: [Workflows]
      summary: Get workflow
      security:
        - bearerAuth: []
    patch:
      tags: [Workflows]
      summary: Update workflow
      security:
        - bearerAuth: []
    delete:
      tags: [Workflows]
      summary: Delete workflow
      security:
        - bearerAuth: []

  /api/workflows/{workflowId}/nodes:
    post:
      tags: [Workflows]
      summary: Create workflow node
      security:
        - bearerAuth: []

  /api/workflow-nodes/{nodeId}:
    patch:
      tags: [Workflows]
      summary: Update workflow node
      security:
        - bearerAuth: []
    delete:
      tags: [Workflows]
      summary: Delete workflow node
      security:
        - bearerAuth: []

  /api/workflows/{workflowId}/snapshots:
    post:
      tags: [Workflows]
      summary: Create workflow publish snapshot
      security:
        - bearerAuth: []

  /api/workflows/{workflowId}/runs:
    post:
      tags: [WorkflowRuns]
      summary: Create workflow run
      security:
        - bearerAuth: []
```

### 6.5 Workflow Runs

```yaml
paths:
  /api/workflow-runs/{runId}:
    get:
      tags: [WorkflowRuns]
      summary: Get workflow run
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/nodes/{nodeRunId}/output:
    patch:
      tags: [WorkflowRuns]
      summary: Edit node run output
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/rerun-node:
    post:
      tags: [WorkflowRuns]
      summary: Rerun workflow node
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/resume:
    post:
      tags: [WorkflowRuns]
      summary: Resume workflow run
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/cancel:
    post:
      tags: [WorkflowRuns]
      summary: Cancel workflow run
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/export:
    post:
      tags: [Artifacts]
      summary: Export workflow run package
      security:
        - bearerAuth: []

  /api/workflow-runs/{runId}/download:
    get:
      tags: [Artifacts]
      summary: Download export package
      security:
        - bearerAuth: []
```

### 6.6 Published Apps

```yaml
paths:
  /api/projects/{projectId}/published-apps:
    post:
      tags: [PublishedApps]
      summary: Create published app
      security:
        - bearerAuth: []

  /api/published-apps/{slug}:
    get:
      tags: [PublishedApps]
      summary: Get public app info

  /api/published-apps/{slug}/runs:
    post:
      tags: [PublishedApps]
      summary: Run published app

  /api/public-runs/{publicRunId}:
    get:
      tags: [PublishedApps]
      summary: Get public run status

  /api/public-runs/{publicRunId}/download:
    get:
      tags: [PublishedApps]
      summary: Download public run package
```

## 7. Socket.IO 事件草案

```yaml
socketEvents:
  clientToServer:
    run.join:
      payload:
        workflowRunId: string
    run.control:
      payload:
        workflowRunId: string
        command: cancel | pause | resume | rerun_node
        workflowNodeId: string?
        reason: string?

  serverToClient:
    run.queued:
      payload:
        workflowRunId: string
        status: queued
    run.running:
      payload:
        workflowRunId: string
        status: running
    run.failed:
      payload:
        workflowRunId: string
        status: failed
        errorSummary: string
    run.succeeded:
      payload:
        workflowRunId: string
        status: succeeded
    node.running:
      payload:
        workflowRunId: string
        workflowNodeId: string
        workflowNodeRunId: string
    node.output:
      payload:
        workflowRunId: string
        workflowNodeRunId: string
        outputPreview: object
    node.failed:
      payload:
        workflowRunId: string
        workflowNodeRunId: string
        error: object
    node.succeeded:
      payload:
        workflowRunId: string
        workflowNodeRunId: string
        usage: object?
```
