# CODEX-BRIEF 对照审计与更新

日期：2026-11-18。工作目录：`<项目目录>`。  
输入：`CODEX-BRIEF.md`。  
用途：把“本地 AI 工作台”的工程约定逐条对照 Sapere，记录已满足、部分满足和缺失项，并保留本轮改动与验证证据。

后续补充：`REVIVA-ANATOMY.md` 的完整服务拆分、数据铁律、流式五件套和 P0–P3 计划已吸收到 [planning-v2/08](../planning-v2/08-REVIVA-ANATOMY吸收与施工顺序.md)。

## 1. 当前技术栈

- Electron 45.3.2，内嵌 Node 24.22.2，ABI 150。
- React 19.3.1，TypeScript 7.0.2，electron-vite 6.0.0。
- `node:sqlite`：Backend 业务库与 Agent checkpoint 分开；不使用 `better-sqlite3`（ADR-001）。
- LangChain 1.6.6、LangGraph 1.7.4、checkpoint 1.2.2、OpenAI adapter 1.8.4。
- pnpm 11.25.0；Node 开发版本 24.x。
- 当前没有 `@electron/fuses` 配置、自动更新、主题包和正式回收站 UI。

## 2. 当前目录与职责

```text
apps/desktop/src/main/       窗口、Supervisor、模型网关、系统集成
apps/desktop/src/preload/    唯一 Electron 桥
apps/desktop/src/renderer/   React 工作台、编辑器、助手、设置
packages/contracts/          请求 schema、命令注册、事件和错误
packages/backend/            业务 SQLite、迁移、文档保存
packages/agent-runtime/      LangGraph worker 与 SQLite checkpointer
packages/editor/             CodeMirror 适配
tests/                       unit、真实 Electron E2E
scripts/                     版本、许可、启动、通道清单和发布辅助
```

## 3. 通信与流式现状

### 改动前

- Electron 传输只有 `sapere:request` / `sapere:event` 两条物理通道。
- 逻辑命令使用点号：`document.read`、`agent.start`、`models.read`。
- 没有一份可枚举的命令清单；preload、Main、Backend、Agent 各自写字符串。
- 模型流只有 `delta/tool/done/cancelled/error`，没有统一的 `started`；两个页面各自订阅并手写清理。

### 本轮改动后

- 新增 `packages/contracts/commands.ts`，作为唯一命令清单。
- 命令统一使用 `域:动作`：`app:status`、`document:read`、`agent:start`、`models:save` 等。
- `pnpm channels` 可列出全部命令。
- preload 为每个 `window.sapere.request` 生成 UUID 请求信封；Main 解析 `requestEnvelopeSchema`。
- 模型流新增 `started`，统一为 `started → delta/tool → done/error/cancelled`。
- 新增 `apps/desktop/src/renderer/model-stream.ts`，集中按 run 身份过滤和判断终态；页面 effect 返回清理函数。

## 4. 样式现状

- 主样式集中在 `apps/desktop/src/renderer/style.css`，已有浅色、苔绿、深黑三套主题和大量语义变量。
- 本轮新增字号、圆角、阴影、动效和状态色令牌；CodeMirror 不再在组件里写裸字号。
- 仍有大量历史颜色、字号、圆角、阴影和间距直接写在 `style.css`。这不是“组件内写死”，但尚未完成全量令牌迁移。
- 主题通过 `data-theme` 属性和变量切换；Renderder 代码没有 `isDark ? ... : ...` 分支。

## 5. 八条硬约定对照

| # | 约定 | 状态 | 证据 / 缺口 |
| --- | --- | --- | --- |
| 1 | 界面不直接碰系统能力 | 已满足 | Renderer 未发现 `electron`、`fs`、`child_process`、`require`；preload 是唯一桥 |
| 2 | 通道名 = `域:动作` 且可枚举 | 已满足（当前命令） | `commands.ts`、`pnpm channels`、preload `window.sapere.commands` |
| 3 | 流式统一事件、可取消、清监听 | 部分满足 | 新增 `started` 和 `model-stream.ts`；Agent 多步工具流仍需在 S3 复用同一模板 |
| 4 | 每请求唯一 requestId，回调先比对 | 部分满足 | preload 请求信封已生成 UUID；模型流仍以 `runId` 作为流关联身份，后续统一为 `requestId` 字段 |
| 5 | 删除一律软删 | 部分满足 | 文档和修订已加 `created_at/updated_at/deleted_at` 字段；回收站 UI、恢复和彻底删除未实现 |
| 6 | 视觉只用令牌 | 部分满足 | 字号/状态/阴影/动效令牌已补充；`style.css` 仍有历史裸值，需按页面分批替换 |
| 7 | 业务状态色不被主题染色 | 部分满足 | 已加入 `--status-success/warning/danger/info`；状态类仍有一部分沿用旧变量，需专项替换 |
| 8 | 危险动作问人，密钥不回显 | 部分满足 | Key 只在 Main 解密、回复掩码；写文件/执行脚本/发消息工具尚未进入当前功能；fuses 未加固 |

## 6. 本轮已落地

| 改动 | 文件 |
| --- | --- |
| 命令注册与 `域:动作` 命名 | `packages/contracts/commands.ts`、`packages/contracts/index.ts` |
| 请求信封与命令暴露 | `apps/desktop/src/preload/index.ts`、`apps/desktop/src/main/index.ts` |
| Backend/Agent 命令迁移 | `packages/backend/worker.ts`、`packages/agent-runtime/worker.ts` |
| Renderer 命令迁移与流式清理 | `apps/desktop/src/renderer/App.tsx`、`ModelSettings.tsx`、`SpaceEditor.tsx`、`model-stream.ts` |
| 模型流 `started` 事件 | `apps/desktop/src/main/model-gateway.ts` |
| schema v3 软删字段 | `packages/backend/store.ts` |
| 视觉令牌基础 | `apps/desktop/src/renderer/style.css`、`packages/editor/Editor.tsx` |
| 通道枚举命令 | `package.json`、`scripts/list-channels.mts` |
| 回归测试 | `tests/unit/store.test.ts`、`tests/unit/gateway.test.ts`、`tests/e2e/desktop.spec.ts` |

## 7. 验证结果

- `pnpm typecheck`：通过。
- `pnpm test:unit`：17/17 通过。
- `pnpm channels`：列出 16 条当前命令。
- `pnpm format:check`：通过。
- `pnpm build`：通过。
- 真实 Electron E2E：5/5 通过，耗时 53.6 秒。首次直接启动 `node_modules/electron` 时复现宿主 Low 完整性标签导致的 `0x80000003`；加载 `scripts/project-shell.ps1`、使用项目 Medium 完整性 runtime 后通过。该环境差异不归因于本次命令迁移。

## 8. 下一步顺序

1. 跑 `pnpm test:e2e`，重点验证 preload 信封、命令迁移、窗口重启、文档保存和流式回答。
2. 给模型事件补 `requestId` 字段，所有流式页面先比对 `requestId`/run 身份再结算。
3. 新增 `trash` 表和文档软删/恢复命令，不把字段存在当成回收站已完成。
4. 按页面分批把 `style.css` 的历史裸值替换为令牌，先做状态色和设置页。
5. 把 Agent 多步工具事件接入同一 `started → chunk → done/error/cancelled` 收尾模板。
6. 最后再处理 fuses、签名、asar 完整性和更新链，避免把发布安全提前变成未验证的配置堆叠。

## 9. 明确不做

- 不复制参考程序的品牌、技能内容或具体实现。
- 不因为 BRIEF 提到 424 通道、86 路由就追求这些数字。
- 不把当前 S0 单文档功能写成 v0.2 工作台已完成。
- 不在没有干净 Windows、真实模型和真人 IME 证据时标记 S0 全通过。

## 10. 用户后续指示

2026-11-18：用户要求“不用继续，只记下来”。本轮审计记录到此为止；不再自动推进 P0/P1 后续改造，也不把本记录当作继续实现授权。若后续要恢复实现，先由用户明确指定范围。
