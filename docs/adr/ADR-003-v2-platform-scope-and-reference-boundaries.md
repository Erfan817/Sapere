# ADR-003：v2 平台范围、参考规格吸收与差异边界

日期：2026-11-18。状态：规划决策；不表示 v0.2 已实现。  
关联：[项目规划 v2](../../docs-sapere/planning-v2/README.md)、[吸收与差异](../../docs-sapere/planning-v2/07-参考规格吸收与差异决策.md)、[桌面架构](../../docs-sapere/planning-v2/03-桌面架构与数据设计.md)。

## 背景

`REBUILD-SPEC.md` 对一套已安装的本地 AI 桌面工作台进行了结构拆解，覆盖会话、空间/文档、笔记、Wiki、知识库、Agent、技能、工具、MCP、任务、产出、媒体、设置、备份、本地网关和微信桥。

Sapere 的 v1 规划已经确立了学习、工作、创作三业务和 Electron/React/TypeScript、LangGraph、SQLite 的路线；S0 又通过实测确认了 React、`node:sqlite`、Backend/Agent `utilityProcess`、sandbox Renderer 和独立 checkpoint 的可运行性。

本次重写需要吸收参考规格的通用结构，同时避免以下错误：

1. 把参考程序的品牌、功能数量或技能内容当作 Sapere 的目标。
2. 为了照抄技术栈，把已经验证失败的 `better-sqlite3` 重新变成必需依赖。
3. 把 Renderer 暴露成通用数据库 CRUD 客户端。
4. 让 Wiki、媒体、MCP、微信桥和本地网关成为核心业务闭环的隐性前置。
5. 用规划、参考程序证据或 mock 代替本项目当前实现和实际测试。

## 决策

### 1. 产品结构

Sapere 采用“本地 AI 工作台底座 + 学习/工作/创作业务内核”：

- 工作台提供空间、文档、笔记、会话、Agent、任务、产出、设置、回收站和备份。
- 业务内核提供真实作答与复习、确定性 CSV 分析和可复算报告、作品/章节与修改提案。
- 平台能力为业务服务，不替代业务事实。

### 2. 技术栈

- 保留 Electron + React 19 + TypeScript。
- 保留 `node:sqlite` 和 ADR-001 的替代路径；v2 不以 `better-sqlite3` 为必需依赖。
- 保留 Main / Backend / Agent / sandbox preload 的进程边界。
- Renderer 只使用 `window.sapere.request/subscribe`，不接受通用 `db:*`。

### 3. 接口命名

- 逻辑命令使用 `domain:action`。
- 传输层使用 `sapere:request` / `sapere:event`。
- 命令、事件、表先登记到 `planning-v2/06-IPC与数据契约.md` 与 `packages/contracts`，再实现。

### 4. 安全

- 默认 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
- 生产页面使用受控自定义协议，收紧 CSP、导航、权限和窗口打开。
- 发布版显式加固 Electron fuses；当前未完成项作为 v0.2 阻断。
- 密钥只在 Main Vault，子进程不继承，不向 Renderer 回显。
- 文件访问使用对象 ID、工作区根和真实路径检查；不接受模型给定任意路径/URL/认证头。

### 5. 阶段

- v0.2 工作台闭环：S1–S4，含多空间/文档/会话、基础 Agent、三业务和基础备份。
- v0.3 知识与文档：S5。
- v0.4 扩展与媒体：S6–S7。
- v1.0 稳定发布：S8–S9。

Wiki、媒体、MCP、微信桥、本地网关和可选 Python 环境不作为 v0.2 的必经路径；v1.0 前默认关闭高级桥接。

### 6. 参考规格边界

- 吸收通用结构、交互、运行/审批/恢复、文件/备份、能力包格式和安全原则。
- 不复制品牌、图标、文案、技能内容、具体代码或参考程序证据。
- 不追求参考规格中的 424 通道、86 路由、480 模块、90 技能包等规模数字。
- 任何结构或资产借鉴都记录来源、许可和改写方式。

## 后果

- `planning-v1` 被标记为历史基线，但 ADR-001/002 和 S0 验证记录继续有效。
- v2 的完整平台范围明显大于 v1；v2.1 估算为 v0.2 约 295–475 小时，完整平台约 575–955 小时，均为规划区间而非承诺。
- 当前 S0 的未完成项不被本次重写覆盖：真实模型、真人中文 IME、干净 Windows 安装/卸载和安全加固仍需实际证据。
- 后续新增命令、表、事件、页面或高风险扩展，必须更新契约文档并新增 ADR（如改变信任模型）。

## 未采用/待验证

- `better-sqlite3`：当前不采用；未来若要使用，必须重新验证 Electron ABI、asar unpack、开发态和安装包。
- Vue：当前不改写 React 链。
- 裸 DB 桥：不采用。
- 参考程序的技能内容：不采用；只吸收目录结构和加载原则。
- 自动更新、签名、微信桥、本地网关、实时 ASR：后续逐项验证，默认不进入核心发布。
