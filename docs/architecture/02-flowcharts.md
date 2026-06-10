# 智能体工厂平台流程图

## 1. 总业务闭环

```mermaid
flowchart TD
  start["选择系统模板"]
  createProject["创建项目副本"]
  tuneAgents["逐个调试 Agent"]
  saveVersions["保存 AgentVersion"]
  buildWorkflow["编排 Workflow"]
  runWorkflow["运行 WorkflowRun"]
  inspect["查看中间结果"]
  decision{"结果满意？"}
  fix["回到对应 Agent / Node 调整"]
  publish["发布 WorkflowSnapshot"]
  app["生成 Published App"]
  userRun["小白用户运行应用"]
  export["下载素材包"]

  start --> createProject --> tuneAgents --> saveVersions --> buildWorkflow --> runWorkflow --> inspect --> decision
  decision -->|"否"| fix --> tuneAgents
  decision -->|"是"| publish --> app --> userRun --> export
```

## 2. 基于模板创建项目流程

```mermaid
flowchart TD
  openTemplates["打开模板列表"]
  selectTemplate["选择系统模板<br/>小说/故事生成视频素材包"]
  create["提交项目名称和描述"]
  loadTemplate["读取 TemplateVersion"]
  copyAgents["复制预置 Agents 和 AgentVersions"]
  copyWorkflow["复制预置 Workflow 和 Nodes"]
  createProject["创建 Project"]
  initAppConfig["初始化 Published App 草稿配置"]
  done["进入项目工作区"]

  openTemplates --> selectTemplate --> create --> loadTemplate --> createProject
  loadTemplate --> copyAgents --> createProject
  loadTemplate --> copyWorkflow --> createProject
  createProject --> initAppConfig --> done
```

## 3. Agent 聊天调试流程

```mermaid
flowchart TD
  selectAgent["选择 Agent"]
  editConfig["编辑 prompt / model / schema / tools"]
  send["发送测试输入"]
  validateInput{"输入符合 schema？"}
  callLLM["调用 LLM Provider"]
  parseOutput{"输出可解析？"}
  showStructured["展示结构化输出"]
  showRaw["展示 rawText 和 parseError"]
  rating["人工评价输出"]
  saveCase{"沉淀为测试用例？"}
  saveVersion{"保存为版本？"}
  testCase["创建 TestCase"]
  version["创建 AgentVersion"]

  selectAgent --> editConfig --> send --> validateInput
  validateInput -->|"否"| editConfig
  validateInput -->|"是"| callLLM --> parseOutput
  parseOutput -->|"是"| showStructured --> rating
  parseOutput -->|"否"| showRaw --> rating
  rating --> saveCase
  saveCase -->|"是"| testCase
  saveCase -->|"否"| saveVersion
  testCase --> saveVersion
  saveVersion -->|"是"| version
  saveVersion -->|"否"| editConfig
```

## 4. Agent 删除流程

```mermaid
flowchart TD
  deleteClick["点击删除 Agent"]
  checkRefs["检查 WorkflowNode 引用"]
  hasRefs{"存在引用？"}
  deleteDirect["直接删除 Agent"]
  showDeps["展示依赖节点列表"]
  choose{"用户选择"}
  removeNodes["移除相关 WorkflowNode"]
  replaceAgent["替换为其他 AgentVersion"]
  cancel["取消删除"]
  deleteAfterFix["删除 Agent"]

  deleteClick --> checkRefs --> hasRefs
  hasRefs -->|"否"| deleteDirect
  hasRefs -->|"是"| showDeps --> choose
  choose -->|"移除节点"| removeNodes --> deleteAfterFix
  choose -->|"替换 Agent"| replaceAgent --> deleteAfterFix
  choose -->|"取消"| cancel
```

## 5. Workflow 编排流程

```mermaid
flowchart TD
  openBuilder["打开 Workflow Builder"]
  canvas["React Flow 线性模式"]
  addNode["新增节点"]
  selectVersion["选择 AgentVersion"]
  configInput["配置 inputMapping"]
  configOutput["配置 outputKey"]
  configPolicy["配置 failurePolicy / allowManualEdit"]
  validate{"Workflow 校验通过？"}
  save["保存 Workflow 草稿"]
  fix["修正节点配置"]

  openBuilder --> canvas --> addNode --> selectVersion --> configInput --> configOutput --> configPolicy --> validate
  validate -->|"是"| save
  validate -->|"否"| fix --> configInput
```

## 6. WorkflowRun 执行流程

```mermaid
flowchart TD
  submit["提交初始输入"]
  createRun["创建 WorkflowRun"]
  enqueue["投递 BullMQ Job"]
  socketJoin["前端加入 run room"]
  worker["Worker 消费 Job"]
  loadNodes["加载 enabled nodes"]
  executeNode["执行当前节点"]
  saveNodeRun["保存 WorkflowNodeRun"]
  emit["Socket.IO 推送状态"]
  nodeOk{"节点成功？"}
  manual{"需要人工编辑？"}
  next{"还有下个节点？"}
  waitEdit["等待人工编辑"]
  fail["标记 Run failed"]
  complete["标记 Run succeeded"]

  submit --> createRun --> enqueue
  createRun --> socketJoin
  enqueue --> worker --> loadNodes --> executeNode --> saveNodeRun --> emit --> nodeOk
  nodeOk -->|"否"| fail
  nodeOk -->|"是"| manual
  manual -->|"是"| waitEdit
  manual -->|"否"| next
  waitEdit --> next
  next -->|"是"| executeNode
  next -->|"否"| complete
```

## 7. 失败节点重跑流程

```mermaid
flowchart TD
  failed["WorkflowRun failed"]
  inspect["查看失败节点错误"]
  editInput{"需要编辑输入/上游输出？"}
  patch["保存 editedOutput"]
  rerun["点击重跑节点"]
  enqueue["投递 rerun job"]
  execute["Worker 重跑节点"]
  success{"重跑成功？"}
  continue["从下一节点继续"]
  stillFail["保留 failed 状态并记录新错误"]

  failed --> inspect --> editInput
  editInput -->|"是"| patch --> rerun
  editInput -->|"否"| rerun
  rerun --> enqueue --> execute --> success
  success -->|"是"| continue
  success -->|"否"| stillFail
```

## 8. 导出素材包流程

```mermaid
flowchart TD
  request["请求导出 WorkflowRun"]
  checkRun{"Run 已完成？"}
  collect["收集 NodeRun 输出和 Artifact"]
  generateFiles["生成 storyboard / tasks / subtitles / manifest / README"]
  upload["上传到 MinIO / S3"]
  zip["生成 package.zip"]
  saveArtifact["保存 Artifact 记录"]
  download["返回下载地址"]
  reject["拒绝导出并提示状态"]

  request --> checkRun
  checkRun -->|"否"| reject
  checkRun -->|"是"| collect --> generateFiles --> upload --> zip --> saveArtifact --> download
```

## 9. Published App 发布流程

```mermaid
flowchart TD
  selectWorkflow["选择 Workflow"]
  validate{"Workflow 可发布？"}
  snapshot["创建 WorkflowSnapshot"]
  configPublic["配置公开输入 schema 和业务参数"]
  createApp["创建 PublishedApp"]
  enable["启用发布入口"]
  reject["提示缺失 AgentVersion / Node 配置"]

  selectWorkflow --> validate
  validate -->|"否"| reject
  validate -->|"是"| snapshot --> configPublic --> createApp --> enable
```

## 10. 小白用户运行 Published App 流程

```mermaid
flowchart TD
  open["打开 Published App"]
  input["输入小说 / 故事"]
  params["选择风格 / 比例 / 输出精细度"]
  submit["提交运行"]
  createRun["基于 WorkflowSnapshot 创建 WorkflowRun"]
  progress["查看实时进度"]
  done{"运行完成？"}
  download["下载素材包"]
  error["查看失败提示 / 联系平台拥有者"]

  open --> input --> params --> submit --> createRun --> progress --> done
  done -->|"是"| download
  done -->|"否"| error
```
