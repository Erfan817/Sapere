<div align="center">
<img src="docs/brand/sapere-logo-kit/svg/sapere-symbol-color.svg" alt="Sapere 致知 · 启页" width="112" />

# Sapere · 致知

围绕你的资料，帮助你理解、实践，并记住所学的桌面学习工作空间。

[English](README_EN.md) · [项目仓库](https://github.com/Erfan817/Sapere) · [问题反馈](https://github.com/Erfan817/Sapere/issues)

</div>

Sapere 面向持续自学，希望把资料、笔记、问答、实践和复习组织在同一个本地优先的桌面空间。品牌精神是 **Sapere aude — 敢于求知**。

## 当前状态

项目处于 M0 开发阶段，首批验证环境是 Windows 11 x64。已完成工程基线、桌面启动、独立工作区及笔记重启持久化验证，并接入黑白「启页」标志。课程组织、学习记录与间隔复习仍在规划和实现过程中，不宣称完整学习闭环已经交付。

当前没有完成验收的 Sapere 安装包，也未启用自动更新。请从本仓库查看进度，不使用原项目安装包作为 Sapere 发布。

## 本地开发

使用 Node 24.16.x 和 pnpm 10.34.9，具体环境记录见 [M0 仓库与版本管理](docs/M0_仓库与版本管理.md)。

```bash
corepack pnpm install --frozen-lockfile
```

```bash
corepack pnpm dev --host 127.0.0.1 --strictPort
```

仅构建，不制作安装包：

```bash
corepack pnpm run build:electron
```

开发态数据位于被忽略的 `.sapere/` 目录。SQLite 原生模块按 Electron ABI 构建；不要直接用不同 ABI 的 Node 覆盖运行环境。

## 项目资料

- [项目立项书](docs/Sapere_致知_项目立项书_v0.2_Reviva二开版.md)
- [工作区与笔记持久化验收](docs/M0_工作区与重启持久化验收.md)
- [品牌标志与规范](docs/brand/sapere-logo-kit/README.md)
- [品牌接入记录](docs/brand/项目接入说明.md)

## 本地优先与模型服务

资料、笔记与学习数据优先保存在本机。使用云模型、OCR、语音或远程工具时，相应内容可能发送到配置的服务商。模型需要自行配置，费用与隐私规则由所选服务决定。

当前没有 Sapere 官方账号、充值服务、官方云模型或社群。继承的外部服务入口如需使用，应明确其第三方身份，不代表本项目运营。

## 来源与许可

Sapere 基于 [Reviva](https://github.com/mingchen666/Reviva) 二次开发，保留原作者、历史和来源信息。`package.json` 沿用上游的 AGPL-3.0 声明；原项目 README 的授权原文保存在 [上游文档](docs/upstream/Reviva-README.md#开源协议与商业授权)。本项目没有获得或授予额外的商业授权，不改变上游材料的权利归属。

上游源码、图标及第三方技能的许可和作者声明仍归原作者；Sapere 的界面名称与原创标志用于区分本派生项目。公开分发前按实际授权范围核对相关材料。
