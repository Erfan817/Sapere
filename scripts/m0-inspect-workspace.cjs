// Run with Electron's Node runtime so better-sqlite3 uses the matching native ABI.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const Database = require('better-sqlite3')

const reportPath = process.argv[2]
assert.ok(reportPath, 'Set ELECTRON_RUN_AS_NODE=1 and run electron scripts/m0-inspect-workspace.cjs <report.json>')
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
assert.equal(report.success, true, 'Desktop persistence flow must pass first')
const dbPath = path.join(report.workspace, '.reviva', 'reviva.db')
const db = new Database(dbPath, { readonly: true, fileMustExist: true })
try {
  assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  assert.deepEqual(db.pragma('foreign_key_check'), [])
  const row = db.prepare('SELECT id, title, file_path, content FROM notes WHERE id = ?').get(report.savedNote.id)
  assert.ok(row)
  assert.equal(row.title, report.title)
  assert.equal(row.file_path, report.savedNote.file_path)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notes').get().n, 1)
  // Body storage belongs to the Markdown file; SQLite stores metadata and the relative path.
  assert.equal(row.content, '')
  const filePath = path.resolve(report.workspace, row.file_path)
  assert.ok(filePath.startsWith(path.join(report.workspace, 'notes') + path.sep))
  const bytes = fs.readFileSync(filePath)
  assert.equal(bytes.toString('utf8'), report.content)
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), report.contentSha256)
  const registry = JSON.parse(fs.readFileSync(path.join(report.userData, 'workspaces.json'), 'utf8'))
  assert.equal(registry.activeWorkspaceId, report.activeState.activeWorkspaceId)
  assert.equal(registry.pendingWorkspaceId, null)
  assert.equal(registry.workspaces.length, 1)
  console.log(JSON.stringify({ success: true, dbPath, integrity: 'ok', foreignKeys: 'ok', notes: 1, bodyStorage: 'Markdown file', contentSha256: report.contentSha256 }, null, 2))
} finally {
  db.close()
}
