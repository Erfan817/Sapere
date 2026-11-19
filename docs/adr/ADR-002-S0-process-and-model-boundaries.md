# ADR-002：S0 进程、编辑与模型边界

日期：2026-11-17。状态：用于 S0 小样，不代表 S1/S3 业务已实现。

同日后续更新：三个独立文档空间、加密模型配置和单次场景助手已补充实现，最新边界与验证见 [界面体验更新](../../docs-sapere/implementation/workspace-experience.md)。下文固定题描述对应原有协议检查路径；场景助手经显式操作发送问题与可选当前文档。

## 通信与保存

Renderer 无 Node；preload 只暴露 request / subscribe；Main 校验主 frame、schema、参数长度和白名单命令。Backend 唯一写 business.sqlite，Agent 唯一写 agent-checkpoints.sqlite，分别经 utilityProcess 的结构化消息通信，不监听内部 HTTP 端口。

草稿采用 SQLite 内单事务：revision 前置条件、revision 历史与当前稿一次提交；Renderer 收到提交确认才显示已保存。异步保存期间的新输入仍标未保存。Backend 失联时编辑器保留输入并显示错误，重新连接后可重试。完整 Markdown 文件镜像/不可变修订文件协议在 S1，不将现有 SQLite 小样夸成已完成该设计。

进程故障不无限自动重启；错误可见，由用户显式重连。请求与启动超时有界；退出先 shutdown，700ms 后强制回收。子进程使用环境变量白名单，不继承 Key、tracing 或 Node 注入参数。utilityProcess 是可信自有代码进程，不是第三方恶意代码沙箱。

## 编辑器与修改

CodeMirror 6 原生文本/选区；候选保留源稿快照及选区，接受前重新校验源稿是否变化；拒绝不写正文；接受前快照可恢复。组合输入期间禁用候选生成/接受，底层 handle 再检查 composing。切换运行页时保留编辑器实例，未保存文字不因切页丢失。关闭未保存页面时触发原生离开阻挡。

当前手动候选用于确定性验证，不冒充模型生成；S0 模型协议单独跑固定工具题。自动化只合成 composition 事件，真人 Windows 拼音/中文 IME 尚待验收。

## 模型网关

Main 读取当前进程提供的 provider 配置，不扫描其他应用凭据；Renderer 只知道“已配置”。模型请求的目标与头由 Main 固定，Agent 不能指定 URL。固定题不含用户草稿，最多 2 模型调用/每次 128 输出 token，0 自动重试/45 秒总期限。LangChain modelCallLimitMiddleware 在调用前限制预算；on_chat_model_stream 转为窄 IPC 事件，实际 add 工具返回为独立事件。工具缺失不标成功；上游用量缺失保持未知。显式取消映射到 Main AbortController；取消后不接受新 delta 或工具结果。

这套链当前不写正式稿，不实现跨进程模型 adapter 或持久化任务/副作用账本；这些属于 S3。当前界面取消保证本地请求与接收停止，不承诺远端停止计费。

远端环境凭据 401 已如实保留状态码；流式成功/工具/取消仅在本地 HTTP 协议夹具完成，不能标 S0-06 真实服务通过。可用凭据准备后运行 `pnpm model:probe` 重新验证。
