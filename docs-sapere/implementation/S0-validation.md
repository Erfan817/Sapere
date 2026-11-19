# S0 桌面骨架与真实验证记录

## 2026-11-19 S0 收口

| 验收项 | 当前结果 | 证据 |
| --- | --- | --- |
| S0-01 至 S0-04 | 开发版回归通过 | 锁定 Electron/Node，沙箱、进程重连、修订保存迁移、检查点恢复。检查点还能从 SQLite 找回旧线程，无需依赖原页面存储。 |
| S0-05 真人中文 IME | 用户确认通过 | 用户按清单测试微软拼音候选翻页和确认、保存后退出重开，以及组合输入时禁用接受修改。确认来自人工反馈，具体构建号未另行记录。 |
| S0-06 真实模型 | 待有效配置 | 2026-11-19 用现有环境调用固定算术题，真实服务返回 401。用户将通过应用配置有效服务。当前成功、工具和取消证据来自本地 HTTP 测试。 |
| S0-07 安装器 | 包与解包运行通过，独立安装待验收 | `0.1.0-alpha.3` 安装包、块图及 SHA-256 已生成。解包后二进制与 ASAR 与构建产物一致，启动实际程序验证保存、重开和检查点恢复。当前仅有本机 Windows，没有可用的独立验收机。 |
| S0 安全 | 当前桌面范围通过 | 生产页面使用 `sapere://app/index.html`。只允许构建资产，生产 CSP 禁止 Renderer 网络连接，IPC 校验固定主页面。8 个 fuse 已直接读取解包 EXE 验证。SQLite 工作区目录和已知文件拒绝重定向和硬链接，密钥隔离与字段脱敏通过现有测试。 |

本轮 `tsc --noEmit`、构建、21 项单元测试及 5 项默认沙箱 Electron 回归通过。加固包使用 Chromium 调试接口做本机测试，Main 的 Node 调试 fuse 保持关闭。型号、路径与测试报告见下方证据。

- Windows x64 安装包（本地归档）
- 安装包 SHA-256（本地归档）
- 解包核对（本地归档）
- Fuse 与解包启动报告（本地归档）
- 真实服务 401 记录（本地归档）

## 历史验证记录

日期：2026-11-17（Asia/Shanghai）。应用：`Sapere 0.1.0-alpha.0`；工作目录：`<项目目录>`。

**结论：桌面技术骨架、磁盘持久化/恢复和最小 NSIS 包已实现并实际运行；S0 尚未全部验收通过。** 默认启动失败现已定位到原可执行文件继承的 Low 完整性标签，并通过项目内 Medium 标签运行时副本解决；默认沙箱下开发态及独立打包副本各 4/4 回归通过，详见第 13 节。有效远端模型、真人中文 IME 与干净 Windows 安装仍待验证。以下通过结论均限定于实际执行条件，不以计划或夹具替代真实环境。

2026-11-18 更新：CODEX-BRIEF 审计已完成命令注册、`域:动作` IPC、请求信封、模型流 `started`、schema v3 软删字段和视觉令牌基础；对应变更与 5/5 桌面 E2E 证据见 [CODEX-BRIEF-AUDIT.md](CODEX-BRIEF-AUDIT.md)。S0 原有七项结论与未通过项不因本次改造自动改变。

2026-11-17 后续状态：三空间、统一设置与模型配置见 [界面体验更新](workspace-experience.md)。单元测试已增至 16/16；最新开发构建 4/4、重打后的打包态 4/4、最新 NSIS 解包 payload 4/4 桌面回归均通过，仍显式使用 no-sandbox。安装包已更新，下文第 4–6 节保留首轮历史记录，最新哈希和本轮默认启动排查见第 12 节。S0 的四项剩余验收未因此自动转为通过。

2026-11-19 更新：`0.1.0-alpha.2` Windows x64 NSIS 包包含新版桌面界面。安装包解出的 `Sapere.exe` 和 `app.asar` 与 `win-unpacked` 一致，解包后的程序在默认沙箱下通过 5 项桌面回归。安装器未执行，干净 Windows 安装和卸载仍待验收。安装包和 SHA-256 位于 `release/0.1.0-alpha.2/`。

## 1. 交付内容

- Electron Main / sandbox preload / React Renderer / Backend utilityProcess / Agent utilityProcess；Renderer 无 Node，IPC 输入白名单与长度校验，两个子进程不继承模型密钥。
- 黑白「启页」品牌、学习/工作/创作入口、可编辑的技术草稿、保存状态、运行与诊断页。学习和工作入口明确标记待建设，没有假业务成果。
- Backend 独占 `business.sqlite`：保存中文/emoji、修订事务、baseRevision 冲突检测、失败迁移回滚与未来 schema 拒写。
- Agent 独占 `agent-checkpoints.sqlite`：真实 LangGraph 中断、检查、跨 utilityProcess 和应用重启继续；不使用内存 saver。
- CodeMirror 选区候选、接受/拒绝、恢复前稿、内容变化后的过期提案保护、组合输入期间禁用应用、切页保留未保存输入。
- Main 的 LangChain / OpenAI-compatible 模型网关：固定算术工具题、流式事件、实际 add 工具返回、预算、取消、错误；真实外部认证失败与本地 HTTP 夹具分开记录。
- 固定版本与锁文件、2 篇 ADR、启动说明、人工验收清单、生产依赖清单和随包 notices、未签名 NSIS 测试包。

## 2. S0-01–S0-07 对照

| 任务 | 本轮结果 | 实际证据与剩余事项 |
| --- | --- | --- |
| S0-01 版本与 ADR | 通过，已锁定 | 开发 Node 24、Electron 内嵌 Node 24 / ABI 150；pnpm frozen 安装；ts-fsrs 在 Agent 实算；精确依赖与许可快照。Deep Agents 作为 S3 可选 profile，未启用 |
| S0-02 进程通信 | 当前设备通过 | 真实窗口中两个不同 PID；无 Renderer Node；子进程 secret 环境名为空；强杀 Backend/Agent 后错误可见、编辑保留、重连可用。第 13 节新增默认沙箱开发/打包回归，核对 Renderer OS 级 sandboxed=true |
| S0-03 LangGraph 落盘恢复 | 小样通过，沿用环境条件 | 自动化验证强杀 Agent、重建并读取同 checkpoint；关闭整个应用、重开再继续；完成节点未重复执行。用户另按建立中断、退出重开、检查并继续的流程确认显示“已从磁盘检查点继续完成”，见第 11 节。正式 run/effect/审批恢复属于 S3 |
| S0-04 SQLite 与迁移 | 替代方案小样通过，沿用环境条件 | better-sqlite3/V8 编译失败后采用 node:sqlite，见 ADR-001；开发态、打包态、NSIS 解包态均写入/重开；失败迁移保留旧数据，stale revision 拒写，FTS5 trigram 样例匹配。用户另确认通过 `start.cmd --no-sandbox` 保存、退出并重开后文字正常，见第 9 节。无需独立 native ABI 重建 |
| S0-05 中文编辑与修改 | 部分通过 | 中文填入、选区、接受/拒绝/恢复、过期提案、切页、组合事件保护通过；用户确认保存退出后重开文字正常，并确认手动候选的生成、拒绝保留原文、接受及恢复接受前内容均正常，见第 9–10 节。**具体中文输入法及组合输入专项仍未确认**；候选为手动输入，不冒充模型产物 |
| S0-06 模型协议 | 阻断，未通过 | 本地 HTTP 夹具的流式 tool-call、工具结果回传、取消、401 错误通过；实际已有远端 `/models` 与 `/chat/completions` / Main 网关均返回 401。真实服务成功/流式/工具/取消没有证据 |
| S0-07 安装包 | 部分通过 | NSIS 构建成功；实际包内 payload 提取后 E2E 通过，exe/asar 哈希与打包目录一致。**未进行干净 Windows 安装/卸载**；本机未提供 Sandbox/独立 VM；默认沙箱启动仍阻断 |

S0 退出门槛为 7 项全部通过或有经验证替代方案。当前不能宣称“S0 全通过”或开始把 S1–S9 写成已实现成果；当前阶段划分见 [项目规划 v2](../planning-v2/04-里程碑与工程交付.md)。

## 3. 设备与实际版本

- Windows 11 家庭版 中文版 x64，OS `10.0.26200`；AMD Ryzen 7 8845H，约 31.3 GiB 可见 RAM；平衡电源模式。
- 本轮窗口截屏像素比 1.5；截图用于布局检查，不声称已覆盖全部缩放/键盘/读屏矩阵。
- 开发 Node `v24.16.0`；pnpm `11.25.0`；Electron `45.3.2`；Main 与两个 utilityProcess 内嵌 Node `24.22.2`、ABI `150`、SQLite `3.53.4`。
- React `19.3.1`，TypeScript `7.0.2`，electron-vite `6.0.0`，Vite `8.3.8`，LangChain `1.6.6`，LangGraph `1.7.4`，checkpoint `1.2.2`，OpenAI adapter `1.8.4`，ts-fsrs `6.0.0`。
- 锁文件 SHA256：`e28a0041c418c1830f3b0311a55ad16ee10e55c994e75c424a2630eb9ec40fed`。完整直接包清单见本地 `.sapere/verification/versions.json`；生产依赖共 55 个唯一包/版本，许可台账随包附带。

## 4. 实际命令与结果

| 命令 / 条件 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过；没有关闭包发布时间策略或强制 overrides |
| `pnpm typecheck` | 通过，strict TypeScript |
| `pnpm format:check` | 通过 |
| `pnpm test:unit` | **7/7 通过**：SQLite 迁移/保存/冲突，IPC 越界参数，Graph 落盘恢复，HTTP 流式工具/取消/401 |
| `pnpm build` | 通过；Renderer 约 1.73 MB 未压缩 bundle，尚未做性能基准 |
| `pnpm test:e2e` 默认环境 | 启动失败，`0x80000003`，不计通过 |
| `SAPERE_TEST_NO_SANDBOX=1` + E2E | 开发构建真实 Electron **1/1 通过**；最终一轮约 8.4 秒，是测试执行时间而非冷启动指标 |
| 上述条件 + `SAPERE_TEST_EXECUTABLE=release/win-unpacked/Sapere.exe` | 打包态真实 Electron **1/1 通过**；系统 PATH 精简到 Windows，未依赖开发 Node 运行子进程 |
| 上述条件 + NSIS 解包 payload 的 Sapere.exe | 安装包实际 payload 真实 Electron **1/1 通过**；**不等同于执行安装器/干净机安装** |
| `pnpm dev --noSandbox` | 已实际启动 Vite 与真实 Electron、两个磁盘库；检查后停止，无遗留测试进程 |
| `pnpm model:probe` | 按预期失败退出 1，`MODEL_AUTH_FAILED` / HTTP 401；没有伪标成功 |
| `pnpm notices` / `pnpm evidence:versions` | 通过；55 个生产依赖均有许可正文或有来源的补充文本 |
| `pnpm dist` | 通过，生成 NSIS；未签名、未发布 |

E2E 操作：编辑并保存中文 → 拒绝/接受/恢复修改 → compositionstart/end 保护 → 过期提案拒写与切页保留 → 强杀 Backend、失败可见、重连保存 → 建立 Graph interrupt → 强杀 Agent → 同 checkpoint 重开 → 完整退出/重启 → 同文档/thread/checkpoint → resume 完成。报告 `errors=[]`。本地 HTTP 夹具是实际 HTTP/SSE transport 测试，不是远端模型可用性证据。

## 5. 项目内证据

以下均为忽略目录中的本机证据，不自动公开上传：

| 路径（相对项目根） | 内容 |
| --- | --- |
| `.sapere/verification/desktop-oo4JBN/report.json` | 最终开发构建 E2E，包含版本、PID、checkpoint、保存修订、环境降级标记 |
| `.sapere/verification/desktop-Nbxc5P/report.json` | 最终打包态 E2E，`packaged=true`，两个 SQLite 进程正常 |
| `.sapere/verification/desktop-Nbxc5P/editor.png` / `runtime.png` | 打包态真实页面截图 |
| `.sapere/verification/desktop-KATo3N/report.json` | 最终 NSIS 实际 payload E2E |
| `.sapere/verification/nsis-payload/` | 直接从安装包提取的执行文件与完整依赖；仅验 payload，未运行安装器 |
| `.sapere/verification/unit-results.txt` / `build-results.txt` | 最终逻辑/集成与构建输出 |
| `.sapere/verification/desktop-final-results.txt` / `packaged-final-results.txt` / `nsis-payload-final-results.txt` | 三条真实桌面 E2E 输出 |
| `.sapere/verification/model/remote-auth.json` / `remote-gateway.json` | 远端 401 与 Main 网关失败事件；不含 URL、认证头或密钥 |
| `.sapere/verification/electron-triage/` | 默认启动错误与 no-sandbox 对照 |
| `.sapere/verification/versions.json` / `dependency-tree.json` | 实际依赖、版本与锁哈希；含本机绝对路径，仅留本地 |

所有稿件/测试素材均为本轮人工构造短句，没有真实用户文档；没有把凭据写入工作区、checkpoint 或日志。缓存、测试数据库、截图、解包产物位于项目 `.sapere/`；初次 pnpm 尝试曾使用已有机器级 store，后续已显式改为项目内 store，未清理机器原有共享缓存。

## 6. 安装产物

- `release/Sapere-0.1.0-alpha.0-setup-x64.exe`，**134,262,655 bytes**（约 128.04 MiB）。
- SHA256：`75FFB4E75170856BE8B0A1632BE6ABB6FA061A5C6C5F25394C302C59C24C6DA2`。
- `Get-AuthenticodeSignature`：`NotSigned`。App ID `app.sapere.desktop`；productName / exe metadata 为 Sapere，品牌 ICO 已应用。
- NSIS 解包的 `Sapere.exe` SHA256 与 win-unpacked 均为 `FF79E6E6ADAD32E267A6CB9FD242A561C74CF398323150AA7A4940EBC3325369`；`resources/app.asar` 均为 `AF883D4855FB793D3E9723B4F321809501FA03A84CB611697A1485D4DA236B44`。
- 安装内容包含 Electron/Chromium notices、应用第三方 notices；不依赖开发机 node_modules 的链接或外部 Node/Python。该事实由包目录与 payload 测试支持，不扩展为未执行的干净机结论。
- 默认普通用户安装，工作区由首次选择，不写正文到程序目录；卸载保留内容配置已设，但实际卸载行为仍须独立环境验收。

## 7. 剩余阻断与下一步

1. **默认沙箱启动**：45.3.2、44.11.3、43.8.10 均在进入应用前 `0x80000003`；最小 `--version` 复现，关 GPU 无效，显式 no-sandbox 可运行，根因尚未确定。没有修改系统安全配置或把 no-sandbox 设成应用默认。
2. **有效模型服务**：已有当前进程凭据返回 401；需要可认证且支持流式/tool calling 的服务，补真实成功、工具、取消和错误验证。不要将 Key 发到聊天或写入仓库，在 shell 配置后运行 probe。
3. **真人 IME**：自动化组合事件不能等价于微软拼音候选链；按 [人工清单](S0-manual-checklist.md)完成。
4. **干净 Windows**：独立普通用户环境执行安装/启动/保存/重开/卸载；当前机器没有可用隔离 Windows 环境，未进行该验收。

先完成上述 S0 退出验证再扩 S1。260–405 小时是历史规划估算；本轮没有可靠的人工作时或学习速度基线，不用自动化执行时长重新推算整个项目工期。

本轮所有更改仍为本地未提交；没有 Git 提交、推送、签名、公开发布或更改用户原有资料的归属说明。

## 8. 普通 PowerShell 启动入口补充

2026-11-17 用户反馈普通 PowerShell 无法识别 `pnpm`。现场确认该命令来自 Codex 自带 runtime 路径；此前启动说明对普通 shell 的可用性假设不成立。

已添加项目根 `start.cmd`，直接调用项目内 Electron 与现有 `out/` 构建，不要求 Node/pnpm 在用户 PATH，也不修改全局 PATH。入口以自身文件位置确定项目目录，透传显式参数，默认不关闭沙箱；README 已补充普通用户启动命令。

实际验证：从 `scripts/` 作为当前目录运行启动器，子环境 PATH 仅保留 Windows System32，无 Node/pnpm；显式 `--no-sandbox` 下真实窗口可见，Backend/Agent 均为 ready，关闭后退出码 0。证据：`.sapere/verification/launcher-9fTCTv/report.json`。未修改应用源码或重打安装包，原安装包校验和继续有效；默认沙箱启动与其余 S0 待验项状态不变。

## 9. 用户人工确认：带参数启动与保存重开

日期：2026-11-17。证据来源：本次对话中用户的实际操作反馈，不是自动化重跑或新增截图。用户明确在 `<项目目录>` 使用 `.\start.cmd --no-sandbox`，并反馈：“这个 保存后退出文字正常”。结合上一轮要求的保存、退出、重开检查，记录为带参数启动下的基本文字持久化人工确认。

- 启动方式：普通 PowerShell，`.\start.cmd --no-sandbox`，用户报告运行正常。
- 验证流程：保存稿件 → 退出 → 重开检查文字；用户确认文字正常。
- 通过范围：当前本机、现有构建、显式 no-sandbox 条件下的启动与基本保存重开。
- 未覆盖：不带参数启动、具体中文输入法名称、候选翻页/组合输入与修改提案同时操作、独立 Windows 安装卸载、有效远端模型服务。未将这些项目标为通过。

本次只更新人工验证记录，不改应用或安装包；原自动化证据、安装包校验和和 S0 尚未全部通过的结论保持有效。

## 10. 用户人工确认：修改提案接受、拒绝与恢复

日期：2026-11-17。用户按上一轮给出的三步修改审阅操作后反馈：“三步正常”。运行条件沿用第 9 节中用户已确认的 `.\start.cmd --no-sandbox`；本项未收到更换启动方式的反馈。

- 选中正文、填写候选修改并生成提案，操作正常。
- 拒绝提案后原文保留，操作正常。
- 再次生成提案、接受修改、恢复接受前内容，操作正常。

证据为本次对话中的用户操作反馈，没有新增截图或自动化重跑。该记录补充手动候选审阅交互的人工验证，不代表真实模型生成、输入法组合期间操作、过期提案或接受后继续写作的冲突场景均已获人工确认。S0-05 保持部分通过，其余 S0 阻断不变。本次只改验证文档，未改应用或安装包。

## 11. 用户人工确认：跨应用重启后继续检查点任务

日期：2026-11-17。用户按上一轮给出的操作流程后反馈：“显示已从磁盘检查点继续完成”。操作要求为：在运行与诊断中建立中断并等待审阅 → 关闭应用 → 使用 `.\start.cmd --no-sandbox` 重开 → 检查任务 → 继续任务。

该反馈确认当前设备、现有构建、显式 no-sandbox 条件下，跨应用重启后检查点任务可通过界面继续至完成。证据来源为本次对话的用户操作反馈；未新增截图、读取用户数据库或重跑自动化。用户没有另行提供 thread/checkpoint ID 对照或人工强杀结果，这些不作为本项新增人工证据。

S0-03 在现有运行条件下的小样通过结论得到人工补充；默认沙箱启动、真人 IME 专项、真实模型服务和干净 Windows 安装仍待验证。本次只更新记录，未修改应用、安装包或校验和。

## 12. 默认启动复查与最新版安装包

日期：2026-11-17。用户授权逐项解决 S0 待验项、可派 DSH，并准备提供 DeepSeek API；尚未收到实际可用 Key，也未调用真实供应商。

### 默认沙箱启动排查

- 当前官方 Electron 45.3.2 的 `--version` 在应用代码执行前复现 `2147483651 / 0x80000003`；`--no-sandbox --version` 返回 0 和版本号。关闭 GPU、清理继承环境、关闭 crash reporter、从缓存官方 zip 重新解压 runtime 均未改变默认失败结果。
- 当前进程处于 Job Object，Medium integrity，未发现 AppContainer 标记。移除宿主标记环境变量仍失败，不能断言是 Codex 进程限制导致。
- 本机有 `GameViewer Virtual Display Adapter` 和 `MuMu Virtual Display Adapter`。与 Electron 上游 [#54552](https://github.com/electron/electron/issues/54552) 的 Windows 11 26200 / IDD 环境报告相似；目录权限另与 [#51761](https://github.com/electron/electron/issues/51761) 有部分相似信号。均为待验证假设，未认定根因。
- 未更改系统驱动、ACL、注册表、系统策略或把 no-sandbox 设置为默认。还需要用户在从桌面打开的普通 PowerShell 中，运行项目 `start.cmd`（不带参数）完成宿主之外的对照；必要时再决定目录权限或虚拟显示驱动的隔离实验。
- DSH 独立限时报告：`.sapere/verification/sandbox-followup/dsh-review.md`；本地原始对照：该目录下 `local/versions.json`、`environment-cases.json`、`pristine.json`。

### 新版安装包与回归

- `pnpm notices` 通过：55 个生产包，未缺少根许可证正文。`pnpm dist` 通过。
- 旧安装包及校验文件先备份至 `.sapere/verification/previous-release-s0/`。
- 最新安装包 `release/Sapere-0.1.0-alpha.0-setup-x64.exe`：134,305,663 bytes；SHA256 `8e77a66ee9c557707471034349d74ab3890d08b85459952d8808fdac8f6a6900`；未签名、未发布。
- 最新打包 `Sapere.exe` SHA256 `72ff75833492e8e60ba65590cc81fdde0c0c2ca6d09468fdd37e8e3e40e034cd`；`resources/app.asar` SHA256 `c0319db73fe9dab1a931b88fd547ad29ca95d8159ea6e633f47719ed569fe4a8`。与 NSIS 实际解包的两个文件均一致。
- 打包态最新四条 E2E 全通过，22.4 秒；报告 `.sapere/verification/packaged-ui-results.json`。
- NSIS 实际 payload 最新四条 E2E 全通过，19.0 秒；报告 `.sapere/verification/nsis-ui-results.json`，解包目录 `.sapere/verification/nsis-ui-refresh/`。
- 回归使用 `SAPERE_TEST_NO_SANDBOX=1` 和精简系统 PATH。仅证明实际包内容可运行，不替代默认沙箱启动、安装器安装/卸载或干净 Windows 验收。

## 13. Low 完整性标签根因与默认启动修复

日期：2026-11-17。用户从独立普通 PowerShell 执行原 `start.cmd` 同样报告 `-2147483645`，排除仅由 Codex/DSH 子进程造成的假设。以下新增证据取代第 7/12 节“根因尚未确定”的历史判断。

- Win32 调试器在原 Electron 45.3.2 `--version` 捕获 `electron.exe+0x3474faa` 断点；上游对应 Chromium 156.0.8078.100 的 Sandbox 初始化调用 `CreateAlternateDesktop(kAlternateWinstation)` 后 CHECK 失败。
- 原调用返回 `12 / SBOX_ERROR_CANNOT_CREATE_WINSTATION`，Windows `GetLastError=5 / AccessDenied`。两次 `CreateWindowStationW` 权限组合均失败，尚未进入 GPU 初始化，因此不再把此前 IDD 报告当作本故障直接根因。
- `icacls` 显示项目原 `electron.exe`、打包 `Sapere.exe` 均继承 Low Mandatory Level；在初始调试断点和失败调用现场，进程 TokenIntegrityLevel 都是 `S-1-16-4096`（Low）。同一执行环境的 Python 是 Medium，API 对照可创建临时窗口站。
- 新建诊断目录时显式赋予 `S:(ML;OICI;NW;;;ME)`，保留普通 DACL 继承，以字节复制/解压生成同版本 runtime；Medium 标签的 Electron `--version` 返回 0，且默认应用四条 E2E 通过。未改原 runtime、驱动、注册表或项目/系统 DACL。曾尝试对诊断副本执行 `icacls /setintegritylevel M` 被拒绝、未生效，随后改为创建独立目录。
- 正式项目脚本 `scripts/prepare-runtime.ps1` 创建 `.sapere/runtime/electron`，按文件复制后核对 SHA256，源版本变化时刷新，并以默认 `--version` 检查可用性。`start.cmd` 自动调用该脚本，清除 `ELECTRON_RUN_AS_NODE` / `ELECTRON_DISABLE_SANDBOX` 后启动；`scripts/project-shell.ps1` 设置项目级 `ELECTRON_OVERRIDE_DIST_PATH`，Windows postinstall 同样准备副本。所有产物与临时文件均留在项目内。
- 默认开发态回归：4/4，通过 25.0 秒；`.sapere/verification/default-sandbox-ui-results.json`。测试显式核对不存在 `no-sandbox` 参数或禁用环境变量，Renderer 对应进程 `app.getAppMetrics().sandboxed=true`。
- 原打包目录字节内容复制到同样 Medium 继承的隔离目录，不改应用内容；默认打包态回归 4/4，通过 19.9 秒；`.sapere/verification/default-sandbox-packaged-results.json`。这不等同于原 Low 标记的 release 目录已修复，也不替代安装器/干净机验证。
- 实际 `start.cmd` 验证：从 `scripts/` 目录、只带 Windows 系统 PATH（无 Node/pnpm），不带 no-sandbox，窗口、Backend/Agent ready、退出码 0；`.sapere/verification/launcher-sandbox-z5CCGe/report.json`。用户手动重新运行新启动器仍待反馈。
- 底层调试与 A/B 证据：`.sapere/verification/sandbox-followup/local/`。无需给 Electron 打补丁或弱化桌面/窗口站隔离；原二进制字节不变。

官方机制与源码依据：[Microsoft Mandatory Integrity Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)、[Chromium Sandbox 初始化](https://raw.githubusercontent.com/chromium/chromium/156.0.8078.100/sandbox/policy/sandbox.cc)、[创建备用窗口站](https://raw.githubusercontent.com/chromium/chromium/156.0.8078.100/sandbox/win/src/window.cc)。

S0 当前仍待：真实 DeepSeek 成功/流式/工具/取消验证（用户表示将提供 API，但未收到 Key）、真人 IME、普通用户干净 Windows 安装/卸载。新版 NSIS 内容不因本次开发启动器修复自动变化；安装包部署到何种完整性目录仍需实际安装验收。
