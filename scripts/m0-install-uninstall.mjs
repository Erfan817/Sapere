import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { _electron as electron } from 'playwright-core'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runExec = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(root, 'release', '1.5.0')
const installer = path.join(releaseDir, 'Sapere-Windows-1.5.0-x64-Setup.exe')
const base = path.join(root, '.sapere', 'm0-install')
await fs.mkdir(base, { recursive: true })
export const run = await fs.mkdtemp(path.join(base, 'run-'))
const installDir = path.join(base, 'app')
const appExe = path.join(installDir, 'Sapere.exe')
const uninstaller = path.join(installDir, 'Uninstall Sapere.exe')
const userData = path.join(run, 'user-data')
const desktopShortcut = path.join(os.homedir(), 'Desktop', 'Sapere.lnk')
const publicDesktopShortcut = path.join(process.env.PUBLIC || 'C:/Users/Public', 'Desktop', 'Sapere.lnk')
const startShortcut = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Sapere.lnk')
const legacyProfile = path.join(process.env.APPDATA, 'Reviva')
const report = { success: false, run, installer, installDir, userData, checks: [], errors: [] }

const exists = target => fs.access(target).then(() => true, () => false)
const waitFor = async (predicate, timeoutMs, label) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return true
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`Timed out waiting for ${label}`)
}
async function queryUninstallEntry() {
  const script = [
    '$items = Get-ChildItem "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" -ErrorAction SilentlyContinue |',
    '  ForEach-Object { Get-ItemProperty $_.PSPath } |',
    '  Where-Object { $_.DisplayName -eq "Sapere 1.5.0" -or $_.DisplayName -eq "Sapere" } |',
    '  Select-Object DisplayName, DisplayVersion, InstallLocation, UninstallString;',
    'if ($items) { $items | ConvertTo-Json -Compress } else { "[]" }',
  ].join(' ')
  const { stdout } = await runExec('powershell', ['-NoProfile', '-Command', script])
  const parsed = JSON.parse(stdout.trim() || '[]')
  return Array.isArray(parsed) ? parsed[0] || null : parsed
}
async function shortcutState() {
  return {
    desktop: await exists(desktopShortcut),
    publicDesktop: await exists(publicDesktopShortcut),
    startMenu: await exists(startShortcut),
  }
}

try {
  assert.equal(await exists(installer), true, 'Installer must exist')
  assert.equal(await exists(installDir), false, 'Test install directory must not pre-exist')
  assert.equal(await exists(desktopShortcut), false, 'Desktop shortcut must not pre-exist')
  assert.equal(await exists(startShortcut), false, 'Start menu shortcut must not pre-exist')
  assert.equal(await queryUninstallEntry(), null, 'Sapere must not be installed before the test')
  report.checks.push('No prior Sapere install, shortcuts or uninstall entry')

  // Silent per-user install. /D must be the last argument and must not be quoted.
  await runExec(installer, ['/S', `/D=${installDir}`], { timeout: 240_000, windowsHide: true })
  await waitFor(() => exists(appExe), 120_000, 'installed Sapere.exe')
  await waitFor(async () => !!(await queryUninstallEntry()), 60_000, 'uninstall registry entry')
  const entry = await queryUninstallEntry()
  const shortcuts = await shortcutState()
  assert.ok(entry.DisplayName)
  assert.equal(entry.InstallLocation ? path.resolve(entry.InstallLocation) : path.resolve(installDir), path.resolve(installDir))
  assert.equal(shortcuts.desktop, true, 'Desktop shortcut should exist after install')
  assert.equal(shortcuts.startMenu, true, 'Start menu shortcut should exist after install')
  assert.equal(await exists(uninstaller), true, 'Uninstaller should exist')
  report.install = { entry, shortcuts }
  report.checks.push('Silent install created files, uninstall entry and desktop/start-menu shortcuts')

  const app = await electron.launch({
    executablePath: appExe,
    env: { ...process.env, SAPERE_USER_DATA: userData },
    timeout: 90_000,
  })
  try {
    const page = await app.firstWindow({ timeout: 90_000 })
    page.on('pageerror', error => report.errors.push(error.message))
    await page.locator('#app').waitFor({ state: 'visible', timeout: 90_000 })
    const info = await app.evaluate(({ app }) => ({
      isPackaged: app.isPackaged,
      version: app.getVersion(),
      exe: app.getPath('exe'),
      userData: app.getPath('userData'),
    }))
    assert.equal(info.isPackaged, true)
    assert.equal(info.version, '1.5.0')
    assert.equal(path.resolve(info.exe), path.resolve(appExe))
    assert.equal(path.resolve(info.userData), userData)
    await page.screenshot({ path: path.join(run, '01-installed-app.png') })
    report.launch = info
    assert.deepEqual(report.errors, [])
    report.checks.push('Installed executable launched with expected version and isolated user data')
  } finally {
    await app.close()
  }

  await runExec(uninstaller, ['/S'], { timeout: 240_000, windowsHide: true })
  await waitFor(async () => !(await exists(appExe)), 120_000, 'installed executable removal')
  await waitFor(async () => !(await queryUninstallEntry()), 60_000, 'uninstall registry removal')
  await waitFor(async () => {
    const state = await shortcutState()
    return !state.desktop && !state.startMenu
  }, 60_000, 'shortcut removal')
  const after = await shortcutState()
  const leftovers = await exists(installDir) ? await fs.readdir(installDir).catch(() => []) : []
  assert.deepEqual(after, { desktop: false, publicDesktop: false, startMenu: false })
  assert.deepEqual(leftovers, [], 'Install directory should be removed')
  assert.equal(await exists(legacyProfile), true, 'Uninstall should keep user profile data')
  assert.deepEqual(report.errors, [])
  report.afterUninstall = { shortcuts: after, installDirExists: await exists(installDir), leftovers, legacyProfileKept: true }
  report.checks.push('Silent uninstall removed files, registry entry and shortcuts while keeping the user profile')
  report.success = true
  console.log('M0_INSTALL_PASSED', run)
} catch (error) {
  report.failure = { message: error.message, stack: error.stack }
  process.exitCode = 1
  console.error('M0_INSTALL_FAILED', error)
} finally {
  await fs.writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2))
  console.log('M0_INSTALL_REPORT', path.join(run, 'report.json'))
}
