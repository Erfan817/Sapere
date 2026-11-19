---
name: Sapere Desktop Workspace
colors:
  background: '#141923'
  surface: '#1f2837'
  surface-container: '#1a2130'
  surface-container-low: '#273244'
  outline: '#39465b'
  on-surface: '#edf1f7'
  on-surface-variant: '#b9c4d3'
  on-surface-secondary: '#a9b6c8'
  primary: '#8fdfcb'
  on-primary: '#142e29'
  primary-container: '#293f46'
  on-primary-container: '#8fdfcb'
  error: '#f0a39a'
typography:
  headline: { fontFamily: 'Segoe UI Variable, Segoe UI, Microsoft YaHei, sans-serif', fontSize: 26px, fontWeight: 600, lineHeight: 38px }
  body: { fontFamily: 'Segoe UI Variable, Segoe UI, Microsoft YaHei, sans-serif', fontSize: 14px, fontWeight: 400, lineHeight: 26px }
  label: { fontFamily: 'Segoe UI Variable, Segoe UI, Microsoft YaHei, sans-serif', fontSize: 12px, fontWeight: 500, lineHeight: 20px }
  editor: { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: 16px, fontWeight: 400, lineHeight: 31px }
---

# Design System: Sapere · 致知

## 1. Visual Theme & Atmosphere

Sapere 是面向学习、工作与创作的本地桌面工作台。默认深色以蓝灰表面分层，青绿色标记交互位置。浅色版使用冷灰白表面，苔绿保留偏暖的阅读环境。跟随系统在深黑与浅色间即时切换。

## 2. Color Palette & Roles

| 角色 | 深黑 | 浅色 | 苔绿 |
| --- | --- | --- | --- |
| 窗口与图标栏 | `#141923` | `#f2f4f7` | `#f2f4ef` |
| 资源导航 | `#1a2130` | `#e8edf2` | `#e9ede3` |
| 主表面 | `#1f2837` | `#fbfcfe` | `#ffffff` |
| 卡片与浮层 | `#273244` | `#f1f4f8` | `#f6f8f3` |
| 主文字 | `#edf1f7` | `#203141` | `#283329` |
| 辅助文字 | `#a9b6c8` | `#536579` | `#5e6b58` |
| 主操作 | `#8fdfcb` | `#175d56` | `#4c6340` |
| 当前项底色 | `#293f46` | `#d7eae6` | `#dce6d2` |
| 分隔边框 | `#39465b` | `#cfd9e2` | `#d5dccf` |

主色标识当前页面、工具选择、保存和发送。颜色值由 `desktop.css` 和 `style.css` 中的主题变量管理。标题栏保持深色，以统一 Windows 原生窗口按钮的符号对比度。

## 3. Typography Rules

使用 Windows 本地无衬线字体 `Segoe UI Variable` / `Segoe UI` / `Microsoft YaHei`。中文正文 16 px，行高 1.95。助手回答 14 px，行高 1.9。主要控制 12–13 px，辅助文字 10–11 px。导航、编辑器与对话字号支持 0.92、1、1.08 倍缩放。

通过字重和间距区分层级，避免英文装饰眉题和 8 px 细字。数字、快捷键等可使用 `Consolas`；导航、标题与正文均不使用衬线字体。短窗口适当减少留白，保留输入区和可见焦点。

## 4. Component Stylings

- **按钮**：6 px 圆角，悬停与键盘焦点可见。主操作使用当前主题的强调色。图标按钮有可访问名称和原生 title 提示。
- **面板**：12 px 圆角、细边框、平面分区；主正文最亮，辅助区使用弱色面。避免嵌套多层带阴影卡片。
- **导航**：58 px 图标栏提供首页、文档、对话、场景工具、设置和主题。资源导航默认 260 px，空间分组可折叠。设置使用页内分区导航。
- **页签**：共享 Tabs 组件；方向键切换、Home/End 定位，只有选中项进入顺序 Tab 焦点。
- **工具**：两列紧凑图标文字按钮，支持搜索、按下状态、选中工具标签。点击将问题填入输入区并聚焦；不会直接发送。
- **输入框**：问题、当前文档附加、模型入口和发送处于同一个容器；Ctrl Enter 发送，中文组合输入不触发快捷发送。取消工具选择保留问题文字。
- **加载与空态**：文档加载使用对应内容宽度的骨架行；工具、回答无结果时明确下一步。回答区跟随新内容，用户向上滚动后停止强制跟随。
- **审阅**：选择文字、准备修改、确认应用三个步骤；候选中显示原文与新文，接受后明确另行保存。对话视图提供返回文档入口。
- **设置**：两列模型服务卡片，窄窗口一列；主题缩略图表现导航、正文和辅助区。模型弹窗 Escape 关闭后恢复触发按钮焦点。

## 5. Layout Principles

窗口初始 1280 × 800，最小 960 × 600。Windows 标题栏 40 px，页头 50 px，状态栏 28 px。资源导航可调 180–360 px，收起后保留 6 px 入口。辅助面板默认关闭，宽窗展开时可调 304–440 px，1240 px 以下按需覆盖。Ctrl Shift F 进入专注模式，Escape 恢复。设置容器最大 1152 px，编辑与对话阅读容器最大 856 px（含内边距）。

布局偏好保存到本机 localStorage，包含两侧开关和宽度；不储存正文、密钥或会话。调整分隔条支持拖动、方向键、Home/End 和双击恢复默认。编辑器在容器尺寸变化时重算，保持正文实例和输入。

基础间距为 4 px，常用 8、12、16、20、24、32 px。阅读和回答独立滚动，输入固定在底部。设置页面主内容单独滚动。该交付面向现有桌面最小窗口，不宣称移动端验收。

## 6. Motion & Interaction

使用轻微颜色变化和按下反馈；不让空态图标永久旋转、漂浮或闪烁。尊重 `prefers-reduced-motion`，高对比模式对当前项补充轮廓。保持真实反馈：保存成功以业务库返回为准，生成状态以来自模型事件为准。

## 7. Design System Notes for Stitch Generation

面向后续 Stitch 生成的页面简报见 `prompts/workspace-refinement.md`。先在远端建立本规范对应设计系统，再提交仅包含内容、布局和交互的页面提示词。当前未创建远端 project，不填写伪造 projectId、screenId 或同步时间。渲染图片只能来源于实际本地 Electron 截图。
