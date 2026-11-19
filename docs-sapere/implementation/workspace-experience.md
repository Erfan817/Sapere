# 独立空间、外观与模型服务

日期：2026-11-17。工作目录 `<项目目录>`。

> 2026-11-18 更新：按 `CODEX-BRIEF` 审计完成 schema v3 迁移，为文档和修订补 `created_at/updated_at/deleted_at`；命令名已迁移为 `域:动作`，详见 [CODEX-BRIEF 对照审计](CODEX-BRIEF-AUDIT.md)。本文下方 v2 描述保留为当时记录。

## 已实现

- 学习、创作、工作拥有独立文档、修订序号、未保存状态、选区审阅与本次打开期间的 AI 输出。切换页面保留编辑器实例。
- business.sqlite schema v2 将旧 `s0-draft` 及全部历史留在创作空间，新增学习和工作模板。历史主键为 `(document_id, revision)`。迁移失败事务回滚；升级前 checkpoint 后保存 `business.pre-v2.sqlite`。旧库缺少当前稿记录时，从最新修订恢复；空旧库补齐三份初始文档。
- 浅色、苔绿、深黑通过 CSS 变量覆盖整套界面与 CodeMirror。默认苔绿，选择保存在 localStorage。
- 侧栏统一设置入口包含模型服务、外观和运行与诊断分类；日后增加偏好可沿用同一分区布局。
- 模型服务卡片：DeepSeek / 通义千问 / OpenAI / 自定义 OpenAI 兼容服务。可编辑预设、保存多个服务、切换当前服务、替换或移除配置。
- Main 使用 Electron `safeStorage.encryptStringAsync` / `decryptStringAsync`。加密文件放在 userData，不写入业务库或 Agent checkpoint；返回 Renderer 的已保存配置只有服务 ID、URL 和模型名称。
- 加密不可用不写明文；解密失败或内容损坏保留原文件并显示错误，可明确选择先备份再重置。使用异步加密可用性检查并处理密钥轮换；轮换写入失败时仍保留已解锁配置和原密文并提示下次重试。更换 URL 需重新填写 Key；等价 URL 归一化，误填完整 `/chat/completions` 会自动转换为基础地址。API URL 允许 HTTPS 与本机 HTTP，拒绝嵌入认证信息、查询参数与 fragment。
- 各空间提供三个场景问题、单次流式回答、可选当前文档、取消和复制。Main 固定系统角色，最多 2,048 输出 token、0 重试、90 秒期限。一次执行一个请求；更换模型时要求当前调用先结束。AI 输出不自动改正文。
- DeepSeek 场景助手和小额工具检查显式使用非思考模式，避免有限输出配额全部用于推理而没有可见回答；本地协议夹具核对实际发出的 `thinking.type=disabled`。
- 右侧问题输入区固定在面板底部，介绍和回答区域独立滚动。模型配置弹窗支持 Escape、焦点限制与 Key 遮蔽。
- 未保存退出采用 Main 请求 Renderer 检查及保存、原生确认对话框和最终复核；所有有改动的空间保存成功后才退出。取消或保存失败保持 Backend/Agent 运行，保留编辑器输入；只有窗口实际关闭后才关闭后台进程。

## 验证

- `pnpm typecheck`、`pnpm format:check`、`pnpm test:unit`、`pnpm build`。单元测试 16 项全部通过。
- `SAPERE_TEST_NO_SANDBOX=1 pnpm test:e2e` 驱动真实 Electron。沿用当前环境已记录的沙箱诊断参数，应用默认不关闭沙箱。
- 单元覆盖旧数据库迁移成功/回滚、跨空间 revision 隔离、旧稿保留、重开、stale write、加密文件/脱敏回复、Key 留空复用、URL 改动拒绝复用、配置解锁失败保留原文件、schema 与已有流式/工具/取消/401 路径。
- 桌面覆盖未保存内容跨空间切换、三份稿件重启后独立、主题重启保留、四个预设卡片、Windows 实际 safeStorage 加密与重开解密、已存 Key 不回显、移除配置，以及经本地 HTTP/SSE 服务验证真实 Main → 模型 transport → Renderer 流式回答，核对仅携带当前学习文档。
- Electron E2E 四条全部通过：增加取消关闭保留进程、保存失败保留输入、多个空间一并保存退出、明确放弃后重开，以及损坏密钥文件先备份后重置的界面路径。退出测试仅替换原生对话框选项返回值，实际 Main/Renderer IPC、SQLite 保存和应用重启照常执行；原生对话框外观仍需人工验收。
- 桌面截图包括三个主题、模型服务、学习助手、1080 × 720 紧凑布局，保存在 `.sapere/verification/experience-*/`；报告不记录真实凭据或正文。

## 范围

每个空间当前一份文档，不代表已完成多项目、课程、CSV 分析或作品目录。AI 为单次问答，不自动携带上一轮对话，重启后不保留问题和输出。远端模型尚未用有效 Key 验证；测试使用本地夹具，不代表所有服务账户实际可用。安装包已在后续 S0 收尾重打并完成实际 payload 回归，见 [S0 验证记录第 12 节](S0-validation.md#12-默认启动复查与最新版安装包)。默认沙箱启动后续已定位并修复，见该记录第 13 节；真人 IME 专项与干净机安装仍待验收。

## 预设来源

2026-11-17 核对官方文档；允许用户按账户权限调整模型名和地域地址。

- DeepSeek `deepseek-flash` 与 `https://api.deepseek.com`：[首次调用 API](https://api-docs.deepseek.com/zh-cn/)。
- DeepSeek 默认开启思考模式，工具回合需额外传回 reasoning 内容；本轮显式关闭：[思考模式](https://api-docs.deepseek.com/guides/thinking_mode/)。
- 通义 `qwen-plus` 与北京兼容接口：[OpenAI 兼容接口](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope?disableWebsiteRedirect=true)。默认旧域名仍可用，地域 Key 须匹配；支持在弹窗填写新版业务空间域名。
- OpenAI `gpt-5.4-mini` 支持 Chat Completions、流式和工具调用，默认 reasoning effort 为 none：[模型文档](https://developers.openai.com/api/docs/models/gpt-5.4-mini)。

用户允许调用 DSH 分工。本轮已由 DSH 完成工作树独立实现审查，建议按证据逐条复核后采用。实现和主测试在本地完成。

已采纳并补回归的审查结果：错误 URL 不应抛出解析异常、配置损坏恢复入口、缺当前稿的旧库迁移、异步加密和轮换、移除当前服务自动选用剩余配置、完整端点归一化、未保存退出。审查提到的取消后终态和清理顺序经事件循环检查，并无证据支持其所称竞态，未照搬；所有输出仍按 runId 过滤。问题区保留本次问题属于当前单次问答交互，不限制用户明确重发。未将审查方无法启动 Electron 的结果当成本机桌面回归结果。

## 本轮最终验证证据

- `pnpm typecheck`、`pnpm format:check`、`pnpm test:unit`（16/16）、`pnpm build` 均通过。
- `$env:SAPERE_TEST_NO_SANDBOX='1'; pnpm test:e2e`：4/4，通过 23.4 秒，无失败、跳过或 flaky；原生退出选项采用测试桩。
- 最终桌面测试汇总：`.sapere/verification/playwright-results.json`。
- 最终主题/设置/助手截图与独立空间报告：`.sapere/verification/experience-gp4hZt/`。
- 项目 `out/` 已更新；后续收尾已重打最新版安装包，打包态与实际 NSIS payload 均 4/4 通过（仍使用 no-sandbox）。没有 Git 提交、推送或发布。
