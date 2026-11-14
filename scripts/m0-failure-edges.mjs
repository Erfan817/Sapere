import assert from 'node:assert/strict'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = path.join(root, '.sapere', 'm0-failure-edges')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const userData = path.join(run, 'user-data')
const workspace = path.join(run, '中文失败边界工作区')
const source = path.join(run, '外部资料')
await fs.mkdir(workspace)
await fs.mkdir(source)
const env = { ...process.env, SAPERE_DEV_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
delete env.VITE_DEV_SERVER_URL

// Minimal but structurally valid PDF with one text page.
const pdfBody = [
  '%PDF-1.4',
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
  '4 0 obj << /Length 44 >> stream',
  'BT /F1 12 Tf 20 100 Td (Sapere PDF check) Tj ET',
  'endstream endobj',
  '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  'trailer << /Root 1 0 R /Size 6 >>',
  '%%EOF',
].join('\n')
const pdfPath = path.join(source, '边界测试资料.pdf')
const badPdfPath = path.join(source, '损坏的资料.pdf')
const audioPath = path.join(source, '边界测试音频.mp3')
await fs.writeFile(pdfPath, pdfBody)
await fs.writeFile(badPdfPath, 'not a pdf at all')
await fs.writeFile(audioPath, 'not audio data')

export const report = { success: false, run, workspace, checks: [], errors: [], notes: [] }
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
}
async function close() { await app.close(); app = null }
async function shot(name) { await page.screenshot({ path: path.join(run, name) }) }
async function upload(files) {
  await page.evaluate(() => { location.hash = '/docs-manage' })
  await page.locator('button.doc-toolbar-action').filter({ hasText: /^\s*上传\s*$/ }).click()
  await app.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths })
  }, files)
  await page.getByText('点击选择或拖放文件到这里', { exact: true }).click()
  await page.locator('.ms-modal-card').getByText(files.map(f => path.basename(f))[0], { exact: true }).waitFor()
  await page.locator('.ms-modal-card button').filter({ hasText: new RegExp(`上传 ${files.length} 个文件`) }).click()
}

try {
  await launch('create-workspace')
  await page.getByText('先设置根目录', { exact: true }).click({ timeout: 60_000 })
  await page.getByText('选择', { exact: true }).click()
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, workspace)
  await page.getByText('新建独立授权根目录', { exact: true }).click()
  await page.locator('.ms-msgbox-card input').fill('M0 失败边界工作区')
  await page.getByRole('button', { name: '确认新建', exact: true }).click()
  await page.getByText('重启后生效', { exact: true }).waitFor()
  await close()

  await launch('import-failure-edges')
  await page.waitForFunction(async () => !!(await window.electronAPI.workspace.list()).activeWorkspaceId, null, { timeout: 30_000 })
  const docsPath = await page.evaluate(async () => (await window.electronAPI.workdir.getStatus()).docsPath)

  // 1. A valid PDF triggers the processing prompt instead of silently parsing or losing the file.
  await upload([pdfPath])
  const pdfModal = page.locator('.ms-modal-card').filter({ hasText: '处理 PDF' })
  await pdfModal.waitFor({ timeout: 30_000 })
  const environmentText = await pdfModal.innerText()
  report.notes.push({ step: 'pdf-prompt', environmentText })
  await shot('01-pdf-prompt.png')
  // The prompt always shows the detected Python/PyMuPDF state; without the parser it must say so.
  assert.match(environmentText, /Python|PyMuPDF|本地|环境|解析/, 'PDF prompt must show parser environment status')

  // Choose the local parser explicitly; without PyMuPDF the app must report it, not crash.
  await pdfModal.locator('select').selectOption('local_fast')
  await pdfModal.getByRole('button', { name: '开始解析' }).click()
  await page.waitForTimeout(6000)
  const bodyAfterPdf = await page.locator('body').innerText()
  const parserFeedback = /缺少|未安装|无法解析|解析失败|需要安装|环境|Python/.test(bodyAfterPdf)
  report.notes.push({ step: 'pdf-local-parse', feedback: parserFeedback, tail: bodyAfterPdf.slice(-400) })
  await shot('02-pdf-local-parse.png')
  assert.equal(parserFeedback, true, 'Missing local PDF parser must surface a visible dependency message')
  report.checks.push('Valid PDF import prompts for processing and reports the local parser state instead of failing silently')

  // The imported PDF must still exist in the workspace even when parsing fails.
  const pdfListed = await page.evaluate(async dir => (await window.electronAPI.listDir(dir)).data.some(item => item.name === '边界测试资料.pdf'), docsPath)
  assert.equal(pdfListed, true, 'Failed PDF parse must not remove the imported copy')
  assert.equal(await fs.readFile(path.join(docsPath, '边界测试资料.pdf'), 'utf8'), pdfBody)
  report.checks.push('Failed PDF parse keeps the imported file intact')

  // 2. A corrupt PDF and a non-audio file must not crash the app; the copies remain and can be previewed/deleted.
  await upload([badPdfPath, audioPath])
  await page.waitForTimeout(8000)
  const corruptListed = await page.evaluate(async dir => {
    const data = (await window.electronAPI.listDir(dir)).data
    return ['损坏的资料.pdf', '边界测试音频.mp3'].filter(name => data.some(item => item.name === name))
  }, docsPath)
  assert.deepEqual(corruptListed, ['损坏的资料.pdf', '边界测试音频.mp3'])
  const bodyAfterBad = await page.locator('body').innerText()
  report.notes.push({ step: 'corrupt-inputs', bodyTail: bodyAfterBad.slice(-400) })
  await shot('03-corrupt-inputs.png')
  assert.equal(await fs.readFile(path.join(docsPath, '损坏的资料.pdf'), 'utf8'), 'not a pdf at all')
  assert.equal(await fs.readFile(path.join(docsPath, '边界测试音频.mp3'), 'utf8'), 'not audio data')
  report.checks.push('Corrupt PDF and invalid media import without crashing; copies stay readable')

  // 3. Deleting the failed imports moves them to the recycle bin rather than hard-deleting.
  // Dismiss processing prompts left open by the corrupt uploads, then use the recycle-bin IPC
  // so this check does not depend on the right-click menu geometry.
  for (const label of ['稍后', '稍后手动解析']) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const button = page.locator('.ms-modal-card button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) })
      if (!(await button.count())) break
      await button.first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  for (const name of ['损坏的资料.pdf', '边界测试音频.mp3', '边界测试资料.pdf']) {
    const itemPath = path.join(docsPath, name)
    const moved = await page.evaluate(async target => window.electronAPI.recycleBin.moveToTrash(target, { isDirectory: false, name: target.split(/[\\/]/).pop() }), itemPath)
    assert.equal(moved?.success, true, `Moving ${name} to the recycle bin must succeed`)
  }
  await page.waitForTimeout(1200)
  const remaining = await page.evaluate(async dir => (await window.electronAPI.listDir(dir)).data.map(item => item.name), docsPath)
  assert.deepEqual(remaining.filter(name => /边界测试|损坏的资料/.test(name)), [])
  const trashDir = path.join(workspace, '.reviva', 'trash')
  const trashed = await fs.readdir(trashDir).catch(() => [])
  report.notes.push({ trash: trashed })
  assert.ok(trashed.length >= 1, 'Deleting failed imports must use the recycle bin')
  report.checks.push('Failed imports can be deleted through the recycle bin')

  assert.deepEqual(report.errors, [])
  report.checks.push('No page errors during the failure-edge flows')
  report.success = true
  await close()
  console.log('M0_FAILURE_EDGES_PASSED', run)
} catch (error) {
  report.failure = { phase, message: error.message, stack: error.stack }
  if (page && !page.isClosed()) {
    await shot('failure.png').catch(() => {})
    report.failure.pageText = await page.locator('body').innerText().catch(() => '')
  }
  process.exitCode = 1
  console.error('M0_FAILURE_EDGES_FAILED', error)
} finally {
  if (app) await close().catch(() => {})
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_FAILURE_EDGES_REPORT', path.join(run, 'report.json'))
}
