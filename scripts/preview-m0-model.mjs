// Launch through .claude/launch.json: run the model/cloud acceptance flow,
// then serve its report and screenshots in the Browser pane.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

let artifacts
let failed = false
const allowed = new Set(['report.json', '01-model-config.png', '02-connection-error.png', '03-local-only-status.png', 'failure.png'])
const server = http.createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1)
    if (!name) {
      const status = !artifacts ? '检查运行中' : failed ? '检查失败，请查看报告' : '检查通过'
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sapere 模型与云依赖检查</title><style>body{font:16px system-ui;line-height:1.7;background:#f5f5f5;color:#151918;margin:24px}img{display:block;width:100%;max-width:1280px;border:1px solid #ddd;margin:16px 0}a{color:inherit}</style><h1>Sapere 模型与云依赖检查</h1><p>${status}</p>${artifacts ? '<p><a href="report.json">查看真实桌面检查报告</a></p>' + (failed ? '<img src="failure.png" alt="失败时桌面截图">' : '<h2>本地模型配置</h2><img src="01-model-config.png" alt="无账号配置本地模型"><h2>连接失败的本地提示</h2><img src="02-connection-error.png" alt="连接关闭端口时的失败提示"><h2>仅本地与开发版状态</h2><img src="03-local-only-status.png" alt="账号与更新状态">') : '<p>脚本完成后刷新可查看报告和截图。</p>'}</html>`)
      return
    }
    if (!artifacts || !allowed.has(name)) { res.writeHead(404).end(); return }
    const body = await fs.readFile(path.join(artifacts, name))
    res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json; charset=utf-8' : 'image/png')
    res.end(body)
  } catch { res.writeHead(404).end('Artifact unavailable') }
})
server.listen(1239, '127.0.0.1', () => console.log('M0 model/cloud proof server ready on 1239'))
try {
  const result = await import('./m0-model-cloud-check.mjs')
  artifacts = result.run
  failed = !result.report.success
  process.exitCode = 0
  console.log(failed ? 'M0_MODEL_PROOF_FAILED' : 'M0_MODEL_PROOF_READY', artifacts)
} catch (error) {
  failed = true
  console.error('M0_MODEL_PROOF_FAILED', error)
}
