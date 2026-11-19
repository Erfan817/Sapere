# Sapere 桌面项目规划 v2

> 版本：v2.1；日期：2026-11-18；作者：Monday。  
> 适用范围：Windows 11 x64 优先、本地优先、单用户、Electron + React + TypeScript 的桌面 AI 工作台。  
> 规划依据：现有 Sapere 产品方向、S0 实测证据，以及 `REBUILD-SPEC.md` 对本地 AI 桌面工作台的结构与行为拆解。  
> 重要边界：本目录是下一阶段开发基线，不表示 v0.2 之后的页面、通道、数据库表或能力已经实现。

## 1. 这次重写解决了什么

`planning-v1` 的重心是学习、工作、创作三条业务闭环，工程部分已经正确选择了 Electron、React、TypeScript、SQLite 和 LangGraph，但它没有完整吸收成熟桌面工作台的产品结构与接口纪律。`REBUILD-SPEC.md` 和 `REVIVA-ANATOMY.md` 提供了工作台骨架、12 个后台服务、流式五件套、数据铁律和 P0–P3 施工顺序。

v2 不把 Sapere 改成参考程序的换皮版本，而是采用下面的组合：

```text
成熟的本地 AI 工作台底座
  + Sapere 的学习、工作、创作业务内核
  + 本地优先、来源可核对、修改可恢复
  + 明确的权限、审批、运行记录和发布边界
```

参考规格中的品牌、文案、技能内容和实现细节不复用；只吸收通用结构、交互范式和工程约束。

## 2. 核心决策

| 领域 | v2 决策 | 与参考规格的关系 |
| --- | --- | --- |
| 产品形态 | 本机 AI 工作台；学习、工作、创作三个空间独立成立，也能共享资料、任务、版本和记忆 | 吸收工作台结构，不替换 Sapere 的业务定位 |
| UI | React 19 + TypeScript，当前三栏工作区继续演进 | 参考规格使用 Vue；本项目保留已验证的 React |
| 桌面壳 | Electron Main + sandbox preload + React Renderer | 采纳 |
| 业务进程 | Backend `utilityProcess` 是 `business.sqlite` 唯一写者 | 采纳并继续保持 |
| Agent 进程 | 独立 Agent `utilityProcess`，独立 checkpoint 库 | 采纳 |
| 后台服务 | 按 AI、数据、文件、工作区、环境、文档、媒体、知识、扩展、外观、外壳、对外 12 域拆职责 | 采纳服务边界，不照搬原程序文件布局 |
| 流式约定 | `started → chunk/tool → done/error/cancelled`，统一 requestId、防重结算和监听清理 | 采纳五件套，当前模型流已完成第一步 |
| 数据约定 | 审计字段、相对路径、settings/localStorage 分工、软删进回收站 | 采纳并作为 S1 发布门槛 |
| 数据库 | Electron 内嵌 `node:sqlite`，版本化迁移 | 不采用 `better-sqlite3`：本项目已实测其 V8/ABI 构建失败；保留可替换端口 |
| 前端桥 | `window.sapere.request/subscribe` 统一窄桥，域内使用 `domain:action` 命令 | 采纳“通道登记、只暴露函数”原则；不接受渲染层直接 `db:*` CRUD |
| Agent | LangChain `createAgent` + LangGraph checkpoint；Deep Agents 作为受控 profile | 采纳 |
| 扩展 | 可信内置能力优先；技能包、自定义工具、MCP 分阶段开放 | 采纳；不复制参考程序的约 90 个技能内容 |
| 发布 | v0.2 工作台闭环；v0.3 知识与文档；v0.4 扩展与媒体；v1.0 可选系统桥接 | M0–M7 作为能力分组，映射到 Sapere 的 S 阶段 |

## 3. 当前事实与规划的分界

截至 2026-11-18，项目的实际基线是：

- 已有 Electron / React / TypeScript S0 骨架、sandbox Renderer、两个真实 `utilityProcess`、业务 SQLite、LangGraph 磁盘检查点、未签名 NSIS 测试包。
- 已有三个独立文档空间、三套主题、模型服务配置、流式场景助手、手动修改审阅和退出保护。
- 已有默认沙箱下的开发态、打包态回归；真实远端模型成功调用、真人中文 IME、干净 Windows 安装/卸载仍未完成。
- 当前每个空间只有一份技术草稿；还没有正式的多文档、多会话、笔记、Wiki、知识库、任务中心、技能包和 MCP 管理。
- S0.5 已部分落地：16 条命令迁移为 `域:动作`、请求信封、模型流 `started`、schema v3 审计字段和第一批视觉令牌；完整五件套、trash、组件四件套、模型解析器和提示词模板仍未完成。证据见 [CODEX-BRIEF 对照审计](../implementation/CODEX-BRIEF-AUDIT.md)。

实施状态以 [S0 验证记录](../implementation/S0-validation.md)、[CODEX-BRIEF 对照审计](../implementation/CODEX-BRIEF-AUDIT.md) 和 [界面体验更新](../implementation/workspace-experience.md) 为准。规划文档不能覆盖、改写或替代这些证据。

本文档中的状态标记统一如下：

- `[已实现]`：当前仓库和证据记录可以直接支持。
- `[规划]`：本文档定义、尚未完成。
- `[参考]`：只在参考规格中出现，不自动进入 Sapere 范围。
- `[阻断]`：已发现必须解决，不能在计划中跳过。

## 4. 阅读顺序

| 顺序 | 文档 | 用途 |
| --- | --- | --- |
| 1 | [00-项目规划总纲](00-项目规划总纲.md) | 产品定义、原则、平台与业务关系、版本路线、范围边界 |
| 2 | [01-产品范围与验收](01-产品范围与验收.md) | 发布切片、FR/AC、三类业务与平台验收场景 |
| 3 | [02-Agent架构与技术决策](02-Agent架构与技术决策.md) | 对话与 Agent 分层、状态、工具、审批、恢复、模型和扩展 |
| 4 | [03-桌面架构与数据设计](03-桌面架构与数据设计.md) | 进程、安全、文件、数据库、迁移、备份和模块边界 |
| 5 | [04-里程碑与工程交付](04-里程碑与工程交付.md) | S0–S9（含 S0.5）、任务、估算、测试、CI、打包和风险 |
| 6 | [05-UI布局与交互设计](05-UI布局与交互设计.md) | 当前已实现三栏界面与 v0.2 目标信息架构 |
| 7 | [06-IPC与数据契约](06-IPC与数据契约.md) | 命令清单、事件、表结构和接口登记规则 |
| 8 | [07-参考规格吸收与差异决策](07-参考规格吸收与差异决策.md) | 重建说明书逐节吸收、改写、拒绝与待决策项 |
| 9 | [08-REVIVA-ANATOMY吸收与施工顺序](08-REVIVA-ANATOMY吸收与施工顺序.md) | 12 服务、五件套、数据铁律、模型解析、提示词模板和调整后的 P0–P3 计划 |
| 10 | [09-界面布局复刻手册](09-界面布局复刻手册.md) · [界面布局原型](界面布局原型.html) | 参考布局规格与 Sapere 的可交互设计预览 |

## 5. 版本关系

- 本目录取代 v1 中的产品范围、Agent 决策、桌面架构、里程碑和 UI 规划。
- `docs/adr/ADR-001` 与 `docs/adr/ADR-002` 继续作为已验证技术事实；v2 只在其上扩展，不把 `node:sqlite` 或进程边界改回去。
- 新增 [ADR-003](../../docs/adr/ADR-003-v2-platform-scope-and-reference-boundaries.md) 与 [ADR-004](../../docs/adr/ADR-004-s0-5-workbench-conventions-and-service-boundaries.md)，分别记录参考规格边界和 S0.5/12 服务决策。

下一阶段的默认入口是 v0.2 工作台闭环；Wiki、知识库、媒体、实时语音、本地网关和微信桥不被当作 v0.2 的隐性前置。
