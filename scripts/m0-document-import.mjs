import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'm0-import')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const workspace = path.join(run, '中文资料工作区')
const source = path.join(run, '外部导入资料')
const userData = path.join(run, 'user-data')
await fs.mkdir(workspace)
await fs.mkdir(source)
const fixtures = [
  { name: '中文学习资料.txt', content: 'Sapere 本地资料验收\n\n中文、English 与符号 ✅\n资料应复制进独立工作区，重启后继续阅读。\n', selector: 'pre' },
  { name: '学习步骤与记录.md', content: '# 本地资料学习步骤\n\n这是一份离线 Markdown 资料。\n\n- 导入自己的资料\n- 阅读并留下思考\n\n```js\nconst answer = 42\n```\n', selector: '.markdown-content', heading: '本地资料学习步骤' },
]
for (const item of fixtures) {
  item.sourcePath = path.join(source, item.name)
  item.sha256 = createHash('sha256').update(item.content).digest('hex')
  await fs.writeFile(item.sourcePath, item.content)
}
const env = { ...process.env, SAPERE_DEV_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL
export const report = { success: false, run, workspace, userData, fixtures, launches: [], errors: [], rendererNetwork: [], checks: [] }
let app
let page
let phase
async function launch(name) {
  phase = name
  app = await electron.launch({ args: [root], cwd: root, env, timeout: 60_000 })
  page = await app.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => report.errors.push({ phase: name, message: error.message }))
  page.on('request', request => {
    if (/^https?:/.test(request.url())) report.rendererNetwork.push({ phase: name, url: request.url() })
  })
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => !!window.electronAPI?.workspace)
  const runtime = await app.evaluate(({ app }) => ({ userData: app.getPath('userData'), pid: process.pid, versions: process.versions }))
  assert.equal(path.resolve(runtime.userData), userData)
  report.launches.push({ phase: name, ...runtime })
}
async function close() { await app.close(); app = null }
async function activeWorkspace() {
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
  return page.evaluate(() => window.electronAPI.workspace.list())
}
async function shot(name) { await page.screenshot({ path: path.join(run, name) }) }
async function verifyFiles() {
  const status = await page.evaluate(() => window.electronAPI.workdir.getStatus())
  assert.equal(path.resolve(status.rootPath), workspace)
  assert.equal(path.resolve(status.docsPath), path.join(workspace, 'docs'))
  report.workdir = status
  const listing = await page.evaluate(dir => window.electronAPI.listDir(dir), status.docsPath)
  assert.equal(listing.success, true)
  assert.deepEqual(listing.data.filter(item => item.isFile).map(item => item.name).sort(), fixtures.map(item => item.name).sort())
  for (const item of fixtures) {
    const dest = path.join(status.docsPath, item.name)
    const bytes = await fs.readFile(dest)
    assert.equal(bytes.toString('utf8'), item.content)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256)
    const ipcRead = await page.evaluate(file => window.electronAPI.readFile(file), dest)
    assert.equal(ipcRead.success, true)
    assert.equal(ipcRead.data, item.content)
    item.destination = dest
  }
}
async function preview(item) {
  const card = page.locator('.file-card').filter({ has: page.locator(`span[title="${item.name}"]`) })
  await card.waitFor()
  await card.hover()
  await card.locator('button').filter({ hasText: /^\s*预览\s*$/ }).click()
  await page.locator(item.selector).waitFor()
  if (item.heading) {
    await page.locator(item.selector).getByRole('heading', { name: item.heading, exact: true }).waitFor()
    assert.ok((await page.locator(item.selector).innerText()).includes('const answer = 42'))
  } else {
    assert.equal(await page.locator(item.selector).textContent(), item.content)
  }
  const body = await page.locator('body').innerText()
  assert.ok(body.includes(item.name))
  assert.ok(body.replaceAll('\\', '/').includes(item.destination.replaceAll('\\', '/')))
}
try {
  await launch('create-workspace')
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  // Only the native OS picker is adapted; the rest uses the real UI and IPC.
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 资料验收工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  report.createdState = await page.evaluate(() => window.electronAPI.workspace.list())
  assert.ok(report.createdState.pendingWorkspaceId)
  await close()

  await launch('import-and-read')
  report.activeState = await activeWorkspace()
  assert.equal(report.activeState.activeWorkspaceId, report.createdState.pendingWorkspaceId)
  await page.evaluate(() => { location.hash = '/docs-manage' })
  await page.locator('button.doc-toolbar-action').filter({ hasText: /^\s*上传\s*$/ }).click()
  // Exercise cancellation first: the upload action must stay unavailable.
  await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }) })
  await page.getByText('点击选择或拖放文件到这里', { exact: true }).click()
  const emptyUpload = page.locator('.ms-modal-card button').filter({ hasText: /^\s*上传\s*$/ })
  await emptyUpload.waitFor()
  assert.equal(await emptyUpload.isEnabled(), false)
  report.checks.push('Canceling native file selection does not enable upload')
  await app.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths })
  }, fixtures.map(item => item.sourcePath))
  await page.getByText('点击选择或拖放文件到这里', { exact: true }).click()
  await page.locator('.ms-modal-card button').filter({ hasText: /^\s*上传 2 个文件\s*$/ }).click()
  await page.locator('.file-card').filter({ has: page.locator(`span[title="${fixtures[1].name}"]`) }).waitFor()
  await verifyFiles()
  await preview(fixtures[0])
  await page.getByTitle('关闭预览', { exact: true }).click()
  await preview(fixtures[1])
  await shot('01-imported.png')
  for (const item of fixtures) assert.equal(await fs.readFile(item.sourcePath, 'utf8'), item.content)
  report.checks.push('Two Chinese-named TXT/Markdown files imported through UI, original source preserved, file bytes and IPC readback match')

  await page.getByTitle('关闭预览', { exact: true }).click()
  const conflictsDir = path.join(run, '同名冲突来源')
  await fs.mkdir(conflictsDir)
  const conflictingPath = path.join(conflictsDir, fixtures[0].name)
  const missingPath = path.join(source, '选择后被移除的资料.txt')
  await fs.writeFile(conflictingPath, '此内容不能覆盖工作区原资料')
  await fs.writeFile(missingPath, '选择时存在，复制前已移除')
  await app.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths })
  }, [conflictingPath, missingPath])
  await page.locator('button.doc-toolbar-action').filter({ hasText: /^\s*上传\s*$/ }).click()
  await page.getByText('点击选择或拖放文件到这里', { exact: true }).click()
  await page.locator('.ms-modal-card').getByText('选择后被移除的资料.txt', { exact: true }).waitFor()
  await fs.unlink(missingPath)
  await page.locator('.ms-modal-card button').filter({ hasText: /^\s*上传 2 个文件\s*$/ }).click()
  await page.getByText(`未导入同名文件，已保留原文件：${fixtures[0].name}`, { exact: true }).waitFor()
  await page.getByText('导入失败：选择后被移除的资料.txt。请检查源文件是否存在以及目录读写权限后重试。', { exact: true }).waitFor()
  await verifyFiles()
  await shot('03-import-errors.png')
  report.checks.push('Conflicting filename rejected without overwriting existing bytes; missing source reports visible import error and creates no phantom file')
  await close()
  // The source is disposable test data. Removing it proves the workspace owns a copy.
  for (const item of fixtures) await fs.unlink(item.sourcePath)

  await launch('reopen-without-source')
  report.reopenedState = await activeWorkspace()
  assert.equal(report.reopenedState.activeWorkspaceId, report.activeState.activeWorkspaceId)
  assert.equal(report.reopenedState.pendingWorkspaceId, null)
  await page.evaluate(() => { location.hash = '/docs-manage' })
  await verifyFiles()
  await preview(fixtures[1])
  await page.getByTitle('关闭预览', { exact: true }).click()
  await preview(fixtures[0])
  await shot('02-after-restart.png')
  await close()
  for (const item of fixtures) {
    assert.equal(createHash('sha256').update(await fs.readFile(item.destination)).digest('hex'), item.sha256)
    await assert.rejects(fs.access(item.sourcePath), { code: 'ENOENT' })
  }
  assert.equal(new Set(report.launches.map(item => item.pid)).size, 3)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.rendererNetwork, [])
  report.checks.push('Three distinct processes; source files removed before final launch, workspace copies still listed and previewed with unchanged hashes')
  report.success = true
  console.log('M0_IMPORT_PASSED', run)
} catch (error) {
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await shot('failure.png').catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
  }
  process.exitCode = 1
  console.error('M0_IMPORT_FAILED', error)
} finally {
  if (app) await close().catch(() => {})
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_IMPORT_REPORT', path.join(run, 'report.json'))
}
