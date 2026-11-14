import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { replaceFile, writeFileAtomic } from './atomicFile.js'

test('atomic writes fall back to copy when the profile rejects rename with EXDEV', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sapere-atomic-'))
  const originalRename = fs.rename
  try {
    fs.rename = async () => {
      const error = new Error('EXDEV: cross-device link not permitted')
      error.code = 'EXDEV'
      throw error
    }
    const target = path.join(dir, 'workspaces.json')
    await writeFileAtomic(target, '{"ok":true}')
    assert.equal(await fs.readFile(target, 'utf8'), '{"ok":true}')
    assert.deepEqual((await fs.readdir(dir)).filter(name => name.includes('.tmp-')), [])

    const temp = path.join(dir, 'replace.tmp')
    await fs.writeFile(temp, 'new')
    await replaceFile(temp, path.join(dir, 'replace.json'))
    assert.equal(await fs.readFile(path.join(dir, 'replace.json'), 'utf8'), 'new')
  } finally {
    fs.rename = originalRename
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('atomic writes keep the original file until the replacement succeeds', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sapere-atomic-'))
  try {
    const target = path.join(dir, 'state.json')
    await fs.writeFile(target, 'old')
    await writeFileAtomic(target, 'next')
    assert.equal(await fs.readFile(target, 'utf8'), 'next')
    await assert.rejects(replaceFile(path.join(dir, 'missing.tmp'), target), { code: 'ENOENT' })
    assert.equal(await fs.readFile(target, 'utf8'), 'next')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})
