// Run with Electron's Node runtime so better-sqlite3 keeps the matching ABI.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const reportPath = process.argv[2]
assert.ok(reportPath, 'Usage: ELECTRON_RUN_AS_NODE=1 electron scripts/m0-inspect-model-cloud.cjs <report.json>')
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
assert.equal(report.success, true, 'Desktop model/cloud check must pass first')
const dbPath = path.join(report.workspace, '.reviva', 'reviva.db')
const db = new Database(dbPath, { readonly: true, fileMustExist: true })
try {
  assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  assert.deepEqual(db.pragma('foreign_key_check'), [])
  const row = db.prepare("SELECT value FROM settings WHERE key = 'providers'").get()
  assert.ok(row, 'providers setting must exist')
  const providers = JSON.parse(row.value)
  const ollama = providers.find(item => item.id === 'custom')
  assert.ok(ollama, 'custom local provider must be saved')
  assert.equal(ollama.baseUrl, 'http://127.0.0.1:9/v1')
  assert.equal(ollama.apiKey, 'local-placeholder-key')
  // The current implementation stores provider keys in the workspace SQLite settings JSON.
  const plaintextKeyInDb = row.value.includes('local-placeholder-key')
  assert.equal(plaintextKeyInDb, true)
  const registry = JSON.parse(fs.readFileSync(path.join(report.userData, 'workspaces.json'), 'utf8'))
  assert.equal(registry.pendingWorkspaceId, null)
  assert.equal(registry.workspaces.length, 1)
  console.log(JSON.stringify({
    success: true, dbPath, integrity: 'ok', foreignKeys: 'ok',
    providerCount: providers.length, providerKeysStored: 'workspace SQLite settings JSON (plaintext)',
    plaintextKeyInDb, externalRequests: report.externalRequests.length,
  }, null, 2))
} finally {
  db.close()
}
