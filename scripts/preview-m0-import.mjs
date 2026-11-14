// Launch through .claude/launch.json: run the real desktop acceptance flow,
// then expose only its report and screenshots in the Browser pane.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

let artifacts
let failed = false
const allowed = new Set(['report.json', '01-imported.png', '02-after-restart.png', '03-import-errors.png', 'failure.png'])
const server = http.createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1)
    if (!name) {
      const status = !artifacts ? '验收运行中' : failed ? '验收失败，请查看报告' : '验收通过'
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sapere 本地资料导入验收</title><style>body{font:16px system-ui;line-height:1.7;background:#f5f5f5;color:#151918;margin:24px}img{display:block;width:100%;max-width:1280px;border:1px solid #ddd;margin:16px 0}a{color:inherit}</style><h1>Sapere 本地资料导入验收</h1><p>${status}</p>${artifacts ? '<p><a href="report.json">查看真实桌面验收报告</a></p>' + (failed ? '<img src="failure.png" alt="失败时桌面截图">' : '<h2>导入与阅读</h2><img src="01-imported.png" alt="导入后的真实桌面"><h2>完整退出再启动后</h2><img src="02-after-restart.png" alt="重启后恢复的真实桌面"><h2>冲突保护与失败提示</h2><img src="03-import-errors.png" alt="同名文件保留及来源失效提示">') : '<p>脚本完成后刷新可查看报告和截图。</p>'}</html>`)
      return
    }
    if (!artifacts || !allowed.has(name)) { res.writeHead(404).end(); return }
    const body = await fs.readFile(path.join(artifacts, name))
    res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json; charset=utf-8' : 'image/png')
    res.end(body)
  } catch { res.writeHead(404).end('Artifact unavailable') }
})
server.listen(1238, '127.0.0.1', () => console.log('M0 import proof server ready on 1238'))
try {
  const result = await import('./m0-document-import.mjs')
  artifacts = result.run
  failed = !result.report.success
  // Keep the proof server alive even when acceptance fails.
  process.exitCode = 0
  console.log(failed ? 'M0_IMPORT_PROOF_FAILED' : 'M0_IMPORT_PROOF_READY', artifacts)
} catch (error) {
  failed = true
  console.error('M0_IMPORT_PROOF_FAILED', error)
}
