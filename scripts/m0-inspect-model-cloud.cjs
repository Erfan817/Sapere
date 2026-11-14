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
  // The typed table keeps the credential encrypted; the compatibility row never carries it.
  assert.equal(ollama.apiKey, '')
  assert.equal(row.value.includes('local-placeholder-key'), false)
  const secretRow = db.prepare('SELECT api_key FROM llm_provider_profiles WHERE id = ?').get('custom')
  assert.ok(secretRow.api_key.startsWith('safe:'), 'provider key must be encrypted at rest')
  assert.equal(secretRow.api_key.includes('local-placeholder-key'), false)
  assert.equal(report.exportRedacted, true)
  assert.equal(report.importPreservedKey, true)
  const registry = JSON.parse(fs.readFileSync(path.join(report.userData, 'workspaces.json'), 'utf8'))
  assert.equal(registry.pendingWorkspaceId, null)
  assert.equal(registry.workspaces.length, 1)
  console.log(JSON.stringify({
    success: true, dbPath, integrity: 'ok', foreignKeys: 'ok',
    providerCount: providers.length, providerKeysStored: 'encrypted with safeStorage in typed provider table',
    encryptedAtRest: true, plaintextKeyInDb: false,
    exportRedacted: true, importPreservedKey: true,
    externalRequests: report.externalRequests.length,
  }, null, 2))
} finally {
  db.close()
}
