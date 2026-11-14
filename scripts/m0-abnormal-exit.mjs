import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runExec = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'm0-abnormal')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const userData = path.join(run, 'user-data')
const workspace = path.join(run, '中文异常退出工作区')
await fs.mkdir(workspace)
const env = { ...process.env, SAPERE_DEV_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL

const title = '异常退出恢复验收'
const baseline = '# 异常退出基线\n\n这是已经保存到磁盘的内容。\n'
const report = { success: false, run, workspace, userData, phases: [], errors: [], checks: [], races: [] }
let app
let page
let phase

async function launch(name) {
  phase = name
  app = await electron.launch({ args: [root], cwd: root, env, timeout: 60_000 })
  page = await app.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => report.errors.push({ phase: name, message: error.message }))
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => !!window.electronAPI?.workspace)
  report.phases.push({ phase: name, pid: await app.evaluate(() => process.pid) })
}

async function waitForActiveWorkspace() {
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
}

async function forceKill(name) {
  const pid = app?.process?.()?.pid
  assert.ok(pid, 'Need a running process to kill')
  await runExec('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }).catch(() => {})
  await new Promise(resolve => setTimeout(resolve, 1500))
  report.phases.push({ phase: `${name}:force-killed`, pid })
  app = null
  page = null
}

async function notes() {
  return page.evaluate(() => window.electronAPI.db.notes.list())
}

async function setEditorContent(content) {
  await page.locator('textarea.note-editor-textarea:visible').fill(content)
}

async function readNote(id) {
  return page.evaluate(noteId => window.electronAPI.db.notes.get(noteId), id)
}

async function waitForSaved(id, content, timeout = 30_000) {
  const deadline = Date.now() + timeout
  do {
    const row = await readNote(id)
    if (row?.content === content) return row
    await new Promise(resolve => setTimeout(resolve, 150))
  } while (Date.now() < deadline)
  throw new Error('Note content did not reach the service')
}

try {
  // 1. Create a workspace and kill the process while activation is still pending.
  await launch('create-workspace')
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 异常退出工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  const pending = await page.evaluate(() => window.electronAPI.workspace.list())
  assert.ok(pending.pendingWorkspaceId)
  await forceKill('create-workspace')

  await launch('activate-after-pending-kill')
  await waitForActiveWorkspace()
  const active = await page.evaluate(() => window.electronAPI.workspace.list())
  assert.equal(active.activeWorkspaceId, pending.pendingWorkspaceId)
  assert.equal(active.pendingWorkspaceId, null)
  report.checks.push('Forced exit during pending workspace activation did not block the next start')

  // 2. Save a baseline note, then force-kill while idle.
  await page.evaluate(() => { location.hash = '/notes' })
  await page.locator('button').filter({ hasText: /^\s*新建笔记\s*$/ }).first().click()
  await page.getByPlaceholder('无标题', { exact: true }).fill(title)
  await setEditorContent(baseline)
  let saved = null
  const baselineDeadline = Date.now() + 30_000
  while (Date.now() < baselineDeadline) {
    saved = (await notes()).find(row => row.title === title)
    if (saved?.content === baseline) break
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(saved?.id)
  assert.equal(saved.content, baseline)
  await waitForSaved(saved.id, baseline)
  const noteId = saved.id
  const notePath = path.resolve(workspace, saved.file_path)
  assert.equal(await fs.readFile(notePath, 'utf8'), baseline)
  await forceKill('baseline-saved')

  await launch('verify-baseline')
  await waitForActiveWorkspace()
  let current = await readNote(noteId)
  assert.equal(current.content, baseline)
  assert.equal(await fs.readFile(notePath, 'utf8'), baseline)
  report.checks.push('Saved note survived a forced exit with matching Markdown bytes')

  // 3. Kill inside the 500ms debounce window: the unsaved tail must be lost, baseline must remain.
  await page.evaluate(() => { location.hash = '/notes' })
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForFunction(content =>
    [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
  baseline)
  const unsaved = `${baseline}\n未保存的尾部内容\n`
  await setEditorContent(unsaved)
  await page.waitForTimeout(100)
  await forceKill('kill-in-debounce')

  await launch('verify-after-debounce-kill')
  await waitForActiveWorkspace()
  current = await readNote(noteId)
  assert.equal(current.content, baseline)
  assert.equal(await fs.readFile(notePath, 'utf8'), baseline)
  report.checks.push('Forced exit inside the debounce window left the previously saved note intact')

  // 4. Kill around the save boundary twice with a larger payload.
  // The recovered content must be either the old or the new version, never truncated.
  for (const [index, delay] of [[1, 560], [2, 620]]) {
    const before = current.content
    const marker = `\n\n并发保存标记 ${index} ` + 'X'.repeat(200_000) + '\n'
    const next = `${before}${marker}`
    await page.evaluate(() => { location.hash = '/notes' })
    await page.getByText(title, { exact: true }).first().click()
    await page.waitForFunction(content =>
      [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
    before)
    await setEditorContent(next)
    await page.waitForTimeout(delay)
    await forceKill(`kill-around-save-${index}`)

    await launch(`verify-save-race-${index}`)
    await waitForActiveWorkspace()
    current = await readNote(noteId)
    const onDisk = await fs.readFile(notePath, 'utf8')
    assert.equal(current.content, onDisk, 'Database metadata and Markdown body must agree')
    assert.ok([before, next].includes(current.content), 'Recovered content must be a complete old or new version')
    report.races.push({ index, delay, recovered: current.content === next ? 'new' : 'old', bytes: onDisk.length })
    report.checks.push(`Save-boundary forced exit ${index} recovered a complete ${current.content === next ? 'new' : 'old'} version`)
  }

  // 5. Save a final marker, wait for readback, then force-kill and verify.
  const finalContent = `${current.content}\n最终已保存内容\n`
  await page.evaluate(() => { location.hash = '/notes' })
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForFunction(content =>
    [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
  current.content)
  await setEditorContent(finalContent)
  await waitForSaved(noteId, finalContent)
  await forceKill('final-saved')

  await launch('final-restart')
  await waitForActiveWorkspace()
  const finalNote = await readNote(noteId)
  assert.equal(finalNote.content, finalContent)
  assert.equal(await fs.readFile(notePath, 'utf8'), finalContent)
  await page.evaluate(() => { location.hash = '/notes' })
  await page.getByText(title, { exact: true }).first().click()
  await page.waitForFunction(content =>
    [...document.querySelectorAll('textarea.note-editor-textarea')].some(el => el.value === content),
  finalContent)
  await page.screenshot({ path: path.join(run, '01-restored-after-forced-exits.png') })
  report.noteId = noteId
  report.notePath = notePath
  report.finalContent = finalContent
  report.finalState = await page.evaluate(() => window.electronAPI.workspace.list())
  report.checks.push('Final saved content restored after another forced exit')
  await app.close()
  app = null
  page = null
  assert.deepEqual(report.errors, [])
  report.success = true
  console.log('M0_ABNORMAL_EXIT_PASSED', run)
} catch (error) {
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(run, 'failure.png') }).catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
  }
  process.exitCode = 1
  console.error('M0_ABNORMAL_EXIT_FAILED', error)
} finally {
  if (app) await app.close().catch(() => {})
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_ABNORMAL_EXIT_REPORT', path.join(run, 'report.json'))
}
