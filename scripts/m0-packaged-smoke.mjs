import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(root, 'release', '1.5.0')
const exePath = path.join(releaseDir, 'win-unpacked', 'Sapere.exe')
const installerPath = path.join(releaseDir, 'Sapere-Windows-1.5.0-x64-Setup.exe')
const resources = path.join(releaseDir, 'win-unpacked', 'resources')

const base = path.join(root, '.sapere', 'm0-packaged')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const userData = path.join(run, 'user-data')
const workspace = path.join(run, '中文打包工作区')
await fs.mkdir(workspace)
const realUserData = path.join(process.env.APPDATA || '', 'Sapere')
const realUserDataExisted = await fs.access(realUserData).then(() => true, () => false)
const report = { success: false, run, exePath, installerPath, userData, workspace, launches: [], errors: [], checks: [] }
let app
let page
let phase

async function launch(name) {
  phase = name
  app = await electron.launch({
    executablePath: exePath,
    args: [`--user-data-dir=${userData}`],
    env: { ...process.env, SAPERE_USER_DATA: userData },
    timeout: 90_000,
  })
  page = await app.firstWindow({ timeout: 90_000 })
  page.on('pageerror', error => report.errors.push({ phase: name, message: error.message }))
  await page.locator('#app').waitFor({ state: 'visible', timeout: 90_000 })
  await page.waitForFunction(() => !!window.electronAPI?.workspace)
  const info = await app.evaluate(({ app }) => ({
    isPackaged: app.isPackaged,
    name: app.getName(),
    version: app.getVersion(),
    userData: app.getPath('userData'),
    exe: app.getPath('exe'),
    appPath: app.getAppPath(),
  }))
  assert.equal(info.isPackaged, true, 'Must run the packaged executable')
  assert.equal(info.version, '1.5.0')
  assert.equal(path.resolve(info.userData), userData, 'Packaged app must use the isolated user data directory')
  assert.ok(info.appPath.endsWith('app.asar'), 'Application code must load from app.asar')
  report.launches.push({ phase: name, pid: await app.evaluate(() => process.pid), ...info })
}

async function close() {
  await app.close()
  app = null
}

async function shot(name) {
  await page.screenshot({ path: path.join(run, name) })
}

async function skipWelcome() {
  const later = page.getByRole('button', { name: '稍后再说', exact: true })
  if (await later.count()) await later.click({ timeout: 60_000 })
}

try {
  for (const [file, label] of [
    [installerPath, 'installer'],
    [exePath, 'packaged executable'],
    [path.join(resources, 'app.asar'), 'app.asar'],
    [path.join(resources, 'agents', 'builtin'), 'bundled agents'],
    [path.join(resources, 'builtin-assets', 'skills'), 'bundled skills'],
    [path.join(resources, 'builtin-assets', 'bin', 'officecli', 'officecli-win-x64.exe'), 'officecli x64'],
    [path.join(resources, 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'), 'SQLite native module'],
  ]) {
    const stats = await fs.stat(file).catch(() => null)
    assert.ok(stats, `${label} must exist: ${file}`)
    if (file === installerPath) assert.ok(stats.size > 100 * 1024 * 1024, 'Installer size looks incomplete')
  }
  assert.equal(await fs.access(path.join(resources, 'builtin-assets', 'bin', 'officecli', 'officecli-win-arm64.exe')).then(() => true, () => false), false, 'Other-arch officecli binary must be removed')
  report.installerSize = (await fs.stat(installerPath)).size
  report.checks.push('Installer and packaged resources present; x64 officecli bundled, arm64 removed')

  await launch('first-run')
  await skipWelcome()
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 打包验收工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  const pending = await page.evaluate(() => window.electronAPI.workspace.list())
  assert.ok(pending.pendingWorkspaceId)
  await close()

  await launch('activate-and-save-note')
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
  const active = await page.evaluate(() => window.electronAPI.workspace.list())
  assert.equal(active.activeWorkspaceId, pending.pendingWorkspaceId)
  await page.evaluate(() => { location.hash = '/notes' })
  await page.locator('button').filter({ hasText: /^\s*新建笔记\s*$/ }).first().click()
  const title = '打包版重启验收'
  const content = '# 打包后的学习记录\n\n本地工作区、笔记与重启恢复在安装包构建中一致。\n'
  await page.getByPlaceholder('无标题', { exact: true }).fill(title)
  await page.locator('textarea.note-editor-textarea:visible').fill(content)
  const deadline = Date.now() + 30_000
  let saved
  do {
    saved = (await page.evaluate(() => window.electronAPI.db.notes.list())).find(row => row.title === title)
    if (saved?.content === content) break
    await new Promise(resolve => setTimeout(resolve, 250))
  } while (Date.now() < deadline)
  assert.equal(saved?.content, content)
  const notePath = path.resolve(workspace, saved.file_path)
  assert.equal(await fs.readFile(notePath, 'utf8'), content)
  await shot('01-packaged-note.png')
  await close()

  await launch('reopen')
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
  const restored = await page.evaluate(id => window.electronAPI.db.notes.get(id), saved.id)
  assert.equal(restored.title, title)
  assert.equal(restored.content, content)
  await page.evaluate(() => { location.hash = '/notes' })
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForFunction(({ title, content }) =>
    document.querySelector('input[placeholder="无标题"]')?.value === title &&
    [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
  { title, content })
  await page.getByText('保存中', { exact: true }).waitFor({ state: 'hidden', timeout: 15_000 })
  await shot('02-packaged-after-restart.png')
  await close()
  assert.equal(await fs.readFile(notePath, 'utf8'), content)
  assert.equal(new Set(report.launches.map(item => item.pid)).size, 3)
  assert.deepEqual(report.errors, [])
  report.checks.push('Packaged app ran three processes; workspace and note persisted across restarts; page errors empty')
  report.success = true
  console.log('M0_PACKAGED_PASSED', run)
} catch (error) {
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await shot('failure.png').catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
  }
  process.exitCode = 1
  console.error('M0_PACKAGED_FAILED', error)
} finally {
  if (app) await close().catch(() => {})
  // If the packaged app ignored the isolated user-data switch, remove only data we created.
  if (!realUserDataExisted) {
    await fs.rm(realUserData, { recursive: true, force: true }).catch(() => {})
  }
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_PACKAGED_REPORT', path.join(run, 'report.json'))
}
