# S0 第三方依赖与资产台账

日期：2026-11-17。精确安装版本、引擎与许可由 `pnpm evidence:versions` 生成在项目内忽略目录；完整分发依赖见 [production-dependencies.json](production-dependencies.json)。依赖升级由项目维护者负责；每次升级必须复验恢复、协议与打包。

| 组件 | 固定版本 | 用途 | 包清单许可 |
| --- | --- | --- | --- |
| Electron | 45.3.2 | 窗口、Main、preload、utilityProcess、内嵌 Node/SQLite | MIT；Chromium 子许可随发行物附带 |
| electron-vite / Vite | 6.0.0 / 8.3.8 | 工程构建与开发服务器 | MIT |
| electron-builder | 26.18.0 | Windows NSIS 测试包 | MIT |
| React / react-dom | 19.3.1 | Renderer 界面 | MIT |
| TypeScript | 7.0.2 | strict 类型检查 | Apache-2.0 |
| CodeMirror / state / view / markdown | 6.0.2 / 6.7.6 / 6.43.15 / 6.5.2 | 中文编辑与选区修改 | MIT |
| LangChain / core | 1.6.6 / 1.4.1 | 模型工具循环、预算 middleware、消息与 schema | MIT |
| LangGraph / checkpoint / SDK | 1.7.4 / 1.2.2 / 1.16.0 | 中断、恢复、检查点契约；SDK 是解算链中的固定依赖 | MIT |
| @langchain/openai | 1.8.4 | Main 模型 HTTP/stream adapter | MIT |
| ts-fsrs | 6.0.0 | Node >=24 下卡片调度兼容小样 | MIT |
| Zod | 4.6.7 | IPC/工具输入校验 | MIT |
| Playwright | 1.65.1 | 真实 Electron E2E | Apache-2.0 |
| tsx / Prettier | 4.23.15 / 3.10.1 | Node 测试执行与格式检查 | MIT |

生产依赖共 55 个唯一包/版本，`pnpm notices` 从实际安装树收集其许可正文及来源，生成 [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)，由 electron-builder 复制到安装资源。Electron 自带 `LICENSE.electron.txt` / `LICENSES.chromium.html` 保留。`@cfworker/json-schema` 与 `js-tiktoken` 的 npm tarball 没有根级许可正文，已从各自源码仓库取回根许可，来源与日期见 [licenses/sources.json](licenses/sources.json)；不伪称发布包自带。

品牌复用项目现有黑白「启页」SVG/PNG/ICO，不重画、不加载远程字体；Noto Sans SC 字形已转路径，其 OFL 保留在品牌目录并并入 notices。界面使用系统字体，无外部字体下载。品牌历史接入文档属于旧代码记录，不作为本轮通过依据。

本应用源码当前为 `private: true` / `UNLICENSED`，这是未决定对外源代码授权的状态，不影响第三方许可义务。本轮未公开分发、签名、提交或推送。Deep Agents、PDF/CSV/Office 等未用组件未添加，以后选用时单独登记。
