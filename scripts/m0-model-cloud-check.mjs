import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'm0-model-cloud')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const userData = path.join(run, 'user-data')
const workspace = path.join(run, '中文模型工作区')
await fs.mkdir(workspace)
const env = { ...process.env, SAPERE_DEV_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL

// A local blackhole proxy records every external request Chromium would make.
// Loopback stays on the implicit bypass list, so local gateway and dead-port tests stay local.
const proxyHits = []
const proxy = http.createServer((request, response) => {
  proxyHits.push({ method: request.method, url: request.url })
  response.writeHead(502).end()
})
proxy.on('connect', (request, socket) => {
  proxyHits.push({ method: 'CONNECT', url: request.url })
  socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
})
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve))
const proxyPort = proxy.address().port

export const report = {
  success: false, run, workspace, userData, proxyPort,
  phases: [], externalRequests: [], blockedFetch: [], errors: [], checks: [],
}
let app
let page
let phase
async function launch(name) {
  phase = name
  app = await electron.launch({
    args: [`--proxy-server=http://127.0.0.1:${proxyPort}`, root],
    cwd: root,
    env,
    timeout: 60_000,
  })
  page = await app.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => report.errors.push({ phase: name, message: error.message }))
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => !!window.electronAPI?.workspace)
  // Record Chromium-level requests and block Node-level external fetch after startup.
  await app.evaluate(({ session }) => {
    globalThis.__sapereBlockedFetch = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || String(input)
      if (!/^https?:\/\//i.test(url) || /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(url)) {
        return originalFetch(input, init)
      }
      globalThis.__sapereBlockedFetch.push(url)
      throw new Error('M0 offline check blocked an external request')
    }
    globalThis.__sapereWebRequests = []
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      globalThis.__sapereWebRequests.push(details.url)
      callback({})
    })
  })
  report.phases.push({ phase: name, pid: (await app.evaluate(() => process.pid)) })
}
async function close() { await app.close(); app = null }
async function shot(name) { await page.screenshot({ path: path.join(run, name) }) }
async function activeWorkspace() {
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
}
async function chromeRequests() {
  return app.evaluate(() => globalThis.__sapereWebRequests.filter(url => !/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(url)))
}
async function blockedFetch() {
  return app.evaluate(() => globalThis.__sapereBlockedFetch.slice())
}
try {
  // ── Phase 1: isolated workspace, as a first-time user without an account ──
  await launch('create-workspace')
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 模型云依赖工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  // Positive control: the detectors must see a deliberate blocked attempt.
  proxyHits.length = 0
  await page.evaluate(() => fetch('https://example.invalid/m0-control').catch(() => 'blocked'))
  await app.evaluate(async () => { try { await fetch('https://example.invalid/m0-control') } catch { /* expected */ } })
  const controlChromium = await chromeRequests()
  const controlNode = await blockedFetch()
  assert.ok(controlChromium.some(url => url.includes('example.invalid')), 'Chromium request detector must observe the control request')
  assert.ok(controlNode.some(url => url.includes('example.invalid')), 'Main-process fetch detector must observe the control request')
  assert.ok(proxyHits.length >= 1, 'Blackhole proxy must record the control connection')
  report.checks.push('External request detectors verified with a blocked control request')
  await close()

  // ── Phase 2: no account, external network blocked, configure a local model ──
  proxyHits.length = 0
  await launch('verify-without-account')
  await activeWorkspace()
  await page.evaluate(() => { location.hash = '/settings/models' })
  await page.getByText('模型服务商列表', { exact: true }).waitFor()
  await page.getByRole('button').filter({ hasText: 'Ollama' }).first().click()
  const keyInput = page.locator('input[placeholder="本地服务可填写任意值，例如 ollama"]')
  await keyInput.waitFor()
  await keyInput.fill('local-placeholder-key')
  const baseUrlInput = page.locator('div.rounded-xl').filter({ hasText: 'Base URL' }).locator('input').last()
  await baseUrlInput.fill('http://127.0.0.1:9/v1')
  await page.waitForTimeout(2200)
  const savedProviders = await page.evaluate(async () => {
    const value = await window.electronAPI.db.settings.get('providers')
    return typeof value === 'string' ? JSON.parse(value) : value
  })
  const ollama = savedProviders.find(item => item.id === 'custom')
  assert.equal(ollama.apiKey, 'local-placeholder-key')
  assert.equal(ollama.baseUrl, 'http://127.0.0.1:9/v1')
  assert.equal(await page.getByText('请填写 API Key 后即可使用全部功能', { exact: true }).count(), 0)
  report.providerConfig = { id: ollama.id, baseUrl: ollama.baseUrl, apiKey: '[local placeholder]' }
  await shot('01-model-config.png')

  // The connection test targets a closed loopback port; no provider is contacted externally.
  await page.getByText('全部启用', { exact: true }).click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: '测试连接' }).click()
  await page.getByText('测试模型连接', { exact: true }).waitFor()
  await page.getByRole('button', { name: '开始测试' }).click()
  await page.getByText('连接失败', { exact: true }).waitFor({ timeout: 30_000 })
  const failureText = await page.locator('.ms-modal-card').innerText()
  assert.ok(/ECONNREFUSED|fetch failed|连接|refused/i.test(failureText))
  await shot('02-connection-error.png')
  await page.getByRole('button', { name: '关闭', exact: true }).last().click()
  report.checks.push('Local provider config saved without an account; connection failure on a closed loopback port is reported in the UI')

  // Account, guide, gateway and update pages must work and stay account-free/offline.
  await page.evaluate(() => { location.hash = '/settings/account' })
  await page.getByText('当前不需要 Sapere 账号，也没有已开通的官方会员、订阅或充值服务。你的本地资料与模型配置可以在设置中管理。', { exact: true }).waitFor()
  await page.evaluate(() => { location.hash = '/settings/guide' })
  await page.getByText('为 Sapere 接入大语言模型', { exact: false }).first().waitFor()
  await page.evaluate(() => { location.hash = '/settings/local-gateway' })
  await page.getByText('Sapere 网关服务', { exact: false }).first().waitFor()
  await page.evaluate(() => { location.hash = '/settings/about' })
  await page.getByRole('button', { name: '检查更新' }).click()
  await page.getByText('Sapere 当前为本地开发版，尚未启用安装包自动更新。请在项目仓库查看进展。', { exact: true }).first().waitFor()
  await shot('03-local-only-status.png')
  report.checks.push('Account page states no Sapere account is needed; local gateway and development update status render offline')

  const external = await chromeRequests()
  const nodeBlocked = await blockedFetch()
  report.externalRequests = external
  report.blockedFetch = nodeBlocked
  report.proxyHits = proxyHits
  assert.deepEqual(external, [], 'No external Chromium requests expected')
  assert.deepEqual(nodeBlocked, [], 'No external main-process fetch expected')
  assert.deepEqual(proxyHits, [], 'No external proxy connections expected')
  assert.deepEqual(report.errors, [])
  report.checks.push('No external HTTP(S) request, proxy connection or page error during startup, model setup, connection test and settings navigation')
  await close()
  report.success = true
  console.log('M0_MODEL_CLOUD_PASSED', run)
} catch (error) {
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await shot('failure.png').catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
    report.failure.chromeRequests = await chromeRequests().catch(() => [])
    report.failure.blockedFetch = await blockedFetch().catch(() => [])
  }
  report.proxyHits = proxyHits
  process.exitCode = 1
  console.error('M0_MODEL_CLOUD_FAILED', error)
} finally {
  if (app) await close().catch(() => {})
  proxy.close()
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_MODEL_CLOUD_REPORT', path.join(run, 'report.json'))
}
