import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'm0-persistence')
await fs.mkdir(base, { recursive: true })
const run = await fs.mkdtemp(path.join(base, 'run-'))
const userData = path.join(run, 'user-data')
const workspace = path.join(run, '中文学习工作区')
await fs.mkdir(workspace)
const env = { ...process.env, SAPERE_DEV_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL
const title = 'M0 重启保存验收'
const content = '# 重启后的学习记录\n\n中文内容、English 和符号 ✅\n\n- 工作区独立保存\n- 关闭后重新打开内容一致\n\n```js\nconst answer = 42\n```\n'
const report = { run, workspace, userData, title, content, launches: [], errors: [], checks: [] }
let app
let page
let phase
async function launch(name) {
  phase = name
  app = await electron.launch({ args: [root], cwd: root, env, timeout: 60_000 })
  app.process().stdout?.on('data', data => process.stdout.write(data))
  app.process().stderr?.on('data', data => process.stderr.write(data))
  page = await app.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => report.errors.push({ phase: name, message: error.message }))
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => !!window.electronAPI?.workspace)
  const paths = await app.evaluate(({ app }) => ({ userData: app.getPath('userData'), pid: process.pid }))
  assert.equal(path.resolve(paths.userData), userData)
  report.launches.push({ phase: name, ...paths })
}
async function close() {
  await app.close()
  app = null
}
async function state() { return page.evaluate(() => window.electronAPI.workspace.list()) }
async function waitForActiveWorkspace() {
  const deadline = Date.now() + 30_000
  do {
    const current = await state()
    if (current.activeWorkspaceId) return current
    await new Promise(resolve => setTimeout(resolve, 200))
  } while (Date.now() < deadline)
  throw new Error('Workspace did not become active after restart')
}
async function shot(name) { await page.screenshot({ path: path.join(run, name) }) }
try {
  await launch('create-workspace')
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  // Only replace the native folder picker. All application business actions remain UI-driven.
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 中文测试工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  const pending = await state()
  assert.ok(pending.pendingWorkspaceId)
  assert.equal(pending.activeWorkspaceId, null)
  assert.equal(path.resolve(pending.pendingWorkspace.rootPath), workspace)
  report.createdState = pending
  await shot('01-workspace-created.png')
  await close()
  report.checks.push('Workspace creation persisted before activation; application closed fully')

  await launch('activate-and-save')
  const active = await waitForActiveWorkspace()
  assert.equal(active.activeWorkspaceId, pending.pendingWorkspaceId)
  assert.equal(active.pendingWorkspaceId, null)
  assert.equal(path.resolve(active.activeWorkspace.rootPath), workspace)
  report.activeState = active
  await page.evaluate(() => { location.hash = '/notes' })
  await page.locator('button').filter({ hasText: /^\s*新建笔记\s*$/ }).first().click()
  await page.getByPlaceholder('无标题', { exact: true }).fill(title)
  await page.locator('textarea.note-editor-textarea:visible').fill(content)
  // Poll the real service read API, not the renderer cache or the save status label.
  let notes
  const saveDeadline = Date.now() + 30_000
  do {
    notes = await page.evaluate(() => window.electronAPI.db.notes.list())
    if (notes.some(row => row.title === title && row.content === content)) break
    await new Promise(resolve => setTimeout(resolve, 200))
  } while (Date.now() < saveDeadline)
  assert.equal(notes.filter(row => row.title === title).length, 1)
  report.savedNote = notes.find(row => row.title === title)
  assert.ok(report.savedNote.file_path)
  const notePath = path.resolve(workspace, report.savedNote.file_path)
  assert.ok(notePath.startsWith(path.join(workspace, 'notes') + path.sep))
  assert.equal(await fs.readFile(notePath, 'utf8'), content)
  report.notePath = notePath
  report.contentSha256 = createHash('sha256').update(content).digest('hex')
  await shot('02-note-saved.png')
  await close()
  assert.equal(await fs.readFile(notePath, 'utf8'), content)
  report.checks.push('Chinese Markdown note saved through UI, service readback and physical file match')

  await launch('reopen-and-verify')
  const reopened = await waitForActiveWorkspace()
  assert.equal(reopened.activeWorkspaceId, active.activeWorkspaceId)
  assert.equal(path.resolve(reopened.activeWorkspace.rootPath), workspace)
  const restored = await page.evaluate(id => window.electronAPI.db.notes.get(id), report.savedNote.id)
  assert.equal(restored.id, report.savedNote.id)
  assert.equal(restored.title, title)
  assert.equal(restored.content, content)
  assert.equal(restored.file_path, report.savedNote.file_path)
  await page.evaluate(() => { location.hash = '/notes' })
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForFunction(({ title, content }) =>
    document.querySelector('input[placeholder="无标题"]')?.value === title &&
    [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
  { title, content })
  // Loading a note schedules an autosave too; wait for it before capturing the final UI.
  await page.getByText('保存中', { exact: true }).waitFor({ state: 'hidden', timeout: 15_000 })
  await shot('03-note-after-restart.png')
  report.restoredNote = restored
  report.reopenedState = reopened
  await close()
  assert.equal(await fs.readFile(report.notePath, 'utf8'), content)
  assert.equal(new Set(report.launches.map(item => item.pid)).size, 3)
  assert.deepEqual(report.errors, [])
  report.checks.push('Three distinct application processes; workspace ID, note ID, title, body and file path unchanged after restart')
  report.success = true
  console.log('M0_PERSISTENCE_PASSED', run)
} catch (error) {
  report.success = false
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await shot('failure.png').catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
  }
  process.exitCode = 1
  console.error(error)
} finally {
  if (app) await close().catch(() => {})
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_PERSISTENCE_REPORT', path.join(run, 'report.json'))
}
