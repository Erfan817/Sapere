// Run with Electron's Node runtime so better-sqlite3 keeps the matching ABI.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const reportPath = process.argv[2]
assert.ok(reportPath, 'Usage: ELECTRON_RUN_AS_NODE=1 electron scripts/m0-inspect-abnormal.cjs <report.json>')
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
assert.equal(report.success, true, 'Abnormal-exit desktop flow must pass first')
assert.ok(report.finalContent, 'Report must contain the final saved content')

const dbPath = path.join(report.workspace, '.reviva', 'reviva.db')
const db = new Database(dbPath, { readonly: true, fileMustExist: true })
try {
  assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  assert.deepEqual(db.pragma('foreign_key_check'), [])
  const notes = db.prepare('SELECT id, title, file_path, content FROM notes').all()
  assert.equal(notes.length, 1)
  assert.equal(notes[0].id, report.noteId)
  assert.equal(notes[0].title, '异常退出恢复验收')
  assert.equal(notes[0].content, '')
  const noteFile = path.resolve(report.workspace, notes[0].file_path)
  assert.equal(noteFile, path.resolve(report.notePath))
  const body = fs.readFileSync(noteFile, 'utf8')
  assert.equal(body, report.finalContent)

  const notesDir = path.join(report.workspace, 'notes')
  const names = fs.readdirSync(notesDir)
  const leftovers = names.filter(name => name.includes('.tmp-'))
  assert.equal(names.includes(path.basename(noteFile)), true)

  const registry = JSON.parse(fs.readFileSync(path.join(report.userData, 'workspaces.json'), 'utf8'))
  assert.equal(registry.pendingWorkspaceId, null)
  assert.equal(registry.activeWorkspaceId, report.finalState.activeWorkspaceId)
  assert.equal(registry.workspaces.length, 1)
  assert.equal(path.resolve(registry.workspaces[0].rootPath), path.resolve(report.workspace))

  console.log(JSON.stringify({
    success: true,
    dbPath,
    integrity: 'ok',
    foreignKeys: 'ok',
    notes: notes.length,
    bodyBytes: Buffer.byteLength(body),
    tempLeftovers: leftovers,
    races: report.races,
    forcedExits: report.phases.filter(item => item.phase.endsWith(':force-killed')).length,
    recovery: 'last saved version intact; incomplete save never truncated',
  }, null, 2))
} finally {
  db.close()
}
