# Sapere 二开底座核验：Reviva 与 OpenTutor

核验日期：2026-11-13。状态：静态源码核验完成；未运行构建、测试或应用。

## 目标与判断标准

本次面向已有开源产品的二次开发，不以从零实现替代二开。Sapere 的已知目标：

- 面向个人学习的完整桌面工作空间。
- 复用已有资料管理、AI 对话、多模态与创作能力。
- 预置 LLM / Agent 教程，连接学习、练习、反馈与长期复习。
- 根据实际发布方式评估许可证；目前没有假设用户必须闭源，也没有假设用户已同意 AGPL 发布义务。

比较维度：许可证与分发条件、真实架构与扩展入口、学习记录与复习机制、多模态与云服务依赖、构建/测试/更新/迁移等维护基础。

## 核验快照与边界

| 项目 | 仓库 | 本次检出提交 | 提交时间 |
|---|---|---|---|
| Reviva | https://github.com/mingchen666/Reviva | `85222de4276c1a2b8ba2d3e100ea0503e9569ca5` | 2026-11-06T14:57:05+08:00 |
| OpenTutor | https://github.com/zijinz456/OpenTutor | `8af06ce076051ac6844c7abf8c2052910616a7c2` | 2026-11-12T23:16:02Z |

两个仓库以浅克隆方式保存于 `research/upstreams/` 下的独立目录。本次只读源码与配置，不安装依赖、不执行仓库脚本、不启动应用。源码中存在实现和测试，不等于测试通过或产品运行正常。

GitHub 公开 API 返回 403 rate limit exceeded，因此本次未通过 API 核实 release 列表、下载资产、star 数或发布频率。检出提交时间不能单独证明发布频率或维护质量。

## 核验结果

### Reviva

**判断：产品形态与 Sapere 的桌面工作空间高度相近，但目前不能确认适合直接分发为 Sapere 商业底座；学习复习能力也未证明覆盖长期间隔复习。** 适合作为优先试用和架构参考候选，许可与数据/测试工程核验通过前不应据此定为可发布 fork。

- **许可证存在重大待澄清事项。** 当前快照中 `package.json:5` 标 `AGPL-3.0`，README `:400-419` 声称“AGPL-3.0 + 商业许可”，且要求企业团队、商业集成、客户项目、SaaS/私有化和二次分发等情形联系作者。经 `git ls-files '*LICENSE*' '*NOTICE*'` 检查，仓库根目录没有 LICENSE/NOTICE；只发现三个内置 Skill 的许可证文件。README 的附加限制与标准 AGPL 的授权文本关系不能仅靠 README 解决，尚无根目录授权文本或双许可合同可据以核实。不要把“AGPL 可商用”简化成“这些额外限制必然无效”，也不要把 README 商业授权说法直接当成已成立的法律结论；需要权利人明确 Sapere 的修改、分发、收费和网络服务场景所适用的授权。
- **内置第三方 Skill 资产有可核实的许可证元数据冲突。** 检出 62 个 Skill `config.json` 含 license 字段，但未发现统一 THIRD-PARTY-NOTICES 清单或完整来源记录。`electron/builtin-assets/skills/guizang-ppt-skill/config.json:12-13` 标注 MIT，而同目录 `README.md:420-422` 与 `LICENSE:1-3` 标 AGPL-3.0；它的 LICENSE §4 (`LICENSE:193-194`) 允许收费分发，不能据此认为配置冲突无碍。另有 `geometry-assistant/config.json:21-22` 和 `huasheng13-skill/config.json:24-25` 的 license 为空。`electron/SkillService.js:900-925` 复制内置资产并保留 config 元数据，没有发现分发前的许可证一致性校验。因此完整 fork 分发前必须逐项确认内置资源的权属、来源和条款，必要时移除或替换不可追溯资产。
以下源码路径相对于本次 Reviva 检出目录 `research/upstreams/reviva-20261113/`；路径后的行号对应上表提交，审核提取点只代表静态实现证据。

- **桌面架构与本地存储属代码实有。** `package.json:9-25,36-58,60-95` 声明 Vite、Electron builder、Vue/TS、SQLite 与更新依赖；`vite.config.ts:99-140` 指定主进程 `electron/main.js` 和 `electron/preload.js` 构建入口。`electron/main.js:222-232` 创建 BrowserWindow，启用 `contextIsolation`、关闭 `nodeIntegration`；`:348-364` 按工作区初始化数据库；`:417-475` 装配 Agent、成长画像、Skills、生成任务、Wiki、导入与备份服务。`electron/db/DatabaseContext.js:1-14` 加载 better-sqlite3，`electron/DatabaseService.js:93-113` 初始化 WAL、外键并执行 schema/迁移/seed。**审核提取点：** 可复用“Vue 渲染层→preload/IPC→Electron 服务→工作区 SQLite/文件”的桌面结构；窗口参数与服务装配不等于已验证 IPC 权限和多工作区数据隔离。
- **学习内容扩展有目录与配置入口。** `electron/builtin-assets/agents/README.md:3-7,11-20,51-77` 说明普通内置 Agent 的 `config.json`、`PROMPT.md`、工具/Skills 绑定及启动同步机制，并区分 `electron/agents/builtin/` 下的创作 Agent。`electron/GenerationTaskService.js:33-67,83-94,118-121` 可见生成任务 IPC、模块选择、内置 Agent 配置加载和任务记录创建。**审核提取点：** 可提取 Agent 提示词、工具/Skill 绑定及独立生成模块作为 Sapere 教程入口；该结构尚不能证明已有可版本化课程包、教学进度或课程导入导出，且所有内容复用仍受前述来源与授权核验约束。
- **闪卡与测验有真实实现，但能力范围须按代码收窄。** `electron/generation/modules/FlashcardGenerationModule.js:1-36` 接入 JSON runner 并校验 `qa`/`cloze` 卡片；`QuizGenerationModule.js:1-51` 只接受 `single`/`bool` 题型，与 README `:207` 所称多选、填空、简答不能直接等同。`src/components/preview/FlashcardPreview.vue:169-203,236-265` 读取产物、展示卡片状态、翻面和前后浏览；`QuizPreview.vue:184-208,229-231,251-290` 以组件本地 `ref` 保存答案、提交状态与判分，支持切题和重置。**审核提取点：** 可复用生成、校验、浏览、自测 UI；这两段交互未展示评分写库或到期队列，不足以证明答题记录持久化和长期调度。目前全量 TypeScript/JavaScript/Vue 静态检索未确认 `FSRS`、`SM-2` 或间隔复习调度标识，不能将闪卡浏览或 `mastered` 标签等同可靠的长期间隔复习。
- **成长画像存在独立服务，不能据此推定已打通复习闭环。** `electron/main.js:427-430` 初始化并注册成长画像 IPC；`electron/learning-memory/LearningMemoryService.js:205-249` 读取开关、暂停暂存操作并检查画像工具是否启用，`:251-278` 校验运行上下文、证据引用并暂存撤回操作。`electron/learning-memory/LearningMemoryRepository.js:276-341,357-360` 聚合概念状态、误区与证据计数。**审核提取点：** 可提取有证据约束的学习画像机制；需另验测验/闪卡交互是否触发画像更新、跨会话记录是否保存，以及撤回/暂停/导出是否端到端成立。该画像不是已核实的 FSRS 调度器。
- **备份、迁移和更新已有工程入口，但升级数据保留需重点审核。** `electron/BackupService.js:382-447` 创建 SQLite 一致性快照并与所选工作区文件组成 ZIP（支持 full/compact 等模式）；`:468-522` 检查备份格式、清单与文件数量，`:543-564` 恢复前创建 full 安全备份并准备恢复状态；`electron/main.js:316` 在启动时应用待恢复备份。`electron/db/schema/migrations/versionedMigrations.js:13-20` 记录迁移版本，其中 `:216-230` 的 v10 迁移删除并重建学习相关表，必须验证旧版学习数据是否需要及能够保留。`electron/AutoUpdater.js:10-12,54-68,82-101` 关闭自动下载和退出自动安装，仅打包环境检查更新并提供下载/重启安装 IPC。**审核提取点：** 备份生成、恢复前备份、迁移台账与更新动作可作为审计入口；尚未实测恢复完整性、旧版本升级、迁移失败回滚、更新源及安装包签名，不能据源码入口判定生产可用。
- **本地桌面仍有外部服务配置与多模态依赖。** `src/apis/http.js:4-12` 的 HTTP 基址来自环境配置或默认 `localhost:8000`；`electron/RealtimeASRService.js:1-4,84-107` 使用阿里 Paraformer 云端实时语音识别。**审核提取点：** 分别核对接口用途、服务启动条件、ASR 凭据/计费和音频上传边界；这些证据不能证明所有学习与多模态功能可离线运行，音视频端到端链路仍需实测。
- **测试与打包配置存在，不代表验证通过。** `package.json:11-25` 提供多平台构建、DB migration、Wiki、Skills、K12 Agent、主题和网页导入测试入口。`electron-builder.json5:4-16,17-35,37-71` 配置打包资源、平台目标及上游更新发布配置；`.github/workflows/build-mac.yml:192-199` 的 Windows job 以 `if: false` 禁用，该工作流未见测试步骤。**审核提取点：** 提取构建/测试命令、资源清单和更新源，fork 时复核发布地址并补 Windows 构建及测试验证；本轮未安装依赖、执行仓库脚本、构建或启动应用，CI 实际结果、平台包可安装性及完整发布升级流程仍未验证。

### OpenTutor

**判断：MIT 许可、学习机制与可扩展工作区代码有较强复用价值；如果 Sapere 必须是原生桌面应用，需承担桌面化改造，且要先修复/验证实际 FSRS 数据闭环。适合作为技术底座候选，而不是已经验证成熟的 Sapere 产品。**

- **许可与技术栈（代码实有）：** `LICENSE:1-21` 是 MIT。`apps/api/pyproject.toml:5-55` 和 `apps/web/package.json:13-61` 显示 Python 3.11+ / FastAPI / SQLAlchemy async / SQLite，Next.js 16 / React 19 / TypeScript。默认只接受 SQLite（`apps/api/config.py:13-15,200-221`）；模型可选 Ollama、Anthropic、DeepSeek、OpenAI 兼容等（`:17-44`）。
- **不是原生桌面应用：** 已有 Windows 启动器/安装工程，但入口打开 localhost 浏览器；并非 Electron/Tauri 原生窗口（`scripts/native-control.ps1:69-72,123-125`; `docs/guides/windows-native-support.md:31,43`）。Windows 文档称安装包未签名、不支持原位升级，Windows 10/ARM64及干净实体机未核实（`:5-16,55-60,87-99`）。若 Sapere 想先接受浏览器壳，改造较小；若要原生桌面体验，需额外实现窗口生命周期、发行签名和升级体验。
- **学习能力有真实调用路径，但需修复。** FSRS 进入闪卡和测验作答路径：`apps/api/services/spaced_repetition/flashcards.py:120-149`、`apps/api/routers/quiz_submission.py:217-225`、`apps/api/services/progress/tracker.py:91-179`；BKT 接入掌握度更新（`tracker.py:111-127,219-248`）。LOOM/LECTOR 被摄取、作答和闪卡排序流程调用，并有集成测试（`apps/api/services/ingestion/auto_generation/orchestrator.py:86-95`、`apps/api/routers/quiz_submission.py:236-244,276-289`、`apps/web/src/components/sections/practice/flashcard-view.tsx:85-100`、`tests/test_loom_graph_e2e.py`、`tests/test_lector_e2e.py`）。但 README 仍称实验性，相关配置默认关闭（`apps/api/config.py:85-86`），开关覆盖及行为需整合验证。
- **可复核的 FSRS 持久化疑点：** 后端只有收到 `batch_id` 和 `card_index` 才回写复习后的卡片状态（`apps/api/routers/flashcards.py:74-95`）；前端 `reviewFlashcard` 只发送 `{card,rating}`（`apps/web/src/lib/api/practice.ts:291-299`），复习组件忽略响应（`apps/web/src/components/sections/practice/flashcard-view.tsx:151-174`）。静态调用链显示正常 UI 路径可能没有保存新的调度状态；应作为首个集成测试和修复项。
- **预置课程入口存在，但内容不匹配目标。** Block 注册表与模板机制可扩展（`apps/web/src/lib/block-system/types.ts:1-20,35-52`、`registry.ts:42-121`、`templates.ts`）。内置 Demo 是 Python 基础课（`apps/api/services/templates/demo_course.py:1-6,23-25`），并非 LLM/Agent 课程。另有 Demo 闪卡类型单数 `flashcard` 与查询端复数 `flashcards` 不一致的静态疑点（`demo_course.py:265-274`、`apps/api/routers/flashcards.py:218-223,288-295`）。
- **工程运维证据：** SQLite 启动迁移先备份，并对不能安全迁移的 schema 拒绝自动操作（`apps/api/services/sqlite_migrations.py:53-86,95-123,126-188,222-255`）；有 Windows 备份脚本（`scripts/native-backup.py:8-28`）。CI 配置覆盖 API、Web、集成、Playwright 和迁移检查（`.github/workflows/ci.yml`）；本轮未实际运行测试。课程资料外的完整用户数据导出/恢复流程尚未确认。语音/视频的端到端生产路径未能确认，PDF 解析器依赖未纳入基础依赖，可能在运行时缺失（`apps/api/services/parser/pdf.py:38-70`、`apps/api/pyproject.toml:38-55`）。

### 对照结论

| 维度 | Reviva | OpenTutor |
|---|---|---|
| Sapere 目标桌面形态 | 现成 Electron 桌面应用 | 本地服务+浏览器；原生桌面需改造 |
| 许可确定性 | 低：缺根 LICENSE，AGPL 标注与 README 商业授权须权利人澄清；内置 Skill 有许可证元数据冲突，需逐项清理 | 高：根目录 MIT 原文可核 |
| LLM/Agent 预置学习内容 | Agent/Skill 体系形态接近，但内容来源、许可和课程机制须核 | Block/课程模板扩展入口可用，需新建目标课程包 |
| 长期复习 | 有闪卡与测验；源码检索未确认 FSRS/SM-2 调度 | 有 FSRS/BKT/LOOM/LECTOR 真实调用，但 UI 到持久化路径存在静态疑点，且部分为实验功能 |
| 资料与多模态 | README 功能面广，实际链路/外部依赖待跑通 | Web/文档路径可见，音视频端到端不明确 |
| 本地数据运维 | SQLite 与迁移/备份/升级须进一步审计 | SQLite 迁移/Windows备份源码可见；完整导入恢复和桌面发行待补 |
| 二开主要代价 | 授权澄清、学习调度补齐、厘清内容/云依赖 | 桌面体验、FSRS闭环修复、内容包和多模态补齐 |

**当前有条件的建议：**若 Sapere 首发要求可直接分发的桌面 fork，Reviva 形态最吻合，但现有授权文件缺口是阻断项；在授权澄清前不要以其作为确定的商业发布底座。OpenTutor 的 MIT 授权更明晰，学习科学方向更匹配，但它不能直接满足原生桌面产品形态，且应先修复闪卡调度持久化疑点。当前证据不足以无条件宣布哪一个“最适合”；建议先向 Reviva 权利人取得明确书面授权答复，同时用 OpenTutor 验证一个纵向切片，比较两者所需改动量后再选 fork。

## 未核验与建议验证

- 未安装依赖、未运行任何仓库测试、未构建或启动，因此不声称代码通过测试或可正常打包。
- GitHub API 限流，版本发布资产、维护频率、star 和 CI 实际状态未核实；提交时间仅代表检出提交的 author/commit 时间。
- Reviva：获取权利人针对 Sapere 计划发布方式的授权书/书面答复；补齐所有内置 Skill/Agent/资源的来源和许可证清单；审计第三方 npm、字体、图标和模型/云服务费用；验证备份恢复、数据库迁移、自动更新、Windows/macOS 打包；确认闪卡/测验是否具备间隔调度及其数据持久化。
- OpenTutor：在 UI→API→SQLite 的端到端复习中验证每次评分的 FSRS 状态确实保存并影响下次排程；统一 LOOM/LECTOR 实验开关；验证 Windows 干净环境安装/更新/备份恢复；评估 Next.js/React 浏览器产品是否可接受，或量化桌面壳改造；验证中文课程包与 PDF/音视频依赖。
