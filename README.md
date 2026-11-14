<div align="center">

<img src="docs/brand/sapere-logo-kit/svg/sapere-symbol-color.svg" alt="Sapere 致知 · 启页" width="96" />

# Sapere · 致知

**学习，也创作。**

围绕你的资料，把阅读、提问、笔记、练习与写作放进同一个本地 AI 工作台。

本地优先 · 自主配置模型 · 资料与笔记 · 学习与创作

[English](README_EN.md) · [快速开始](#快速开始) · [开发进度](#开发进度) · [问题反馈](https://github.com/Erfan817/Sapere/issues)

</div>

---

## 为什么做 Sapere

自学常常停在“看过”：教程收藏了，概念似乎懂了，过几天却不知道从哪里继续。

Sapere 希望把学习从一次次独立的问答，变成可以接续的过程。你可以围绕自己的资料阅读、提问和记笔记；我们也在逐步建设课程、练习、学习记录与间隔复习，让理解之后有实践，实践之后有反馈，回来时能接着学。

学习也不止于输入。把理解写成笔记、讲义、报告，或一个故事，才算真正留下东西。所以 Sapere 同时是一个写作与创作的工作台：同一份资料，可以拿来提问，也可以拿来写。

**Sapere aude — 敢于求知。** 英文名 Sapere，中文名「致知」。黑白「启页」标志由两张向上展开的页面组成，代表向未知再翻一页。

## 面向怎样的学习与创作

- **学懂资料**：带着教程、文章和项目文档提问，把解释与原始资料放在一起。
- **留下思考**：将理解、疑问与实践结果整理成自己的笔记，保存在本地工作区。
- **动手检验**：通过练习和小项目检查理解，记录完成的过程与依据。
- **写下产出**：把资料与笔记整理成文章、讲义、报告或故事，用写作修订、排版与图示技能检查结构、节奏和表达。
- **过几天继续**：逐步用学习记录与复习安排，衔接下一次学习。

首套计划中的学习内容是 **《从 LLM 到第一个 Agent》**，面向具备基础编程知识的技术自学者。后续再根据实际使用扩展主题。

> 课程、练习记录和间隔复习是建设方向，目前尚未完成交付。现阶段优先打牢桌面运行、资料保存与恢复基础。

## 界面预览

以下截图来自 Windows 本机实际运行的 Sapere，展示当前开发版界面，不代表所有功能已完成验收。

<img src="docs/images/sapere-home.png" alt="Sapere 首页：学习，也创作" width="1120" />

<details>
<summary>查看项目介绍与黑白标志</summary>

<img src="docs/images/sapere-project.png" alt="Sapere 关于项目页，展示项目定位、开发进度和开源来源" width="1120" />

标志源文件、图标和使用规范见 [品牌套件](docs/brand/sapere-logo-kit/README.md)。

</details>

## 开发进度

Sapere 当前处于 **M0：工程与桌面基础验证**。首批验收平台为 Windows 11 x64。

| 方向 | 当前状态 |
| --- | --- |
| 工程与运行 | 已建立 Git 版本基线，固定 Node / pnpm，完成本机开发构建与桌面启动验证 |
| 工作区与笔记 | 已验证独立工作区、中文 Markdown 笔记保存、正常关闭重启与强制终止后的恢复；debounce 内未保存输入仍会丢失 |
| 品牌与界面 | 已接入黑白「启页」标志，统一主要页面、帮助、反馈与导出文案 |
| 资料、问答与创作 | 本地 TXT/Markdown 导入、阅读与重启恢复已验证；问答及其他格式继续配置和验收 |
| 课程与练习 | 计划建设精选学习包、章节阅读和练习提交 |
| 学习记录与复习 | 计划建设持久学习记录、到期队列与间隔复习 |
| 安装与发布 | 已构建 Windows x64 NSIS 安装包，静默安装/卸载与打包后运行检查通过；干净环境、交互式安装与签名未验收；自动更新未启用 |
| 其他平台 | macOS / Linux 尚未完成实际验收 |

首版希望跑通的学习过程是：

**选择学习包 → 阅读与提问 → 提交练习 → 保存记录 → 复习 → 重启后继续。**

完整目标和范围见 [项目立项书](docs/Sapere_致知_项目立项书_v0.2_Reviva二开版.md)，已完成的检查见 [工作区与重启持久化验收](docs/M0_工作区与重启持久化验收.md)。

## 快速开始

当前使用源码运行，推荐先在 Windows 11 x64 开发环境体验。

### 环境

- Node.js **24.16.x**（精确版本见 [.node-version](.node-version)）。
- pnpm **10.34.9**，通过 Corepack 调用。
- Git；如果原生依赖需要源码构建，还需与平台匹配的编译工具链。

### 获取与运行

当前开发内容位于 `chore/m0-startup` 分支，合入默认分支后可直接从 `main` 获取。

```bash
git clone --branch chore/m0-startup https://github.com/Erfan817/Sapere.git
```

```bash
cd Sapere
```

```bash
corepack pnpm install --frozen-lockfile
```

```bash
corepack pnpm dev --host 127.0.0.1 --strictPort
```

开发命令会启动 Vite 并打开 Electron 窗口。仅在浏览器里打开 Vite 地址不包含桌面 IPC 能力，不能代替完整桌面体验。

仅构建应用、不制作安装包：

```bash
corepack pnpm run build:electron
```

首次进入后，按应用中的「新手教程」设置授权工作目录；需要 AI 时，再配置自己的模型服务或本地模型。

开发态应用配置默认位于 `.sapere/dev-user-data`，该目录不提交 Git。SQLite 原生模块必须匹配 Electron 的 ABI，不要用另一套 Node ABI 重建后覆盖运行依赖。环境记录和排障说明见 [开发与版本管理](docs/M0_仓库与版本管理.md)。

## 数据与模型由你选择

资料、笔记和工作区数据优先保存在本机。使用云模型、OCR、语音、搜索或远程工具时，相关内容可能发送至你配置的服务商；本地优先不等于所有能力均离线。

Sapere 当前没有自营账号、充值、订阅或官方云模型服务。模型凭据、费用和数据政策取决于你选择的服务。重要资料请同时备份数据库与工作区文件，不能只备份数据库。

## 技术基础

| 层次 | 当前技术 |
| --- | --- |
| 桌面运行 | Electron |
| 界面 | Vue 3、Vite、Pinia、Naive UI、UnoCSS |
| 本地数据 | SQLite、better-sqlite3、工作区文件 |
| 构建与打包 | pnpm、electron-builder |
| 开发验证 | Node 测试、Playwright Electron 桌面检查 |

技术选型沿用成熟底座，新增工作优先围绕学习流程和数据可靠性展开。运行时升级及安装发行验收仍需分阶段完成。

## 项目资料与反馈

- [项目立项书与首版范围](docs/Sapere_致知_项目立项书_v0.2_Reviva二开版.md)
- [开发环境与版本管理](docs/M0_仓库与版本管理.md)
- [工作区及笔记持久化验收](docs/M0_工作区与重启持久化验收.md)
- [本地资料导入与重启阅读验收](docs/M0_本地资料导入验收.md)
- [模型配置与云依赖检查](docs/M0_模型与云依赖检查.md)
- [Windows 打包验收](docs/M0_Windows打包验收.md)
- [异常退出恢复验收](docs/M0_异常退出恢复验收.md)
- [M0 功能验收矩阵](docs/M0_功能验收矩阵.md)
- [黑白「启页」品牌套件](docs/brand/sapere-logo-kit/README.md)
- [项目品牌接入记录](docs/brand/全项目品牌替换.md)
- [提交问题或建议](https://github.com/Erfan817/Sapere/issues)

目前由 [Erfan817](https://github.com/Erfan817) 维护，主要用于个人自学。反馈时请说明系统、复现步骤和实际结果；不要上传 API Key、密码或私人学习资料。

## 致谢与许可

Sapere 基于 [Reviva](https://github.com/mingchen666/Reviva) 二次开发，感谢原作者及上游贡献者提供桌面工作空间、资料与笔记、Agent / Skills 等基础。我们保留上游历史、作者和来源信息，在此基础上建设自己的学习流程与项目标识。

工程沿用上游 `package.json` 中的 **AGPL-3.0** 声明。原始授权与商业使用说明完整存档于 [上游中文文档](docs/upstream/Reviva-README.md#开源协议与商业授权) 和 [英文文档](docs/upstream/Reviva-README_EN.md)；本项目不授予额外商业授权。第三方代码、技能、字体和图标保留各自权利与许可，公开分发时需按实际授权范围处理。
