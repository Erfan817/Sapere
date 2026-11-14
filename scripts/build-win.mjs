// Reproducible Windows x64 build: Vite bundles, then electron-builder creates NSIS.
// Corepack installs pnpm without global shims, so electron-builder's dependency
// collector gets a local pnpm command on PATH for this process only.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pnpmCli = process.env.npm_execpath
if (!pnpmCli || !fs.existsSync(pnpmCli)) {
  throw new Error('Run this build with: corepack pnpm run build:win')
}
const toolsBin = path.join(root, '.sapere', 'tools', 'bin')
fs.mkdirSync(toolsBin, { recursive: true })
if (process.platform === 'win32') {
  fs.writeFileSync(path.join(toolsBin, 'pnpm.cmd'), `@echo off\r\n"${process.execPath}" "${pnpmCli}" %*\r\n`)
} else {
  const shim = path.join(toolsBin, 'pnpm')
  fs.writeFileSync(shim, `#!/bin/sh\nexec "${process.execPath}" "${pnpmCli}" "$@"\n`)
  fs.chmodSync(shim, 0o755)
}

const env = {
  ...process.env,
  PATH: `${toolsBin}${path.delimiter}${process.env.PATH || ''}`,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=8192`.trim(),
}
const skipVite = process.argv.includes('--skip-vite')

function run(label, args) {
  console.log(`[build:win] ${label}`)
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

if (!skipVite) run('vite build', [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'])
run('electron-builder nsis x64', [path.join(root, 'node_modules', 'electron-builder', 'cli.js'), '--win', 'nsis', '--x64'])
