# ADR-004：S0.5 工作台约定与 12 服务边界

日期：2026-11-18。状态：已纳入 v2.1 规划；不表示全部实现完成。  
输入：`REVIVA-ANATOMY.md`、`CODEX-BRIEF.md`、`REBUILD-SPEC.md`。  
关联：[规划 v2.1](../../docs-sapere/planning-v2/README.md)、[ANATOMY 吸收](../../docs-sapere/planning-v2/08-REVIVA-ANATOMY吸收与施工顺序.md)、[工程交付](../../docs-sapere/planning-v2/04-里程碑与工程交付.md)。

## 背景

REVIVA-ANATOMY 给出了完整桌面工作台的服务拆分、流式封装、数据铁律、模型解析器、提示词模板、UI 范式和 P0–P3 执行顺序。Sapere 已经有 React、`node:sqlite`、utilityProcess、命令注册和单轮模型流的第一版，但不能把这些约定留给业务页面边写边补。

## 决策

### 1. 新增 S0.5

在 S0 技术退出与 S1 工作区底座之间增加 `S0.5 工作台约定对齐`，覆盖：

- 命令清单、请求 envelope、未登记命令拒绝；
- 流式五件套、requestId、finished 防重、监听清理；
- audit 字段、相对路径、settings/localStorage 分工；
- 视觉令牌第一批、组件四件套、模态框和设置页骨架；
- 模型解析器、提示词模板和防注入前缀；
- CSP、自定义协议、fuses、路径和 Key 检查。

### 2. 12 个服务域

后台采用 AI、数据、文件、工作区、环境、文档、媒体、知识、扩展、外观、外壳、对外 12 个服务域。每个服务由“命令注册 + 业务实现”组成：

- 注册层只做来源、schema、权限和路由；
- 业务层不 import Electron 窗口对象；
- 跨域通过领域命令/端口，不直接改别人的表；
- Main 不执行重计算。

### 3. 流式

所有 AI 流式统一：

```text
started → chunk / delta / tool → done | error | cancelled
```

必须同时具备 requestId 过滤、finished 防重、监听器统一清理和结果兜底。Chat、Agent、翻译、OCR、媒体任务不再各写一套。

### 4. 数据

- 可变业务表至少含 `createdAt/updatedAt/deletedAt`；
- 删除写 `trash` + 打软删标记，恢复保留原 ID；
- 业务库只存相对工作区根的路径或对象 ID；
- `settings` 保存可恢复配置，localStorage 只存 UI 瞬态，Key 只进 Main Vault。

### 5. 模型和提示词

模型选择按“显式 → scope 默认 → 首个已启用可用服务 → 人话错误”解析，Renderer 不写兜底。提示词放独立模板文件，统一防注入前缀，外部正文只作为数据。

### 6. 计划重估

v0.2 包含 S0 剩余、S0.5、S1–S4，规划区间调整为约 **295–475 小时**；完整 S0–S9 约 **575–955 小时**。这是规划估算，不是工期承诺，实际按阶段证据重估。

## 不采纳

- 不照搬 424 条通道、86 条路由、20/21 张表或约 90 个技能包的规模数字。
- 不采用 Vue、`better-sqlite3`、单个 5 MB 主进程 bundle 或裸 `db:*` 桥。
- 不复制品牌、图标、技能正文或原程序具体实现。
- 不把本地网关、微信桥、实时语音放入 v0.2 必经路径。

## 后果

- 现有命令已迁移为 `域:动作`，`pnpm channels` 可枚举；后续命令必须登记。
- 现有 schema v3 已加审计字段；trash 表和恢复命令仍需补齐。
- 当前模型流已有 `started` 和按 run 过滤；请求级 requestId 与 Agent/翻译/OCR 复用仍待 S0.5/S1。
- 旧 S0/S1 文档中的点号命令和 216–320 px 侧栏是历史或当前实现，不作为新页面目标。

## 证据

- `proof`：`pnpm typecheck`、`pnpm test:unit`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 5/5（项目 runtime）。
- 记录：[CODEX-BRIEF-AUDIT](../../docs-sapere/implementation/CODEX-BRIEF-AUDIT.md)。
