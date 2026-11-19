# Sapere Agent 架构与技术决策

> **已被 v2 取代（2026-11-18）：** 当前 Chat/Agent 分层、工具、审批、恢复和扩展决策以 [Agent 架构 v2](../planning-v2/02-Agent架构与技术决策.md) 为准；ADR-001/002 的已验证技术事实继续有效。

> 版本：v1.0 规划稿。日期：2026-11-16。作者：Monday。  
> 范围：Windows 桌面端、TypeScript、Electron、本地业务数据；学习、工作、创作共用执行基础，均可独立使用。  
> 状态：本轮只读取官方文档、源码与 npm 元数据，未安装、构建或运行框架；下面区分已核对事实、拟采用设计与待验证项。  
> 2026-11-17 实施补注：此处为开工前快照；现已使用固定 LangGraph 1.7.4 + 自有 node:sqlite saver 验证磁盘恢复，官方 better-sqlite3 saver 因 V8 兼容失败未采用。见 [S0 验证记录](../implementation/S0-validation.md)及 [ADR-001](../../docs/adr/ADR-001-S0-runtime-and-sqlite.md)。
> 配套：产品范围见 [01](01-产品范围与验收.md)，进程和数据细节见 [03](03-桌面架构与数据设计.md)，阶段定义与交付见 [04](04-里程碑与工程交付.md)。

## 1. LangGraph、LangChain、Deep Agents 的关系

用户截图中的 Runtime / Framework / Harness 可以帮助理解职责，但不是必须逐层独立调用的三套 Agent，也不是版本选择规范。

| 项目 | 官方定位与本轮核对事实 | Sapere 中的拟定职责 |
| --- | --- | --- |
| LangGraph JS | 有状态、长任务的低层编排框架和运行时；提供图状态、流式事件、checkpoint 与 interrupt；不要求必须使用 LangChain | 为会话与任务提供状态执行、暂停和恢复；需要明确步骤时自定义图 |
| LangChain JS | 模型、工具、消息及 middleware 的框架；`createAgent` 构建基于 LangGraph 的 Agent 循环，官方当前也将其称为可配置 harness | v0.1 默认工具调用循环、模型适配、结构化输出与审批 middleware |
| Deep Agents JS | 构建在 LangChain/LangGraph 之上的 harness；包含规划、虚拟文件系统、上下文管理、子 Agent、Skills 等组合 | 在验证通过后，用于资料研究、分阶段长任务等受控 profile；不是每次问答的固定前置层 |
| Sapere 业务层 | 不是上述框架自带的课程、作品或办公系统 | 拥有项目、资料、作答、作品版本、任务授权、产物和副作用记录 |

JavaScript API 名为 `createAgent`、`createDeepAgent`。官方跨语言说明有时使用 `create_agent` 或 `interrupt_on`；实现应以锁定版本的 TypeScript 类型与测试为准。

**采用建议：** 默认 profile 使用 LangChain `createAgent` 和同一 LangGraph 持久化链；复杂 profile 可以直接使用 `createDeepAgent` 返回的 compiled graph。二者是不同配置入口，不在一次任务里机械套两层自主循环。

## 2. 已核对包与版本快照

下表来自 2026-11-16 npm `latest` 和官方清单，供 S0 选型；不是已经安装的依赖，更不是要求无条件追最新版。

| 包 | 本轮快照 | 引擎 / 关键依赖范围 | 决策 |
| --- | --- | --- | --- |
| `langchain` | `1.6.6` | Node `>=20`；peer core `^1.4.1`；依赖 LangGraph `^1.6.1` | 主 Agent 框架候选 |
| `@langchain/core` | `1.4.1` | Node `>=20` | 所有 provider、工具和图共享同一兼容版本 |
| `@langchain/langgraph` | `1.7.4` | Node `>=18`；peer core `^1.3.4`；checkpoint `^1.2.2` | 编排与执行基础 |
| `@langchain/langgraph-checkpoint` | `1.2.2` | Node `>=18`；peer core `^1.1.48` | checkpoint 协议与类型 |
| `@langchain/langgraph-checkpoint-sqlite` | `1.1.0` | Node `>=18`；`better-sqlite3 ^12.10.0`；peer checkpoint `^1.2.0`、core `^1.1.44` | 本地文件 checkpoint 的首个验证对象 |
| `deepagents` | `1.16.5` | peer langchain `^1.6.4`、core `^1.3.7`、graph `^1.6.1`、checkpoint `^1.1.5` | S3 验证后决定受控 profile 的采用范围 |
| `@langchain/openai` | `1.8.4` | Node `>=22`；peer core `^1.4.0` | provider 候选，必须满足 Electron 内置 Node 版本 |
| `@langchain/mcp-adapters` | `2.0.3` | Node `>=20.10`；core `^1.2.6`、graph `^1.4.18`；依赖 MCP client/core `^2.4.0` | 远期连接器评估；不要照搬旧 1.x API |
| `@modelcontextprotocol/sdk` | `1.32.2` | Node `>=18`；与上述分包式 2.x client/core 不同 | 仅在确需兼容旧接口时选定，不能随意混装 |

`deepagents` 还声明 `langsmith`、`@langchain/openai`、`@langchain/anthropic`、`@langchain/langgraph-sdk` 的 peer 范围。Provider 可选性、实际包管理器解算与重复依赖，要在 S0 检查；不能只看表内几个范围相交就宣布集成成功。

SQLite saver 当前依赖 `better-sqlite3 ^12.10.0`；本轮其他模块可能查到 `better-sqlite3 13.x`，不能盲目统一为 latest 或强制 override。业务驱动优先选能共同满足的版本，否则明确维护两套 native 二进制并分别重建。复习模块若选 `ts-fsrs 6.0.0`，还要求 Node `>=24`；开发机 Node、Electron 内置 Node 与 utilityProcess 实际版本应共同检查。

这些被核对的 npm 包清单标为 MIT；实际分发仍记录固定版本、第三方依赖及其 notices。LangSmith 托管、Managed Deep Agents、外部模型与 SaaS 是另行选择的服务，不作为本地运行的必选条件。

## 3. 首版执行边界与技术决策

| 决策 ID | 拟定方案 | 原因与待验证项 |
| --- | --- | --- |
| ADR-A01 | TypeScript 一套主链，默认 LangChain + LangGraph | 减少双语言和多编排状态；保留专业 Python/媒体工具的进程适配 |
| ADR-A02 | Agent 放在独立 Node `utilityProcess` | 模型流、工具循环、checkpoint 与 UI 线程分开；验证退出、崩溃和消息背压 |
| ADR-A03 | Backend `utilityProcess` 唯一写 `business.sqlite` | DomainServices 与事务集中；跨 IPC 发送完整领域命令，不传任意 SQL |
| ADR-A04 | Main 管 Supervisor、SecretVault、ModelGateway、ToolBroker 和窄 IPC | Main 不承载重计算与业务事务；模型密钥不进入 renderer、prompt、checkpoint |
| ADR-A05 | Agent 单独持有 `agent-checkpoints.sqlite` | 执行快照与业务事实分离；各数据库只有明确的写入所有者 |
| ADR-A06 | Deep Agents 作为可选 profile | 长任务能复用 harness；验证自定义 backend、工具限制和恢复后再纳入 |
| ADR-A07 | v0.1 不开放任意 shell、任意 Node 脚本和第三方执行插件 | 先用注册工具完成 CSV、资料与文档任务；此为阶段边界，长期能力库继续保留 |
| ADR-A08 | Mastra、外部 Agent 等保留适配候选 | 不在首版同时维护两套主执行状态；只有实际任务证明收益时增加 |

AgentWorker 通过 Main 的工具代理请求 Backend 领域命令。解析和 CSV 等重任务由按需 worker 完成，结果由 Backend 校验和提交；Agent 不直接打开业务库、不接受自由项目路径。

Main ModelGateway 异步处理 provider 请求和流，Agent 通过代理 model client 使用它。采用现成 transport hook 或自定义 LangChain model adapter，以 S0 小样比较；无证据前不假定所有 provider 都能原样代理。

Gateway 只接受注册 provider/model、run scope 和规范化参数；不接受模型给出的任意 URL、认证头或系统配置。工具网络请求与模型调用使用不同策略。

**隔离限制：** `utilityProcess` 是拥有 Node 能力的进程，不是操作系统级不可信代码沙箱；独立进程和不转交密钥只能降低误用范围，不能防御已取得 Node 执行权的恶意插件。v0.1 只加载随应用发布的可信代码，实际资源访问靠 broker 和受限工具完成。

启动子进程时显式整理环境变量；Electron 默认继承 `process.env`，不能把模型 Key、诊断凭据或不必要配置随进程继承出去。应用内部消息不通过额外 HTTP 监听端口传输。

## 4. 运行身份与状态模型

| 标识 | 含义 | 生命周期 |
| --- | --- | --- |
| `projectId` | 本次资料和业务对象所属项目 | 与业务数据共同持久化 |
| `threadId` | 图的会话状态与 checkpoint 范围 | 可承载多个用户请求，不能等同项目权限 |
| `runId` | 一次用户目标、上下文和预算 | 新用户请求建立新 run；结束后保留记录 |
| `executionAttemptId` | 一次进程中的实际执行尝试 | 同 run 恢复可产生新 attempt，费用累计 |
| `checkpointId` | LangGraph 某次执行状态快照 | 与 graph/profile 版本一起记录 |
| `effectId` / `approvalId` | 领域副作用 / 用户审批身份 | Backend 持有，不能仅放在模型历史里 |

建议 run 状态：`queued → running → succeeded/failed/cancelled`。过程中允许 `waiting_approval`、`waiting_input`、`cancelling`；进程意外退出进入 `interrupted`，不能显示完成。详细迁移由 Backend 领域命令实施。

每个 run 保存：任务类型、用户目标、引用清单/版本、允许能力、profile/graph/schema 版本、模型配置标识、预算、创建时间与结果。运行记录引用密钥槽位，不存明文密钥。

事件采用递增序号，包含 run/attempt、事件类型、发生时间和可展示摘要；renderer 重连后从已知序号接续。消息 token 可合并发送，关键状态、工具结果、审批和产物事件要持久化后可重建。

v0.1 同一 thread 只允许一个活动 run。旧 run 等待审批或中断时，新请求排队、明确终止后替换或建立新 thread 分支；不能直接并发写同一 checkpoint 链。审批恢复同时核对 thread 当前占用的 run、interrupt 和 checkpoint，防止旧回复进入新任务。

流式答案是临时输出；最终回答、工具真实结果和业务产物分别保存。模型说“已经写好”不能触发成功，成功由工具返回及产物提交决定。

## 5. 持久化、恢复与副作用

### 5.1 两种存储分别负责什么

- `business.sqlite`：项目、资料、作品修订、作答、复习、run 元数据、审批与效果账本，由 Backend 管理。
- `agent-checkpoints.sqlite`：图状态、消息、中断及运行恢复数据，由 AgentWorker 的持久 saver 管理。
- 项目文件：正文、资料和产物；业务层负责稳定 ID、修订和文件提交记录。
- 长期偏好：先由 Backend 管理可查看、可纠正的事实与偏好，再通过工具或只读适配提供给 Agent，不让任意图 store 自动改业务状态。

本轮确认 JavaScript `SqliteSaver` 包确实存在；官方 README 的 `:memory:` 示例仍只在内存中，项目必须传真实文件。官方将 SQLite 列作本地开发存储，Sapere 桌面生产适用性仍需验证。

S0 验证 native ABI、Electron 内置 Node、ASAR/native 文件打包、utilityProcess 加载、WAL/锁、异常退出、文件迁移与关闭顺序。现成 saver 不合适时，才比较实现 `BaseCheckpointSaver` 或独立存储适配，避免提前重写。

checkpoint 是可恢复执行资料，不能作为学习成绩、正式稿或工作交付的真源。普通项目包只备份该项目业务记录和文件，排除 checkpoint。应用升级或整工作区恢复快照另由 Supervisor 暂停新 run、排空工具提交，协调 Backend 和 Agent 两个写者在安全点关闭/快照，不能假定两个库天然原子。恢复后旧审批重新核验；快照不兼容时保留日志并提示新建任务。

### 5.2 新请求、恢复与历史重放

| 用户动作 | 正确处理 | 不能隐含的行为 |
| --- | --- | --- |
| 继续会话问新问题 | 新 `runId`，可沿用 thread，并输入新消息 | 不能仅因 thread 相同就当作恢复未完成任务 |
| 回答审批或澄清 | 找到同 thread、同 interrupt，以锁定版本的 `Command({ resume })` 恢复 | 不能创建新 thread 后宣称原任务接续 |
| 崩溃后继续 | 检查 graph/schema、unfinished work、授权和效果账本后恢复同 run，建立新 attempt | 不能只重新发送原始提示词并重复副作用 |
| 重放旧 checkpoint | 明确建立新 run/分支并说明会重执行后续节点 | 不能当作纯只读查看；LLM/API 调用可能再次发生 |

LangGraph 中断恢复时，所在节点会从节点开头再次执行；interrupt 前的逻辑应纯粹或具有幂等保护。审批与写入分离为短节点，不能依赖“暂停位置精确到某一行”防止重复操作。

### 5.3 外部副作用不由 checkpoint 保证恰好一次

Backend 对写入建立效果账本：`effectId`、目标/版本、参数摘要、幂等键、状态和结果引用。工具重试优先读取已提交结果；同一幂等键但参数不同应拒绝。

副作用执行前先持久登记稳定操作意图，并将其操作 ID 写入可恢复状态，随后才进入执行节点；恢复沿用同一 ID。不能用每次重跑新生成的模型 `toolCallId` 去重，也不能只用参数 hash，否则用户明确再次执行同样操作会被误合并。登记和执行之间可恢复，状态不明的远端效果单独核对。

业务数据库内的修改以完整事务命令执行。涉及项目文件的操作采用临时内容、原子替换/恢复记录等文件协议；数据库事务不能跨文件系统天然原子。外部 API 还要使用其幂等机制、结果查询或补偿策略。

网络中断后若不能判断远端动作是否成功，记录 `effect_ambiguous` 并要求核对，不自动重试有副作用的操作。首版不承诺跨进程、文件和外部服务的 exactly-once。

## 6. 工具契约、审批与写入策略

每个工具有稳定名称/版本、参数 schema、结果 schema、目标 scope、读写属性、是否可重试、预算/超时、取消能力和审计摘要。参数要在 Agent 侧和 Backend 边界分别校验；不给模型任意 SQL、系统路径或 IPC channel。

| 工具类别 | 首版示例 | 执行边界 |
| --- | --- | --- |
| 资料读取 | 检索、读指定段落、查看来源 | `sourceId/revision/anchor`，返回有界内容；不因提示词要求就扩大范围 |
| 作品处理 | 读章节、生成编辑提案、创建候选稿 | 修改指向 `baseRevision`；由业务服务提交正式新版本 |
| 学习辅助 | 生成候选题、讲解、建议复习内容 | AI 题经确认入题库；真实作答/提示/复习由学习服务记录 |
| 工作任务 | CSV 预览、确定性统计、报告生成 | 使用注册分析操作和受限 worker；保留输入版本及计算结果 |
| 导出与文件 | 导出指定作品或产物 | 用户选择目标位置，由 Backend/Main 验证；不接受自由文件系统遍历 |

用户可按任务选择：只给建议、逐项审阅、授权范围内自动应用并留快照。普通修改、批量替换、覆盖导出、外部发送采用不同 policy；授权自动写入不扩大数据范围。

审批票据绑定用户、项目/run、工具版本、规范化参数 hash、目标/`baseRevision`、scope 和有效期；Backend 在实际执行时重新校验。文档被改过、权限改变、审批过期或参数被编辑，旧批准不能直接使用。

LangChain HITL middleware 能暂停工具调用，但不是授权服务。其条件 predicate 在恢复时可能重算；使用稳定决策，执行端仍按审批票据验证，不能依赖模型遵守提示词。

拒绝操作用 `reject` 并记录未执行；`respond` 用于用户充当“回答问题”工具，不能拿它表示拒绝写入后又把结果记作成功。

## 7. 模型、上下文、错误与取消

1. **模型能力登记**：工具调用、结构化输出、视觉、上下文和输出上限逐 provider/model 验证；OpenAI-compatible 不代表行为完全一致。
2. **上下文清单**：本次资料、章节、选区和偏好均有 ID/修订/预算；源文件内容是资料，不自动成为系统指令。
3. **大附件处理**：PDF/CSV 在解析层转为可定位片段，Agent 获取有限结果；大产物保存为引用，不把整份文件反复放进消息。
4. **请求超时**：区分连接、首 token、空闲和整次运行期限；工具也有超时，不能只有 UI 倒计时。
5. **可重试错误**：限流、暂时网络失败使用有界退避；非幂等工具和远端状态不明操作先核对账本。
6. **不可重试错误**：凭据错误、schema/权限错误、过期修订、未支持能力向用户解释；结构化输出允许一次有界修复，失败保留草稿。
7. **预算**：限制累计调用、token、步骤、子 Agent、工具时间和费用估算；恢复的同一 run 不清零累计用量。供应商未报告的缓存/费用写“未知”。
8. **取消**：请求通过 requestId 传播到 Agent、ModelGateway 和 worker；等待有界优雅退出，失联时 Supervisor 终止进程，状态进入可解释终态。

`AbortSignal` 不能被假定自动穿过 IPC；实现独立 cancel 消息和 requestId 映射。强制 kill 不保证远端停止计费，已经提交的业务效果不靠取消回滚；部分产物及已发生费用保留。

Backend 为 run 保存取消标记或执行 epoch，正式提交前复核，拒绝取消后仍在排队的旧命令。只有活动提交结束且提交屏障确认后，UI 才显示“已取消”；此前显示“正在停止”。取消前已提交的效果保留，可另走版本恢复，不能声称取消自动回滚。

Main 保管原始密钥，Agent model adapter 接受代理流和错误。禁止把 provider secret 写入提示词、IPC 广播、checkpoint、崩溃日志或项目备份；诊断默认不保存完整私人资料。

## 8. Deep Agents、Skills、MCP 与子 Agent

### 8.1 Deep Agents 的采用门槛

S0 只检查相关依赖和进程兼容；S3 在真实资料和业务工具链可用后，与普通 Agent 使用相同资料研究任务比较规划、上下文占用、质量、费用和恢复，纳入 S3-03/S3-04 的可选 profile 评估。只在通过 checkpoint、取消及范围检查时启用；未通过不影响默认 profile 交付。

使用自定义虚拟文件 backend：只读挂载选定资料与已确认偏好；运行 scratch 区用于计划和中间资料；正式写入转为业务命令。禁止直接用普通 FilesystemBackend 挂整个项目或用户主目录。

官方 permissions 只覆盖内置文件工具，不覆盖自定义工具、MCP 与任意 shell；未匹配规则默认允许。因此自定义 backend 和 broker 应默认拒绝未授权操作，并验证规范化路径与实际目标，不能把 glob 当完整 OS 防线。

Deep Agents 的文件工具、Skills 和子 Agent 不等于代码执行沙箱。v0.1 不开启任意 `execute`/shell；未来采用沙箱后端时单独验证容器、网络、文件和凭据边界。

### 8.2 Skills 与 MCP

Skills 采用 `SKILL.md` 元数据 → 正文 → 资源的渐进加载。首版以随应用发布、版本固定的指令包为主；外部导入、市场、脚本执行属于后续扩展。Skills 不能覆盖业务权限或取得额外工具。

MCP 连接器先通过固定服务和单个工具小样验证，再开放管理页；工具来源、schema、认证、超时、网络和写权限均纳入注册表。stdio MCP 会启动本地进程，不作为“纯提示词插件”处理。

当前 `@langchain/mcp-adapters` 2.x 使用 `MCPAdapter` 与分包式 MCP client/core，旧 1.x 使用方式另有迁移文档。不得用旧 `MultiServerMCPClient` 示例直接拼当前包；接口和协议兼容由 S0 依赖锁与小样确定。

### 8.3 子 Agent

子 Agent 的隔离首先是上下文隔离，不是 OS、账号或文件权限隔离。每个子任务都要继承且可缩小父 run 的 scope、总预算和取消树，不能自动获得全部工具、全局记忆或其他项目数据。

首版默认单 Agent；研究 profile 可在验证后开放少量只读子任务，初始建议并发上限 2、委派深度 1。结果保留来源和子 run 关系，父 Agent 汇总不把子 Agent 的判断自动升级为业务事实。

## 9. 分阶段验证与完成条件

| 阶段 / 检查 ID | 必须拿到的证据 | 不通过时的处理 |
| --- | --- | --- |
| S0 / AG-01 | 锁定依赖在 Electron 内置 Node 可加载；core 单版本；native saver 打包可用 | 调整兼容组合，不用全局安装或内存 saver 冒充通过 |
| S0 / AG-02 | 真实文件 checkpoint 在独立进程退出后可读；模型代理和取消能工作 | 修正进程/消息/ABI，再进入业务接入 |
| S3 / AG-03 | 默认与 Deep Agents profile 的同任务比较、工具限制和资源记录，对应 S3-03/S3-04 | 可只交付默认 profile，复杂能力继续保留 |
| S3 / AG-04 | 审批后重启可继续；修改目标版本后旧审批失效；重复请求只有一次业务提交 | 修复审批和效果账本，不能仅在 prompt 增加提醒 |
| S3 / AG-05 | 取消、进程崩溃、模型超时均有真实终态和可恢复记录 | 保留故障点与部分结果，明确是否可继续 |
| S4 / AG-06 | 学习、CSV 工作和作品编辑分别通过业务服务完成；引用与版本可核对 | 按对应领域修复，不把工具返回文本当业务完成 |
| S5 / AG-07 | 无网/无 Key 不影响本地业务；日志/备份不含密钥；迁移后旧 run 状态可解释 | 阻断发布并提供明确恢复方式 |

官方 SDK 的单元测试不能替代以上 Electron 集成、故障与真实模型小样。Agent 自动反馈的教学效果、质量和成本也要用实际材料测量，不写未经测量的成功率或性能提升。

## 10. 官方来源与本轮边界

- [LangChain JS 概览](https://docs.langchain.com/oss/javascript/langchain/overview)、[Agent](https://docs.langchain.com/oss/javascript/langchain/agents)、[HITL](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop)。
- [LangGraph 概览](https://docs.langchain.com/oss/javascript/langgraph/overview)、[持久化](https://docs.langchain.com/oss/javascript/langgraph/persistence)、[checkpointer 与继续会话语义](https://docs.langchain.com/oss/javascript/langgraph/checkpointers)、[interrupt/replay 约束](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。
- [Deep Agents JS 概览](https://docs.langchain.com/oss/javascript/deepagents/overview)、[Node/browser 入口与返回 graph](https://github.com/langchain-ai/deepagentsjs/tree/main/libs/deepagents)、[Skills](https://docs.langchain.com/oss/javascript/deepagents/skills)、[permissions 适用范围](https://docs.langchain.com/oss/javascript/deepagents/permissions)、[子 Agent](https://docs.langchain.com/oss/javascript/deepagents/subagents)。
- [JavaScript SqliteSaver 官方实现](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-sqlite)、[LangChain MCP 2.x](https://docs.langchain.com/oss/javascript/langchain/mcp)。
- npm 元数据：[langchain](https://registry.npmjs.org/langchain/latest)、[core](https://registry.npmjs.org/@langchain%2Fcore/latest)、[LangGraph](https://registry.npmjs.org/@langchain%2Flanggraph/latest)、[checkpoint](https://registry.npmjs.org/@langchain%2Flanggraph-checkpoint/latest)、[SQLite saver](https://registry.npmjs.org/@langchain%2Flanggraph-checkpoint-sqlite/latest)、[deepagents](https://registry.npmjs.org/deepagents/latest)、[provider](https://registry.npmjs.org/@langchain%2Fopenai/latest)、[MCP adapter](https://registry.npmjs.org/@langchain%2Fmcp-adapters/latest)、[MCP 旧 SDK](https://registry.npmjs.org/@modelcontextprotocol%2Fsdk/latest)。
- [Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)、[Electron 安全与 IPC 边界](https://www.electronjs.org/docs/latest/tutorial/security)。

动态官方页面和 npm `latest` 会变化。S0 应将实际选用版本、锁文件、读取到的 peerDependencies、文档版本与验证结果写入 ADR；本规划只记录本轮观察与设计，不构成集成、沙箱或模型兼容的通过证明。
