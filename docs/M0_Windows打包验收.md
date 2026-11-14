# M0 Windows 打包验收

日期：2026-11-14。环境：Windows 11 x64；Node 24.16.0；pnpm 10.34.9；Electron 30.5.1。构建源码为提交 `8d3b0fe` 加本轮原子写入修复。

## 结论

**通过：已生成 Windows x64 NSIS 安装包；静默安装、启动与静默卸载均通过，打包后的 `Sapere.exe` 能在隔离数据目录启动、创建工作区并跨重启保存笔记。**

本轮安装到仓库内的隔离目录（不使用系统默认安装位置），未在干净 Windows 环境或交互式安装界面下验证；签名与 SmartScreen 体验仍属于后续验收。

| 项目 | 结果 |
| --- | --- |
| 安装包 | `release/1.5.0/Sapere-Windows-1.5.0-x64-Setup.exe` |
| 大小 | 134,685,387 字节（约 128 MB） |
| SHA-256 | `c838c8a05cc4a20b1321ddd6776227d1c8f247f6fcce25bf147f027b374c1283` |
| 版本 / 产品名 | 1.5.0 / Sapere |
| 签名 | `NotSigned`，未配置代码签名证书 |
| 附带产物 | `latest.yml`、`Sapere-Windows-1.5.0-x64-Setup.exe.blockmap`、`win-unpacked/` |

## 打包内容核验

- `resources/app.asar` 存在，应用从 asar 加载；`app.getAppPath()` 指向该文件。
- `resources/agents/builtin` 与 `resources/builtin-assets/skills` 已随包分发；技能目录 65 项。
- `resources/builtin-assets/bin/officecli/officecli-win-x64.exe` 已按架构复制，arm64 二进制被移除。
- `resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node` 存在，原生模块未打进 asar。
- 安装包与主程序版本信息为 `Sapere` / `1.5.0`，公司字段为 `Erfan817`。

## 安装与卸载验证

证据：`.sapere/m0-install/run-bjm75s/report.json`，`success=true`。

1. 安装前确认本机没有 Sapere 卸载项、桌面/开始菜单快捷方式或目标目录。
2. 使用 `Sapere-Windows-1.5.0-x64-Setup.exe /S /D=<隔离目录>` 静默安装，未出现 UAC 提示。
3. 安装后核对：`Sapere.exe` 与 `Uninstall Sapere.exe` 存在；注册表卸载项 `Sapere 1.5.0` 的 `DisplayVersion` 为 `1.5.0`、`UninstallString` 指向安装目录并带 `/currentuser`；桌面与开始菜单快捷方式均创建；未创建公共桌面快捷方式。
4. 从安装目录启动 `Sapere.exe`，确认 `app.isPackaged=true`、版本 1.5.0、可执行文件路径为安装目录，界面正常加载。
5. 使用 `Uninstall Sapere.exe /S` 静默卸载；核对安装目录、桌面与开始菜单快捷方式、注册表卸载项均被移除，安装目录无残留文件。
6. 卸载后 `%APPDATA%\Reviva` 用户 profile 保留，符合 `deleteAppDataOnUninstall=false` 的配置。

说明：NSIS 未写入 `InstallLocation`，卸载项以 `UninstallString` 为准；本轮安装使用自定义隔离目录，未验证交互式选择目录、覆盖安装与卸载时的 UI。

## 打包后应用验证

证据：`.sapere/m0-packaged/run-P2uWVg/report.json`，`success=true`，三个独立进程 PID 34924、39144、29852，页面错误为空。

1. 使用打包后的 `win-unpacked/Sapere.exe`，不是 Vite 开发服务器。
2. 通过 `SAPERE_USER_DATA` 指向临时目录，确认 `app.isPackaged=true`、`userData` 为隔离路径、应用代码来自 `app.asar`。
3. 首次启动完成引导跳过与工作区创建；第二次启动激活工作区并保存中文笔记；第三次启动恢复同一笔记。
4. 退出后核对工作区 Markdown 文件内容与界面输入一致。
5. 另外以默认打包 profile（`%APPDATA%\Reviva`，保留旧版数据位置）启动一次，确认应用窗口正常加载。

## 本轮修复的打包/运行问题

- **打包工具在 Windows 失败**：electron-builder 24.13.3 通过 Corepack 直接执行 `pnpm.cjs` 重建原生依赖，Windows 报“不是有效的 Win32 应用程序”；其下载的 `winCodeSign` 压缩包含 macOS 符号链接，当前用户没有创建符号链接权限，解压失败。本轮使用独立短路径安装的 electron-builder 26.18.0 完成打包，项目依赖仍为 24.13.3，未修改锁文件。
- **NSIS 路径长度**：`pnpm dlx` 的深层缓存路径导致 NSIS 找不到 include 文件；改用短目录安装打包器后解决。
- **默认 profile 启动崩溃**：`%APPDATA%\Reviva` 所在目录的 `fs.rename` 返回 `EXDEV`，工作区注册文件原子写入失败，应用启动即退出。新增 `electron/atomicFile.js`，在 `EXDEV` 时回退为复制后删除，并用于工作区注册、旧指针与备份状态写入；随后默认 profile 可正常启动。
- **打包态数据隔离**：新增仅打包态使用的 `SAPERE_USER_DATA` 绝对路径覆盖，便于验收与便携式测试；未设置时仍使用兼容的 `Reviva` profile。

## 复现

先构建 renderer / main / preload：

```bash
corepack pnpm run build:electron
```

本轮使用短路径安装的 electron-builder 26 完成打包（示例路径，需与本机实际安装位置一致）：

```bash
PATH="/d/Sapere/.sapere/bin:$PATH" ELECTRON_BUILDER_CACHE="D:/Sapere/.sapere/eb-cache26/" node D:/eb26/node_modules/electron-builder/cli.js --win nsis --x64 -c.npmRebuild=false
```

其中 `.sapere/bin/pnpm.cmd` 只是让打包器找到 Corepack 的 pnpm；`-c.npmRebuild=false` 表示跳过重复原生重建，依赖已由 `postinstall` 的 `electron-builder install-app-deps` 按 Electron ABI 准备。构建完成后可运行：

```bash
node scripts/m0-packaged-smoke.mjs
```

安装与卸载验收会静默安装到 `.sapere/m0-install/app`，启动已安装程序，然后静默卸载并核对文件、快捷方式与注册表：

```bash
node scripts/m0-install-uninstall.mjs
```

脚本读取 `release/1.5.0/win-unpacked`，通过 `SAPERE_USER_DATA` 使用临时 profile，执行三次启动并输出 `M0_PACKAGED_REPORT`。

## 未完成与边界

- 安装与卸载使用静默参数和隔离目录，未验证交互式安装界面、自定义目录选择、覆盖安装/升级、卸载保留文件选项与系统重启后启动；也未在未安装开发工具的干净 Windows 环境验证。
- 安装包未签名，Windows SmartScreen 会提示未知发布者；公开发布前需要确定签名方案与成本。
- 仅构建 x64；配置中仍保留 arm64 目标但本轮未构建、未验证。
- `appId` 仍为 `com.reviva.desktop`，版本仍为 `1.5.0`，自动更新保持关闭；独立安装身份、版本号策略与发布渠道属于 M1/M4。
- 打包态默认 profile 仍位于 `%APPDATA%\Reviva`，用于兼容已有数据；本轮默认 profile 检查留下了空的 `workspaces.json` 与应用缓存，未包含个人工作区。
- 未验证安装包在代理、受限权限、企业策略或非简体中文 Windows 下的行为。
- 打包过程依赖网络下载 Electron、NSIS 与签名工具；本机缓存与环境修复步骤尚未沉淀为项目脚本，需在 M1 决定 electron-builder 升级和构建镜像方案。
