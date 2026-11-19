# Sapere IPC 与数据契约 v2

> 版本：v2.1；日期：2026-11-18；作者：Monday。  
> 性质：接口与持久化的唯一规划台账。新增命令、事件、表或文件前，先修改本文并补 contracts/schema/测试。  
> 当前状态：当前仓库只实现了一小组 S0 命令；表中标“目标”的项目尚未存在。  
> 关联：[桌面架构](03-桌面架构与数据设计.md)、[Agent 架构](02-Agent架构与技术决策.md)、[工程交付](04-里程碑与工程交付.md)。

## 1. 契约总则

### 1.1 请求与响应

传输通道固定为：

- `sapere:request`：`ipcRenderer.invoke` → Promise。
- `sapere:event`：Main → Renderer 推送。

逻辑命令使用 `domain:action`。例如 `document:save`、`agent:start`、`workspace:migrate`。命令清单由 `packages/contracts/commands.ts` 维护，`pnpm channels` 可直接枚举。

响应：

```ts
type Reply<T> =
  | { ok: true; data: T; traceId?: string }
  | { ok: false; code: string; message: string; retryable?: boolean; traceId?: string };
```

错误码稳定、可供 UI 映射；`message` 给用户看，技术堆栈只进诊断。输入参数全部经过 Zod/等价 schema 校验，并限制字符串、数组、附件和消息大小。

### 1.2 来源校验

Main 在每次请求中检查：

- 发送者必须是唯一主窗口的 `webContents`。
- 发送 frame 必须是主 frame。
- URL 必须匹配生产构建或明确开发地址。
- 命令已登记、参数 schema 通过、调用上下文未过期。

### 1.3 事件

事件使用过去式，至少含：

```ts
type AppEvent = {
  eventId: string;
  seq: number;
  type: string;
  at: string;
  runId?: string;
  data?: unknown;
};
```

高频 token 可合并；关键状态、工具、审批、产物和错误必须持久化到 `run_events` 后可重建。订阅必须返回 `unsubscribe`。

### 1.4 不暴露的接口

- `ipcRenderer`、任意 channel、任意 `invoke`。
- 通用 `db:*` CRUD、SQL、任意文件系统、shell、环境变量。
- Key 明文、认证头、完整 provider 请求。
- 未登记的 `sapere:*` 通道。

### 1.5 流式五件套

所有流式域共用：

```text
started → chunk / delta / tool → done | error | cancelled
```

- 发送/接收先比对 `requestId`（Agent 可再带 `runId`）。
- `finished` 防重复结算；启动返回和 done 只能结算一次。
- 监听器数组统一清理；返回 unsubscribe。
- 时间、序号、错误码和成功内容可重放；迟到事件不写入当前页面。

当前开发版的场景助手与模型验证均走 `model-stream.ts`。Main 将启动请求信封的 `requestId` 写入每个模型事件，同时提供 `runId`、单次调用递增的 `seq` 和 ISO 时间 `at`。助手的 `done.content` 包含完整回答，取消和错误保留已接收的片段。Renderer 按两种 ID 与序号过滤，终态、启动失败或卸载时解除订阅。跨重启重放和恢复属于 Agent 运行记录阶段。

## 2. 当前 S0 已实现命令

当前 `packages/contracts` 实际接受：

| 命令 | 用途 | 状态 |
| --- | --- | --- |
| `app:status` | 应用/进程/版本/模型状态 | 已实现 |
| `document:read` | 读取指定空间草稿 | 已实现 |
| `document:save` | 带 `baseRevision` 保存草稿 | 已实现 |
| `agent:start` | 启动 S0 LangGraph 检查点样例 | 已实现 |
| `agent:inspect` | 查看 thread 状态 | 已实现 |
| `agent:resume` | 恢复 S0 checkpoint | 已实现 |
| `worker:restart` | 重启 Backend/Agent | 已实现 |
| `model:start` | 固定工具题验证，可显式选择服务 | 已实现 |
| `model:cancel` | 取消当前模型调用 | 已实现 |
| `models:read` | 读取模型设置 | 已实现 |
| `models:save` | 保存服务配置和 Key | 已实现 |
| `models:activate` | 设置全局默认服务 | 已实现 |
| `models:remove` | 删除服务配置 | 已实现 |
| `models:reset` | 备份并重置模型设置 | 已实现 |
| `models:set-scene-default` | 保存或清除学习、工作、创作的默认服务 | 已实现 |
| `assistant:start` | 按空间解析默认模型，也接受显式模型选择的单轮流式请求 | 已实现 |
| `app:close-response` | Renderer 回复退出检查/保存结果 | 已实现 |

当前事件：

- `workers.changed`
- `app.close-requested`
- `model`（`delta/tool/done/cancelled/error`）

这些命令是 S0 证据，不代表完整 v0.2 API。下文的目标命令、表名和阶段仍按规划保留；实现时必须使用冒号形式并先登记到 `commands.ts`。

## 3. v0.2 目标命令

> 下表是 v0.2 目标命令。当前 17 条已实现命令列在第 2 节，新增命令登记在 `packages/contracts/commands.ts`，可用 `pnpm channels` 核对。

### 3.1 应用与工作区

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `app:status` | 应用、进程、版本、模型和工作区摘要 | S1 |
| `app:version` | 版本与构建信息 | S1 |
| `app:paths` | 只读展示工作区/数据/日志位置 | S1 |
| `app:sysInfo` | 系统与运行时信息 | S1 |
| `app:cacheSize` / `app:clearCache` | 缓存统计与清理 | S1 |
| `app:tempSize` / `app:clearTemp` | 临时文件统计与清理 | S1 |
| `app:startup:set` | 开机启动开关 | S1 |
| `app:tray:set` | 托盘/最小化行为 | S1 |
| `app:relaunch` / `app:quit` | 重启/退出 | S1 |
| `workspace:status` | 当前工作区状态 | S1 |
| `workspace:list` | 已登记工作区 | S1 |
| `workspace:select` | 选择内容目录 | S1 |
| `workspace:open` | 打开/切换工作区 | S1 |
| `workspace:migrate` | 迁移工作区格式 | S1 |
| `workspace:cancelMigration` | 取消迁移 | S1 |
| `workspace:cleanupMigration` | 清理失败迁移 | S1 |

### 3.2 空间、文档与笔记

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `space:list` / `space:get` | 空间列表和详情 | S2 |
| `space:create` / `space:update` / `space:delete` | 空间生命周期 | S2 |
| `space:archive` / `space:restore` | 归档和恢复 | S2 |
| `document:list` / `document:get` | 文档列表和当前内容 | S2 |
| `document:create` / `document:rename` / `document:delete` | 文档生命周期 | S2 |
| `document:read` / `document:save` | 读取/带 revision 保存 | S2 |
| `document:revisions` / `document:restore` | 修订历史/回退 | S2 |
| `noteFolder:list` / `noteFolder:create` / `noteFolder:update` / `noteFolder:delete` | 笔记文件夹 | S2 |
| `note:list` / `note:get` / `note:create` / `note:update` / `note:delete` | 笔记 | S2 |
| `search:query` | 空间内文档、笔记、来源和产出搜索 | S2 |
| `search:reindex` | 重建派生索引 | S2 |

### 3.3 对话、消息与 Chat

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `conversation:list` / `conversation:get` | 会话列表/详情 | S2 |
| `conversation:create` / `conversation:update` / `conversation:delete` | 会话生命周期 | S2 |
| `conversation:branch` | 从消息分叉新会话 | S2 |
| `conversation:export` | 导出会话 | S2 |
| `message:list` / `message:get` / `message:create` / `message:update` / `message:delete` | 消息持久化 | S2 |
| `chat:send` | 创建 Chat run | S2 |
| `chat:cancel` | 取消 Chat run | S2 |
| `chat:getRun` | 查询 Chat 状态 | S2 |
| `chat:events` | 补取已持久化事件 | S2 |

### 3.4 Agent、工具、审批与运行

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `agent:list` / `agent:get` / `agent:create` / `agent:update` / `agent:delete` | Agent 配置 | S3 |
| `subAgent:list` / `subAgent:create` / `subAgent:update` / `subAgent:delete` | 子 Agent 配置 | S3 |
| `agent:start` | 创建 Agent run | S3 |
| `agent:cancel` | 请求取消 | S3 |
| `agent:inspect` | 查看 run/thread 状态 | S3 |
| `agent:resume` | 从 checkpoint 恢复 | S3 |
| `agent:approvalRespond` | 回答审批 | S3 |
| `agent:getRun` | 查询状态、预算和错误 | S3 |
| `run:events` | 从序号补取运行事件 | S3 |
| `tool:list` / `tool:test` | 工具列表和测试 | S3 |
| `approval:list` | 查询待审批/历史 | S3 |
| `models:read` / `models:save` / `models:activate` / `models:remove` / `models:reset` | 模型配置 | S2/S3 |
| `models:test` | 连接检查，不发送用户正文 | S2 |
| `models:list` | 获取 provider 可用模型 | S2 |
| `models:cancel` | 取消模型验证 | S2 |

### 3.5 任务、产出、回收站和用量

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `taskGroup:list` / `taskGroup:create` / `taskGroup:update` / `taskGroup:delete` | 任务分组 | S2 |
| `task:list` / `task:get` / `task:create` / `task:update` / `task:delete` | 任务 | S2 |
| `task:complete` / `task:reopen` | 状态变化 | S2 |
| `output:scan` / `output:list` / `output:read` | 产出扫描和读取 | S2 |
| `output:export` / `output:delete` | 导出/软删除 | S2 |
| `trash:list` / `trash:get` | 回收站 | S2 |
| `trash:restore` / `trash:restoreBatch` | 恢复 | S2 |
| `trash:delete` / `trash:deleteBatch` / `trash:empty` | 彻底删除 | S2 |
| `usage:summary` / `usage:byModel` / `usage:byAgent` / `usage:daily` / `usage:cleanup` | 用量 | S2/S3 |
| `memory:list` / `memory:update` / `memory:retract` / `memory:clear` | 记忆 | S2 |

### 3.6 设置、主题、日志和备份

| 命令 | 说明 | 阶段 |
| --- | --- | --- |
| `settings:get` / `settings:set` / `settings:getAll` | 键值设置，不存密钥明文 | S1 |
| `theme:list` / `theme:activate` / `theme:import` / `theme:remove` | 主题包 | S1/S6 |
| `theme:stageCss` / `theme:commitCss` / `theme:discardCss` | 自定义 CSS | S6 |
| `logs:listDates` / `logs:read` / `logs:cleanup` | 脱敏日志 | S1 |
| `backup:create` / `backup:prepareRestore` / `backup:getRestoreResult` | 备份和恢复 | S1 |
| `backup:exportSpace` / `backup:importSpace` | 空间级导出/导入 | S1/S2 |

## 4. v0.3+ 目标命令

| 域 | 命令组 | 阶段 |
| --- | --- | --- |
| Wiki | `wiki:list/get/create/update/delete`, `wiki:source:*`, `wiki:page:*`, `wiki:runLint`, `wiki:runAudit`, `wiki:runOcr` | S5 |
| 知识库 | `kb:listSources/testConnection/search/analyzeRequestResponse`, `kb:setActive` | S5 |
| PDF/Office | `pdf:preflight/startOcr/listImages`, `docx:export`, `pptx:export` | S5 |
| 媒体 | `media:register/analyze/cancel/get/query/history/exportTranscript/readFrame` | S5 |
| 翻译 | `translate:start/cancel`, `translate:events` | S5 |
| 技能 | `skill:list/read/install/update/remove/enable`, `skill:importSource` | S6 |
| 工具/MCP | `tool:create/update/remove/enable`, `mcp:test/sync/readResource/getPrompt` | S6 |
| 生成任务 | `genTask:create/cancel/poll`, `genTask:events` | S7 |
| 实时 ASR | `asr:start/sendAudio/stop/cancel`, `asr:events` | S7 |
| 环境 | `env:status/create/rebuild/remove/installPackages` | S7 |
| 高级网关 | `gateway:status/start/stop/key:*`, `wechat:*` | S8 |
| 更新 | `update:check/download/install/events` | S8 |

## 5. 事件目录

| 事件 | 数据 | 阶段 |
| --- | --- | --- |
| `workers.changed` | worker 状态 | 已实现 |
| `app.close-requested` | requestId/action | 已实现 |
| `model` | runId/kind/text/code/usage | 已实现 |
| `chat.started/delta/done/error/cancelled` | runId/seq | S2 |
| `chat.approvalRequest` | approvalId/scope | S3 |
| `agent.runStarted` | runId/attemptId/provider | S3 |
| `agent.chunk` | channel/text/seq | S3 |
| `agent.toolRequested` | toolCall/scope | S3 |
| `agent.toolResult` | status/summary | S3 |
| `agent.approvalRequest` | approvalId/action/baseRevision/expiry | S3 |
| `agent.contextCompressed` | before/after/droppedRefs | S3 |
| `agent.artifactsCreated` | items | S3 |
| `agent.runDone/runError/runCancelled/runMaxIterations` | usage/error | S3 |
| `workspace.migrationProgress` | from/to/progress | S1 |
| `job.updated` | jobId/kind/status/progress | S2+ |
| `media.updated` | assetId/status | S5 |
| `genTask.updated` | taskId/status/progress | S7 |
| `asr.started/partial/complete/error/closed` | sessionId/text | S7 |
| `update.checking/available/progress/downloaded/error` | version/progress | S8 |

每条流式事件必须有终态；每个订阅返回清理函数。

## 6. 数据字典

### 6.1 核心工作台表

| 表 | 关键字段 | 约束/说明 |
| --- | --- | --- |
| `workspaces` | `id`, `label`, `format_version`, `root_ref`, `created_at` | 根路径可存受控配置；不存密钥 |
| `settings` | `key`, `scope`, `value_json`, `updated_at` | 键值表；敏感值只存密钥槽位引用 |
| `spaces` | `id`, `name`, `mode`, `icon`, `status`, `created_at`, `updated_at` | `mode=learn/work/create/mixed`；软删 |
| `documents` | `id`, `space_id`, `title`, `type`, `head_revision_id`, `status`, `created_at`, `updated_at` | 文档身份不随标题变化 |
| `document_revisions` | `id`, `document_id`, `revision_no`, `content_hash`, `content_path`, `base_revision`, `author_kind`, `created_at` | 不可变内容对象 |
| `note_folders` | `id`, `space_id`, `parent_id`, `name`, `sort` | 文件夹可空 |
| `notes` | `id`, `space_id`, `folder_id`, `title`, `content`, `links_json`, `created_at`, `updated_at` | 笔记与文档分开 |
| `conv_groups` | `id`, `space_id`, `name`, `sort` | 会话分组 |
| `conversations` | `id`, `space_id`, `group_id`, `agent_id`, `title`, `parent_conversation_id`, `branch_from_message_id`, `pinned`, `created_at` | 分叉保留来源 |
| `messages` | `id`, `conversation_id`, `parent_message_id`, `role`, `content`, `reasoning`, `status`, `model`, `tokens_in`, `tokens_out`, `created_at` | 消息树 |
| `agents` | `id`, `name`, `english_name`, `description`, `icon`, `model_ref`, `system_prompt`, `tools_json`, `skill_ids_json`, `enabled` | 英文名唯一 |
| `sub_agents` | `id`, `parent_agent_id`, `name`, `prompt`, `allowed_tools_json`, `enabled` | 只能缩小父范围 |
| `agent_runs` | `id`, `space_id`, `conversation_id`, `agent_id`, `thread_id`, `status`, `attempt_no`, `started_at`, `ended_at`, `error_code`, `usage_json` | 同 thread 单活动 run |
| `run_events` | `id`, `run_id`, `seq`, `type`, `payload_json`, `created_at` | 可重建 UI |
| `approvals` | `id`, `run_id`, `effect_id`, `tool_name`, `args_hash`, `base_revision`, `scope_json`, `expires_at`, `decision`, `decided_at` | 执行时重验 |
| `tool_effects` | `id`, `run_id`, `tool_name`, `tool_version`, `target_type`, `target_id`, `args_hash`, `status`, `result_ref`, `created_at` | 幂等与审计 |
| `skills` | `id`, `name`, `source`, `path`, `version`, `enabled`, `installed_at` | 内容来源可追溯 |
| `tools` | `id`, `name`, `schema_json`, `type`, `config_json`, `enabled` | 不存明文密钥 |
| `mcp_servers` | `id`, `name`, `transport`, `command_or_url`, `env_json`, `enabled`, `last_sync_at` | stdio 环境白名单 |
| `task_groups` | `id`, `space_id`, `name`, `sort` | 任务分组 |
| `tasks` | `id`, `space_id`, `group_id`, `title`, `status`, `due_at`, `meta_json`, `created_at` | 与 run 分开 |
| `outputs` | `id`, `space_id`, `path_ref`, `kind`, `size`, `hash`, `run_id`, `created_at` | 文件缺失可见 |
| `artifacts` | `id`, `space_id`, `run_id`, `title`, `kind`, `path_ref`, `meta_json`, `created_at` | 产物与正式文档分开 |
| `token_usage` | `id`, `space_id`, `run_id`, `model`, `agent_id`, `input`, `output`, `cached`, `source`, `created_at` | `source=reported/estimated/unknown` |
| `memories` | `id`, `space_id`, `scope`, `content`, `source`, `weight`, `created_at` | 用户可撤回 |
| `trash` | `id`, `space_id`, `category`, `ref_id`, `payload_json`, `deleted_at`, `expires_at` | 软删与彻底删除 |
| `context_bundles` | `id`, `run_id`, `scope_json`, `included_json`, `dropped_json`, `budget_json` | 实际带入范围 |

### 6.2 来源、学习、工作、创作

| 表 | 关键字段 | 约束/说明 |
| --- | --- | --- |
| `sources` | `id`, `space_id`, `origin`, `kind`, `status`, `created_at` | 原件不因分析改变 |
| `source_revisions` | `id`, `source_id`, `revision_no`, `hash`, `path_ref`, `parser_version`, `created_at` | 引用绑定修订 |
| `source_segments` | `id`, `source_revision_id`, `page_no`, `char_start`, `char_end`, `text_ref` | PDF 页/文本锚点 |
| `citations` | `id`, `source_id`, `source_revision_id`, `segment_id`, `quote_hash`, `verification` | `valid/stale/unverified` |
| `course_packages` | `id`, `space_id`, `name`, `version`, `hash`, `source_id` | 课程内容与用户记录分开 |
| `units` | `id`, `package_id`, `title`, `sort`, `content_json` | 单元身份稳定 |
| `exercise_revisions` | `id`, `unit_id`, `kind`, `prompt`, `answer_json`, `rules_json`, `confirmed`, `created_at` | AI 题未确认不入正式统计 |
| `attempts` | `id`, `exercise_revision_id`, `user_id`, `answer_json`, `scoring`, `is_retry`, `created_at` | 绑定题目快照 |
| `learning_events` | `id`, `attempt_id`, `kind`, `payload_json`, `created_at` | 提示/看答案/评分分开 |
| `review_cards` | `id`, `space_id`, `source_ref`, `content_revision`, `created_at` | 用户确认后建卡 |
| `review_states` | `card_id`, `due_at`, `stability`, `difficulty`, `reps`, `lapses`, `fsrs_version` | 调度状态 |
| `review_logs` | `id`, `card_id`, `rating`, `before_state`, `after_state`, `created_at` | 与 state 同事务 |
| `datasets` | `id`, `space_id`, `source_revision_id`, `schema_json`, `row_count` | CSV 只读源 |
| `analysis_specs` | `id`, `dataset_id`, `operations_json`, `engine_version` | 白名单操作 |
| `analysis_results` | `id`, `spec_id`, `result_hash`, `path_ref`, `metrics_json`, `created_at` | 结果来自实际执行 |
| `works` | `id`, `space_id`, `title`, `status`, `created_at` | 创作容器 |
| `chapters` | `id`, `work_id`, `document_id`, `sort` | 排序不改身份 |
| `edit_proposals` | `id`, `document_id`, `base_revision`, `selection`, `proposal_ref`, `status`, `run_id` | 候选与正式修订分开 |

### 6.3 v0.3/v0.4 表

| 表 | 关键字段 | 阶段 |
| --- | --- | --- |
| `wiki_spaces` | `id`, `space_id`, `name`, `config_json` | S5 |
| `wiki_sources` | `id`, `wiki_space_id`, `source_id`, `revision_id`, `status` | S5 |
| `wiki_pages` | `id`, `wiki_space_id`, `title`, `content_ref`, `generated_run_id`, `status` | S5 |
| `wiki_jobs` | `id`, `wiki_space_id`, `kind`, `status`, `input_json`, `error_code` | S5 |
| `kb_sources` | `id`, `space_id`, `name`, `endpoint`, `config_ref`, `enabled` | S5 |
| `media_assets` | `id`, `space_id`, `source_revision_id`, `kind`, `duration`, `status` | S5 |
| `transcripts` | `id`, `media_asset_id`, `language`, `text_ref`, `provider`, `status` | S5 |
| `conversion_jobs` | `id`, `source_id`, `target_kind`, `template_version`, `status`, `output_id` | S5 |
| `gen_tasks` | `id`, `space_id`, `kind`, `provider`, `status`, `progress`, `result_ref` | S7 |

所有表在 S1 schema 中补齐索引、外键、枚举、删除策略和迁移。表名是稳定接口；字段可以增加，不能靠改语义兼容旧数据。

## 7. 删除、版本和事务

- 文档、会话、笔记、任务、产出和知识页默认软删到 `trash`。
- 可变业务表必须有 `createdAt/updatedAt/deletedAt`；数据库只存相对路径或对象 ID，不存绝对业务路径。
- `settings`/业务设置表保存可恢复配置；localStorage 只存 UI 瞬态；Key 只存 Main Vault。
- 恢复校验原父对象、空间和文件是否仍存在；不把孤立记录强行恢复为“有效”。
- `document_revisions`、`source_revisions`、`attempts`、`review_logs`、`analysis_results` 和 `run_events` 原则上不可变。
- 删除来源不连带删除引用；引用显示 `stale`/`missing`。
- 评分与复习状态、分析方案与结果、审批与效果记录在各自事务内提交。
- 文件与数据库通过 staging、不可变对象和提交 journal 协调；不能声称跨文件系统原子。

## 8. 设置与密钥

`settings` 保存可导出的 UI/应用偏好。以下值不进入普通 settings 明文字段：

- Provider Key、认证头、OAuth/账号令牌
- 浏览器 cookie、微信会话
- 完整私人请求/正文

密钥槽位只保存标识和状态，真实密文由 Main 的 Vault 管理。项目包和应用备份默认排除密钥与登录态。

## 9. 契约变更流程

新增或修改接口必须按顺序完成：

1. 更新本文的命令/事件/表条目，标明确认的版本、范围、写者和来源。
2. 更新 `packages/contracts` 的 schema、类型和错误码。
3. 为 Backend/Agent/Main 选择明确路由；不允许页面直接改库。
4. 增加迁移（涉及表）和兼容性说明。
5. 增加单元/集成/真实 Electron 测试，覆盖拒绝、取消和恢复。
6. 更新帮助、限制和第三方来源；如果是安全或数据边界变化，新增 ADR。

未登记的命令默认拒绝；已删除命令保留拒绝或迁移期错误，不静默转发。

## 10. 数据迁移与备份检查

每次 schema 变化至少检查：

- 旧库升级成功，失败回滚。
- 新库不被旧程序写入。
- 表/索引/外键完整。
- 文档修订、来源引用、作答/复习、运行/审批和产物关系不丢。
- 备份 manifest 包含格式版本和文件哈希。
- 恢复先 staging 校验，再登记工作区。
- 迁移/恢复后的索引重建可完成，且不改变业务对象。

## 11. 当前未决项

| 事项 | 待决定 |
| --- | --- |
| 请求信封 | 是否在 v0.2 直接引入 `protocolVersion`/`requestId` 包装，或先扩展现有扁平 schema |
| 文档工作副本 | Markdown 文件是否为默认可见格式，外部变更如何进入冲突流 |
| 全文索引 | FTS5 trigram、字符索引和外部向量索引的边界 |
| 运行事件 | 在 `business.sqlite` 保存到何级粒度，与 checkpoint 如何分工 |
| 产出路径 | 空间内 `artifacts/` 与全局 `outputs/` 的索引关系 |
| MCP | stdio 进程的环境、权限和退出所有权 |
| 备份 | 完整应用备份是否包含 checkpoint；建议默认不含，单独可选 |
