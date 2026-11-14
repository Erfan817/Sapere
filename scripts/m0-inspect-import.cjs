// Run using Electron's Node runtime to keep better-sqlite3's ABI aligned.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const Database = require('better-sqlite3')

const reportPath = process.argv[2]
assert.ok(reportPath, 'Usage: ELECTRON_RUN_AS_NODE=1 electron scripts/m0-inspect-import.cjs <report.json>')
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
assert.equal(report.success, true, 'Desktop import flow must pass first')
const dbPath = path.join(report.workspace, '.reviva', 'reviva.db')
const db = new Database(dbPath, { readonly: true, fileMustExist: true })
try {
  assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  assert.deepEqual(db.pragma('foreign_key_check'), [])
  // Plain local docs are filesystem entries; the legacy documents table is not their index.
  const legacyDocuments = db.prepare('SELECT COUNT(*) AS n FROM documents').get().n
  assert.equal(legacyDocuments, 0)
  assert.deepEqual(fs.readdirSync(path.join(report.workspace, 'docs')).sort(), report.fixtures.map(item => item.name).sort())
  for (const item of report.fixtures) {
    assert.equal(path.resolve(item.destination), path.join(report.workspace, 'docs', item.name))
    const bytes = fs.readFileSync(item.destination)
    assert.equal(bytes.toString('utf8'), item.content)
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256)
    assert.equal(fs.existsSync(item.sourcePath), false)
  }
  const registry = JSON.parse(fs.readFileSync(path.join(report.userData, 'workspaces.json'), 'utf8'))
  assert.equal(registry.activeWorkspaceId, report.activeState.activeWorkspaceId)
  assert.equal(registry.pendingWorkspaceId, null)
  assert.equal(registry.workspaces.length, 1)
  console.log(JSON.stringify({ success: true, dbPath, integrity: 'ok', foreignKeys: 'ok', files: report.fixtures.length, legacyDocuments, storage: 'workspace/docs', sourcesRemovedBeforeRestart: true }, null, 2))
} finally {
  db.close()
}
