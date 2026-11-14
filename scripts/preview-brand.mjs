// Start through .claude/launch.json. Verify the built desktop app with isolated data,
// then serve screenshots and the report for the Browser pane.
import { _electron as electron } from 'playwright-core'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'brand-verification')
await fs.mkdir(base, { recursive: true })
const run = await fs.mkdtemp(path.join(base, 'run-'))
const report = { success: false, checks: [], errors: [] }
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'
    if (!['index.html', 'report.json', 'light.png', 'dark.png', 'landing.png', 'login.png', 'dashboard.png', 'project.png', 'guide.png'].includes(name)) {
      res.writeHead(404).end(); return
    }
    const body = await fs.readFile(path.join(run, name))
    res.setHeader('Content-Type', name.endsWith('.png') ? 'image/png' : name.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8')
    res.end(body)
  } catch { res.writeHead(404).end('Verification in progress') }
})
server.listen(1237, '127.0.0.1', () => console.log('Brand proof server ready on 1237'))
let desktop
try {
  const env = { ...process.env, SAPERE_DEV_USER_DATA: path.join(run, 'user-data') }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VITE_DEV_SERVER_URL
  desktop = await electron.launch({ args: [root], cwd: root, env, timeout: 60_000 })
  const page = await desktop.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => report.errors.push(error.message))
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  // Wait for asynchronous startup initialization before navigating away.
  await page.getByText('欢迎使用 Sapere · 致知', { exact: true }).waitFor({ timeout: 60_000 })
  await page.getByRole('button', { name: '稍后再说', exact: true }).click({ timeout: 60_000 })
  await page.locator('.ms-modal-overlay').waitFor({ state: 'hidden' })
  await page.evaluate(() => { location.hash = '/settings/about' })
  await page.getByRole('heading', { name: 'Sapere · 致知', exact: true }).waitFor()
  assert.equal(await page.title(), 'Sapere · 致知')
  // Toggle through the actual UI, leaving application theme state in this isolated run only.
  if (await page.locator('button:has(.ri-sun-line)').count()) {
    await page.locator('button:has(.ri-sun-line)').click()
  }
  await page.waitForFunction(async () => {
    const images = [...document.querySelectorAll('img.brand-logo')]
    if (images.length !== 2 || images.some(i => !i.complete || !i.naturalWidth)) return false
    const sources = await Promise.all(images.map(i => fetch(i.src).then(r => r.text())))
    return sources.every(s => s.includes('#151918'))
  })
  report.checks.push('Light theme shows two loaded black logos')
  await page.screenshot({ path: path.join(run, 'light.png') })
  await page.locator('button:has(.ri-moon-line)').click()
  await page.waitForFunction(async () => {
    const images = [...document.querySelectorAll('img.brand-logo')]
    if (images.length !== 2 || images.some(i => !i.complete || !i.naturalWidth)) return false
    const sources = await Promise.all(images.map(i => fetch(i.src).then(r => r.text())))
    return sources.every(s => /#ffffff/i.test(s))
  })
  await page.screenshot({ path: path.join(run, 'dark.png') })
  report.checks.push('UI theme toggle swaps both titlebar and About logos to white')
  const runtime = await desktop.evaluate(({ BrowserWindow, nativeImage }, paths) => {
    const publicRoot = process.env.VITE_PUBLIC
    const icon = nativeImage.createFromPath(publicRoot + '/logo.png')
    const built = nativeImage.createFromPath(paths.buildIcon)
    const ico = nativeImage.createFromPath(publicRoot + '/logo.ico')
    return {
      title: BrowserWindow.getAllWindows()[0].getTitle(),
      publicRoot,
      iconSize: icon.getSize(),
      iconMatchesBuild: icon.toPNG().equals(built.toPNG()),
      icoExists: !ico.isEmpty(),
    }
  }, { buildIcon: path.join(root, 'build/icon.png') })
  assert.equal(runtime.title, 'Sapere · 致知')
  assert.equal(runtime.iconMatchesBuild, true)
  assert.equal(runtime.icoExists, true)
  report.checks.push(runtime)
  await page.evaluate(() => { location.hash = '/landing' })
  await page.locator('.nav__name').filter({ hasText: 'Sapere' }).waitFor()
  await page.locator('.nav__logo').evaluate(i => i.decode())
  await page.screenshot({ path: path.join(run, 'landing.png') })
  report.checks.push('Landing navbar and footer use Sapere branding')
  await page.evaluate(() => { location.hash = '/login' })
  await page.getByRole('heading', { name: 'Sapere · 致知', exact: true }).waitFor()
  await page.locator('img.brand-logo').evaluateAll(images => Promise.all(images.map(i => i.decode())))
  await page.screenshot({ path: path.join(run, 'login.png') })
  report.checks.push('Login brand image loads in the actual desktop app')
  const upstreamRequests = []
  page.on('request', request => {
    if (/reviva\.cn|github\.com\/repos\/mingchen666|pan\.quark\.cn/.test(request.url())) upstreamRequests.push(request.url())
  })
  const routes = [
    ['/', '#dashboard-hero-title', 'Sapere', 'dashboard.png'],
    ['/settings/author', 'h1', 'Sapere · 致知', 'project.png'],
    ['/settings/guide', 'body', '为 Sapere 接入大语言模型', 'guide.png'],
    ['/settings/about', 'h2', 'Sapere · 致知'],
    ['/settings/models', 'body', '第三方托管服务（兼容）'],
    ['/settings/account', 'h1', 'Sapere · 致知本地工作空间'],
    ['/profile', 'h2', 'Sapere 本地学习空间'],
    ['/legal/user-agreement', 'h1', 'Sapere · 致知使用说明'],
    ['/legal/privacy-policy', 'h1', 'Sapere · 致知数据与隐私说明'],
    ['/settings/local-gateway', 'body', 'Sapere 网关服务'],
  ]
  for (const [route, selector, expected, filename] of routes) {
    await page.evaluate(value => { location.hash = value }, route)
    await page.locator(selector).filter({ hasText: expected }).first().waitFor({ timeout: 30_000 })
    const text = await page.locator('body').innerText()
    assert.ok(!/reviva\.cn|1131466242|1906837163|Reviva Desktop|Reviva 官方服务|欢迎使用 Reviva/.test(text), route + ': obsolete identity visible')
    if (!['/settings/author', '/legal/user-agreement'].includes(route)) {
      assert.ok(!/\bReviva\b/.test(text), route + ': old product branding visible')
    }
    if (route === '/settings/author') {
      const color = await page.getByRole('button', { name: '项目仓库', exact: true }).evaluate(el => getComputedStyle(el).color)
      assert.notEqual(color, 'rgb(0, 0, 0)', 'Project actions must remain readable on dark backgrounds')
    }
    if (filename) {
      if (route === '/') await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.hero-copy')).opacity) > 0.99)
      await page.screenshot({ path: path.join(run, filename) })
    }
    report.checks.push({ route, expected, obsoleteBranding: false })
  }
  await page.evaluate(() => { location.hash = '/settings/about' })
  await page.getByRole('heading', { name: 'Sapere · 致知', exact: true }).waitFor()
  await page.locator('button').filter({ hasText: '检查更新' }).first().click()
  await page.getByText('Sapere 当前为本地开发版，尚未启用安装包自动更新。请在项目仓库查看进展。', { exact: true }).first().waitFor()
  assert.deepEqual(upstreamRequests, [])
  report.checks.push('Update action explains development status and sends no upstream update requests')
  assert.deepEqual(report.errors, [])
  report.success = true
  console.log('BRAND_VERIFICATION_PASSED', run)
} catch (error) {
  if (desktop) {
    const windows = desktop.windows()
    if (windows[0]) report.pageText = await windows[0].locator('body').innerText().catch(() => '')
  }
  report.failure = { message: error.message, stack: error.stack }
  console.error('BRAND_VERIFICATION_FAILED', error)
} finally {
  if (desktop) await desktop.close().catch(() => {})
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(run, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sapere 桌面品牌验证</title><style>body{font:16px system-ui;background:#f5f5f5;color:#151918;margin:24px}img{width:100%;max-width:1280px;display:block;margin:16px 0;border:1px solid #ddd}a{color:inherit}</style><h1>Sapere · 启页黑白 logo 接入</h1><p>实际 Electron 窗口验证：${report.success ? '通过' : '失败，查看报告'}</p><a href="report.json">验证报告</a><h2>首页</h2><img src="dashboard.png"><h2>关于项目</h2><img src="project.png"><h2>教程</h2><img src="guide.png"><h2>浅色</h2><img src="light.png"><h2>深色</h2><img src="dark.png"><h2>介绍页</h2><img src="landing.png"><h2>登录页</h2><img src="login.png"></html>`)
  console.log('Brand proof files ready:', run)
}
