# M1 · Skill 市场规划

> 状态:规划中 · 日期:2026-11-14
> 前置:M0 已完成内置 skill 双轨(platform/custom)与 ZIP 导入管道

## 1. 目标

为 Sapere 提供一个可持续更新的 Skill 市场:用户在应用内浏览、预览社区优秀 skill,一键下载安装。内容生产侧用**独立 GitHub 仓库 + GitHub Action** 自动从上游抓取、适配为 Sapere 格式并发布,人工审核通过 PR 合入把关。

非目标(MVP 不做):MCP server / 主题市场、评分评论、付费分发。

## 2. 总体架构

```
上游社区仓库(GitHub)
        │  fetch(每日 cron + 手动 dispatch)
        ▼
sapere-market 仓库(独立)
  sources.json(策展清单)→ scripts/fetch.mjs → adapt.mjs → build-index.mjs
  产物:skills/{id}/(提交回仓库)+ index.json + per-skill zip(RelRelease 资产)
        │  PR 审核(新 skill 必须人工 merge)
        ▼
Sapere 应用端
  MarketService 拉 index.json → 预览(按需拉 raw)→ 安装(下载 zip → 复用现有导入管道)
```

## 3. 市场仓库(sapere-market)

```
sapere-market/
├── sources.json            # 策展清单:收录哪些上游 skill
├── overrides/{id}.json     # 可选:逐 skill 覆盖适配字段
├── skills/{id}/            # Action 抓取+适配后的产物(提交回仓库)
├── dist/index.json         # 构建产物:市场索引
├── scripts/
│   ├── fetch.mjs           # GitHub API 下载 tarball → 抽取 subPath
│   ├── adapt.mjs           # 校验 SKILL.md frontmatter、生成 Sapere config.json、license 检查、注入扫描
│   └── build-index.mjs     # 汇总 dist/index.json(sha256、size、version、updatedAt)
├── .github/workflows/sync.yml
└── README.md
```

### sources.json 记录格式

```json
{
  "id": "sepia",
  "repo": "Nanako0129/sepia",
  "subPath": "",
  "ref": "main",
  "category": "创作",
  "icon": "ri-quill-pen-line",
  "color": "#7C5C3E",
  "allowedTools": ["file_read", "file_write", "document_read"],
  "outputTypes": ["Markdown", "TXT"]
}
```

- `id`/`repo`/`ref` 必填,其余为适配默认值,可被 `overrides/{id}.json` 覆盖
- 收录原则:**手工策展**。每条记录都是"人看过一眼"的决策;Action 只负责跟踪上游更新与格式适配,不自动爬 trending

### GitHub Action(sync.yml)

1. 读 `sources.json`,逐个下载上游 tarball(`GET /repos/{repo}/tarball/{ref}`),抽取 `subPath`
2. 适配:
   - 解析 `SKILL.md` frontmatter(name/description/license/metadata.version)
   - 生成 Sapere `config.json`(与 `electron/builtin-assets/skills/sepia/config.json` 同构)
   - license 必须存在,优先 MIT/Apache-2.0
   - prompt-injection 启发式扫描(参见 §6)
3. 变更处理:已收录 skill 的版本更新 → 直接提交;**新收录 skill → 开 PR 人工审核**
4. 打 per-skill zip 挂到 Release(应用端只下载单个小 zip)
5. 生成 `dist/index.json` 提交

### index.json 格式

```json
{
  "version": 1,
  "updatedAt": "2026-11-14T00:00:00Z",
  "skills": [{
    "id": "sepia",
    "name": "写作修订(Sepia)",
    "description": "…",
    "category": "创作",
    "icon": "ri-quill-pen-line",
    "author": "Nanako0129",
    "license": "MIT",
    "version": "0.13.0",
    "repo": "Nanako0129/sepia",
    "size": 48213,
    "sha256": "…",
    "zip": "https://github.com/…/releases/download/market/sepia-0.13.0.zip",
    "files": ["SKILL.md", "references/…"]
  }]
}
```

## 4. 应用端改造(Sapere)

### 4.1 主进程:`electron/MarketService.js` + IPC

| IPC | 说明 |
|---|---|
| `market:list` | 拉取 `dist/index.json`(raw URL),本地缓存(TTL,如 1h),失败时用上次缓存降级为"仅展示" |
| `market:preview` | 按 `repo/ref/path` 拉单文件 raw,渲染预览;每次会话做简单限流 |
| `market:download` | 下载 per-skill zip 到临时目录,返回本地路径 + sha256 校验结果 |

新 skill 下载安装**原样复用现有管道**:`skill:pickImportSource` 的会话机制 → `inspectSkillSource`(预览+冲突检测)→ `skill:importSource`(ID 校验、重名 copy 策略、DB 注册)。市场安装 = 把下载好的 zip 路径喂给这个会话,冲突提示、内置 skill 保护全部白拿。

### 4.2 前端:`src/views/skills/sections/SkillMarket.vue`

现有页面只有"内置 Skills"一个 tab。改造为双 tab:

- **内置**:现有内容不动
- **市场**:在线卡片网格(复用现有卡片样式)+ 详情预览面板(渲染 SKILL.md Markdown)+ 安装/更新按钮
- 安装状态区分:未安装 / 已安装(同 ID)/ 可更新(index.version > 本地 version)
- 已安装的 skill 出现在下方"我的 Skills"列表,走现有 `db:skills:*` 管理

### 4.3 GitHub API 限流

未认证 60 次/hour。MVP 策略:index 一次请求 + raw 按需拉取,足够;下载 zip 走 Release 资产不限流。降级:拉不到时展示缓存并提示"网络受限,内容可能不是最新"。后续可选:允许用户填 PAT 提升限额。

## 5. 首批收录

`electron/builtin-assets/skills/` 现有 63 个 skill 中,仅 sepia 标注了明确上游(`Nanako0129/sepia`,MIT),其余多为 Reviva 二开/自研。首批 `sources.json`:

| id | repo | 说明 |
|---|---|---|
| sepia | Nanako0129/sepia | 已内置,先打通管道并跟踪上游更新 |
| 后续 2–5 个 | 待选 | 从 anthropics/skills、awesome-claude-skills 中挑选与学习/创作场景匹配的 |

选品标准:与 Sapere 学习+创作工作台定位匹配;license 明确;SKILL.md 结构规范(有 frontmatter、无越权指令)。

## 6. 安全边界

Skill 本质是 prompt,市场内容属**不可信输入**:

1. **预览渲染按纯文本/受控 Markdown**:不启用原始 HTML,不执行任何脚本
2. **收录审核**:新 skill 必须走 PR 人工 merge;索引只做展示,不执行索引内容中的指令
3. **注入扫描**(adapt.mjs 启发式):检查 SKILL.md 及 references 中是否包含"忽略之前指令 / exfiltrate / 调用未授权工具 / 隐藏执行"类模式;命中即标记 `flagged`,PR 中要求人工说明
4. **运行时隔离不变**:安装后的 skill 走现有 `AgentScopedBackend` 按 `boundSkillIds` 过滤、`allowedTools` 白名单,与手工导入的 skill 同等权限,无额外提权
5. **完整性**:index.json 中每个 zip 带 sha256,应用端下载后校验

## 7. 里程碑

| 阶段 | 内容 | 产出 |
|---|---|---|
| M1-a | 市场仓库脚手架 + 本地试跑 fetch→adapt→index | sapere-market 仓库可推送 |
| M1-b | Action 上线,sepia 打通端到端,首条 index + Release 产出 | index.json 可被应用拉取 |
| M1-c | 应用端 MarketService + IPC + 市场 tab(MVP) | 应用内浏览/预览/安装可用 |
| M1-d | 更新检测(版本对比徽标)+ 收录扩充到 5–10 个 | 可持续运营 |

## 8. 开放问题

- Release 通道用固定 tag(如 `market` 持续滚动)还是按日期 tag?倾向固定 tag + 每个资产带版本号,应用端按资产名取
- 是否需要给市场 skill 加"官方认证"标(如来自 anthropics/skills)以示区分?
- PAT 配置入口放设置页哪个 section,还是 MVP 直接不做?
