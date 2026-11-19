# Sapere · 致知

Sapere 是面向学习、工作与创作的本地优先 AI 桌面工作台。

## 项目规划

[桌面项目规划 v2.1](docs-sapere/planning-v2/README.md) 是当前开发基线，涵盖产品范围、Agent、桌面与数据架构、界面、IPC 契约和里程碑。

## 开发进度 · 2026-11-19

- S0 已实现 Electron 桌面骨架、独立 Backend 和 Agent 进程、SQLite 文档与修订、LangGraph 磁盘检查点，以及三个独立文档空间和模型配置。
- S0.5 已推进命令注册与一致性检查、IPC 请求信封、模型流启动事件、数据审计字段和视觉令牌。开发版已加入数据库 v4 迁移及升级前备份。
- S0 验证记录显示，类型检查、构建、21 项单元测试和 5 项默认沙箱 Electron 回归通过。真人中文 IME 已获用户确认。`0.1.0-alpha.3` 的 Windows x64 安装包已生成，解包运行通过。
- 真实模型服务本轮返回 401，成功调用待有效配置后复测。独立 Windows 环境的安装与卸载仍待验收。v0.2 工作台闭环按规划推进。

[S0 验证记录](docs-sapere/implementation/S0-validation.md) · [工程约定审计](docs-sapere/implementation/CODEX-BRIEF-AUDIT.md) · [架构决策](docs/adr/)
