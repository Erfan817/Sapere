# ADR-001：S0 运行时与 SQLite 替代路径

日期：2026-11-17。状态：已用于技术骨架；S0 退出仍有阻断，见验证记录。

## 现场与版本

开发 Node v24.16.0、pnpm 11.25.0；固定 Electron 45.3.2，实际内嵌 Node 24.22.2、ABI 150、SQLite 3.53.4。React 19.3.1、TypeScript 7.0.2、electron-vite 6.0.0 / Vite 8.3.8、LangChain 1.6.6、LangGraph 1.7.4 / checkpoint 1.2.2、OpenAI adapter 1.8.4、ts-fsrs 6.0.0 与 CodeMirror 6 均锁定在 package.json / pnpm-lock.yaml。

pnpm 的包最小发布时间策略拒绝了当日发布的 Graph 1.7.5、checkpoint 1.2.3、SDK 1.17.0，以及刚过近一天的 Electron 45.3.3。重新选择较早的精确版本，保留策略，无强制 overrides；被拒的初版锁文件只留本地缓存。

## 原生驱动失败与决定

最初尝试 `better-sqlite3@12.10.0` + `@langchain/langgraph-checkpoint-sqlite@1.1.1` + Electron 45.3.3，electron-builder 重建出现 `GetPrototypeV2`、`HolderV2`、`External::Value` 等 V8 接口编译错误。该失败说明规划中的 ABI 风险真实存在；开发 Node 预编译模块安装成功不能代表 Electron 可用。

决定使用 Electron 内嵌 Node 的 `node:sqlite`，无需额外 `.node` 或 ABI 重建。业务库使用 DatabaseSync，放在 Backend；Agent 的独立磁盘 saver 继承官方 `BaseCheckpointSaver`，由项目自有适配器实现 serialization、tuple、pending writes、path 排序、list、delete 和事务。没有覆盖官方 saver 的驱动依赖，没有把 MemorySaver 当成持久化。

此为明确替代方案：S0-04 的“额外原生模块 ABI 重建”改为“随 Electron 分发的 SQLite 在开发/打包态均可用”。代价是自行维护 saver、受 Node SQLite API 稳定性约束。当前仅支持 checkpoint v4 与 `sapere-s0-v1` 图；升级需重验，不能宣称完整通用 saver 或历史版本迁移兼容。

## 证据与限制

- 真实磁盘数据库、FTS5 trigram 中文短句查询、失败迁移事务回滚、修订冲突、关闭重开通过自动化。
- 真实 Electron utilityProcess 的业务/Agent Node 与 SQLite 版本已读回，子进程无 secret 名称环境变量。
- Agent 被强杀并重建、整个应用关闭重启后读取同 checkpoint、恢复完成通过；不修改业务库，不借此声称副作用恰好一次。
- `ts-fsrs@6` 的 Node >=24 条件由开发与 utilityProcess 满足，实际创建卡片并计算下次时间；完整评分事务在 S4。
- Deep Agents 未启用或安装；S3 才比较复杂 profile，避免 S0 增加未用的 provider peer 链。

## 沙箱环境阻断

当前设备在启动应用代码前，Electron 45.3.2、44.11.3、43.8.10 默认模式均返回 `0x80000003`；最小 `--version` 也复现，`--disable-gpu` 无效，显式 `--no-sandbox` 可运行。原因尚未确认，不归因于显卡或 Windows 版本。

未改变全局系统设置或应用默认沙箱。当前 E2E 与打包态结果明确标记 `testSandboxDisabled=true`。该结果可证明真实 UI / IPC / 数据 / 恢复链，但不能证明默认安全启动通过。后续需在普通用户交互 shell、独立 Windows 环境复验并定位宿主限制。

## 官方依据

- Electron 版本实值：`https://releases.electronjs.org/releases.json`。
- Electron utilityProcess / 原生 ABI / security：`https://www.electronjs.org/docs/latest/api/utility-process`，`https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules`，`https://www.electronjs.org/docs/latest/tutorial/security`。
- Node SQLite API：`https://nodejs.org/api/sqlite.html`。
- LangGraph checkpoint 契约：安装版本的 `@langchain/langgraph-checkpoint/dist/base.d.ts`、`types.d.ts`、`serde/`；官方源项目 `https://github.com/langchain-ai/langgraphjs`。
- 固定包元数据与许可从 npm 官方 registry 核对；实际快照由 `pnpm evidence:versions` 生成。
