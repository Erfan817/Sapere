# Sapere · 致知 — 启页黑白 Logo Kit v1.0

以用户选定的第二轮 B「启页」为基础，按最新偏好采用黑白风格。主黑 `#151918` 与第二轮一致，另备纯黑和白色版本；不使用绿色。

先打开 `presentation/sapere-identity.png` 查看主视觉，再阅读 `使用规范.md`。`index.html` 是本地展示入口，`presentation/mockups.html` 包含六个应用场景。

- `svg/`：单图形、英文、中英、中文、竖版、字标，均含主黑、纯黑和白色版本。正式字标已转曲，不依赖安装字体。
- `png/`：透明 PNG，图形最高 2048 px，应用图标最高 1024 px，组合标志按原比例导出。
- `icons/`：Windows 多尺寸 ICO 与各尺寸 PNG；`web/` 为 favicon、Apple Touch、PWA 图标和接入片段。
- `presentation/`：主视觉、六个应用效果、检查页和演示配置。网站、账号及界面仅为示意。
- `licenses/`：Noto Sans SC 的 OFL 许可。
- `source/`：生成矢量、渲染和校验脚本。
- `validation.json`：尺寸、ICO 帧、透明度、灰度像素和矢量结构的实际校验结果。

主图形：`svg/sapere-symbol-color.svg`，使用第二轮主黑。主标志：`svg/sapere-bilingual-color.svg`。文件名中的 `color` 表示标准主版本，本套件实际为黑白。

Windows 图标：`icons/sapere-app.ico`。已在项目中接入标题栏、系统版本页、登录页、介绍页和应用图标；详见 `../项目接入说明.md`。打包后的实际安装体验尚未验收，未提交 Git。
