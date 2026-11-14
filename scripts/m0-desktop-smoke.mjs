import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artifacts = path.join(root, '.sapere', 'm0-smoke')
await fs.mkdir(artifacts, { recursive: true })
const env = { ...process.env, SAPERE_DEV_USER_DATA: path.join(artifacts, 'user-data') }
delete env.ELECTRON_RUN_AS_NODE
const errors = []
let app
try {
  app = await electron.launch({
    args: [root],
    cwd: root,
    env,
    timeout: 60_000,
  })
  app.process().stdout?.on('data', data => process.stdout.write(data))
  app.process().stderr?.on('data', data => process.stderr.write(data))
  const page = await app.firstWindow({ timeout: 60_000 })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 })
  await page.getByRole('button', { name: '稍后再说', exact: true }).click({ timeout: 30_000 })
  const startupText = await page.locator('body').innerText()
  await page.screenshot({ path: path.join(artifacts, '01-startup.png') })
  await page.getByRole('button', { name: '打开学习台', exact: true }).first().click()
  await page.waitForURL('**#/workchat')
  await page.screenshot({ path: path.join(artifacts, '02-learning.png') })
  const learningText = await page.locator('body').innerText()
  await page.evaluate(() => { location.hash = '/settings/directory' })
  await page.getByText('授权根目录（工作空间）', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(artifacts, '03-directory.png') })
  const paths = await app.evaluate(({ app }) => ({
    userData: app.getPath('userData'), sessionData: app.getPath('sessionData'), versions: process.versions,
  }))
  const state = { title: await page.title(), url: page.url(), startupText, learningText, text: await page.locator('body').innerText(), paths, errors }
  await fs.writeFile(path.join(artifacts, 'inspection.json'), JSON.stringify(state, null, 2))
  console.log('M0_INSPECTION', JSON.stringify(state, null, 2))
  if (path.resolve(paths.userData) !== path.resolve(env.SAPERE_DEV_USER_DATA)) {
    throw new Error('Desktop data isolation check failed')
  }
  if (errors.length) throw new Error(`Desktop page errors: ${errors.join('; ')}`)
} finally {
  if (app) await app.close()
}
