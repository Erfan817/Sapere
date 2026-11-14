import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseService } from './DatabaseService.js'
import { createSettingsTransfer, parseSettingsTransfer } from './SettingsTransferService.js'

class FakeSecretStore {
  isEncryptionAvailable() {
    return true
  }

  encryptString(value) {
    return Buffer.from(`cipher:${value}`, 'utf8')
  }

  decryptString(buffer) {
    const text = buffer.toString('utf8')
    if (!text.startsWith('cipher:')) throw new Error('invalid ciphertext')
    return text.slice('cipher:'.length)
  }
}

function provider(apiKey) {
  return {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey,
    models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat', enabled: true }],
  }
}

test('encrypts provider keys at rest and leaves no plaintext compatibility copy', () => {
  const service = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    service.init(':memory:')
    service.setSetting('providers', [provider('sk-live-secret')])

    const row = service.db.prepare('SELECT api_key, config_json FROM llm_provider_profiles').get()
    assert.ok(row.api_key.startsWith('safe:'))
    assert.equal(row.api_key.includes('sk-live-secret'), false)
    assert.equal(row.config_json.includes('sk-live-secret'), false)

    const compatibility = service.db.prepare("SELECT value FROM settings WHERE key = 'providers'").get().value
    assert.equal(compatibility.includes('sk-live-secret'), false)

    assert.equal(service.getSetting('providers')[0].apiKey, 'sk-live-secret')
    assert.equal(service.getAllSettings().providers[0].apiKey, 'sk-live-secret')
  } finally {
    service.close()
  }
})

test('protects speech, web import and proxy credentials while returning plaintext to the app', () => {
  const service = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    service.init(':memory:')
    service.setSetting('mediaSpeechSettings', {
      version: 2,
      defaultProviderId: 'local_asr',
      providers: { local_asr: { name: 'Local', apiKey: 'stt-secret', model: 'whisper-1' } },
    })
    service.setSetting('webImportSettings', {
      version: 1,
      selectedProvider: 'jina',
      providers: { jina: { baseUrl: 'https://r.jina.ai', apiKey: 'jina-secret' } },
    })
    service.setSetting('proxyPass', 'proxy-secret')

    const speechRow = service.db.prepare('SELECT api_key, config_json FROM stt_provider_profiles').get()
    assert.ok(speechRow.api_key.startsWith('safe:'))
    assert.equal(speechRow.config_json.includes('stt-secret'), false)
    const speechBlob = service.db.prepare("SELECT value FROM settings WHERE key = 'mediaSpeechSettings'").get().value
    assert.equal(speechBlob.includes('stt-secret'), false)

    const webImportRow = service.db.prepare("SELECT value FROM settings WHERE key = 'webImportSettings'").get().value
    assert.equal(webImportRow.includes('jina-secret'), false)
    assert.ok(webImportRow.startsWith('safe:'))
    assert.equal(service.getSetting('webImportSettings').providers.jina.apiKey, 'jina-secret')

    const proxyRow = service.db.prepare("SELECT value FROM settings WHERE key = 'proxyPass'").get().value
    assert.equal(proxyRow.includes('proxy-secret'), false)
    assert.equal(service.getSetting('proxyPass'), 'proxy-secret')

    assert.equal(service.getSetting('mediaSpeechSettings').providers.local_asr.apiKey, 'stt-secret')
  } finally {
    service.close()
  }
})

test('migrates existing plaintext keys when encryption becomes available', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sapere-secret-migration-'))
  const dbPath = path.join(root, 'workspace.db')
  const plain = new DatabaseService()
  try {
    plain.init(dbPath)
    plain.setSetting('providers', [provider('sk-legacy-plain')])
    plain.setSetting('proxyPass', 'legacy-proxy')
  } finally {
    plain.close()
  }

  const encrypted = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    encrypted.init(dbPath)
    const row = encrypted.db.prepare('SELECT api_key FROM llm_provider_profiles').get()
    assert.ok(row.api_key.startsWith('safe:'))
    const compatibility = encrypted.db.prepare("SELECT value FROM settings WHERE key = 'providers'").get().value
    assert.equal(compatibility.includes('sk-legacy-plain'), false)
    assert.equal(encrypted.db.prepare("SELECT value FROM settings WHERE key = 'proxyPass'").get().value.includes('legacy-proxy'), false)
    assert.equal(encrypted.getSetting('providers')[0].apiKey, 'sk-legacy-plain')
    assert.equal(encrypted.getSetting('proxyPass'), 'legacy-proxy')
  } finally {
    encrypted.close()
    await fs.promises.rm(root, { recursive: true, force: true })
  }
})

test('legacy settings rows are migrated into typed tables instead of losing keys', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sapere-legacy-secret-'))
  const dbPath = path.join(root, 'workspace.db')
  const plain = new DatabaseService()
  try {
    plain.init(dbPath)
    const legacyProviders = JSON.stringify([provider('sk-only-in-legacy-row')])
    plain.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('providers', ?)").run(legacyProviders)
    plain.db.prepare('DELETE FROM llm_model_profiles').run()
    plain.db.prepare('DELETE FROM llm_provider_profiles').run()
    const legacySpeech = JSON.stringify({
      version: 2,
      defaultProviderId: 'local_asr',
      providers: { local_asr: { name: 'Local', apiKey: 'stt-only-in-blob', model: 'whisper-1' } },
    })
    plain.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('mediaSpeechSettings', ?)").run(legacySpeech)
  } finally {
    plain.close()
  }

  const encrypted = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    encrypted.init(dbPath)
    assert.equal(encrypted.getSetting('providers')[0].apiKey, 'sk-only-in-legacy-row')
    assert.equal(encrypted.getSetting('mediaSpeechSettings').providers.local_asr.apiKey, 'stt-only-in-blob')
    const providerRow = encrypted.db.prepare('SELECT api_key FROM llm_provider_profiles').get()
    assert.ok(providerRow.api_key.startsWith('safe:'))
    const speechRow = encrypted.db.prepare('SELECT api_key FROM stt_provider_profiles').get()
    assert.ok(speechRow.api_key.startsWith('safe:'))
    assert.equal(encrypted.db.prepare("SELECT value FROM settings WHERE key = 'providers'").get().value.includes('sk-only-in-legacy-row'), false)
    assert.equal(encrypted.db.prepare("SELECT value FROM settings WHERE key = 'mediaSpeechSettings'").get().value.includes('stt-only-in-blob'), false)
  } finally {
    encrypted.close()
    await fs.promises.rm(root, { recursive: true, force: true })
  }
})

test('redacted image and web-import exports keep local credentials on import', () => {
  const service = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    service.init(':memory:')
    service.setSetting('imageModels', [{ id: 'images', apiKey: 'image-local-key', models: [] }])
    service.setSetting('webImportSettings', {
      version: 1,
      selectedProvider: 'jina',
      providers: { jina: { baseUrl: 'https://r.jina.ai', apiKey: 'jina-local-key' } },
    })

    const exported = createSettingsTransfer(service.getAllSettings())
    assert.equal(exported.data.settings.imageModels[0].apiKey, '')
    assert.equal(exported.data.settings.imageModels[0].apiKeyRedacted, true)
    assert.equal(exported.data.settings.webImportSettings.providers.jina.apiKey, '')
    assert.equal(exported.data.settings.webImportSettings.providers.jina.apiKeyRedacted, true)
    assert.equal(JSON.stringify(exported).includes('image-local-key'), false)
    assert.equal(JSON.stringify(exported).includes('jina-local-key'), false)

    service.importSettings(parseSettingsTransfer(exported).settings)
    assert.equal(service.getSetting('imageModels')[0].apiKey, 'image-local-key')
    assert.equal(service.getSetting('webImportSettings').providers.jina.apiKey, 'jina-local-key')
  } finally {
    service.close()
  }
})

test('re-importing a redacted export keeps stored keys, while plaintext imports still replace them', () => {
  const service = new DatabaseService({ secretStore: new FakeSecretStore() })
  try {
    service.init(':memory:')
    service.setSetting('providers', [provider('sk-local-device')])

    const exported = createSettingsTransfer(service.getAllSettings(), { appVersion: 'test' })
    assert.equal(exported.data.settings.providers[0].apiKey, '')
    assert.equal(exported.data.settings.providers[0].apiKeyRedacted, true)

    const parsed = parseSettingsTransfer(exported)
    parsed.settings.providers[0].baseUrl = 'https://proxy.example.com/v1'
    service.importSettings(parsed.settings)
    const afterRedactedImport = service.getSetting('providers')[0]
    assert.equal(afterRedactedImport.apiKey, 'sk-local-device')
    assert.equal(afterRedactedImport.baseUrl, 'https://proxy.example.com/v1')
    assert.equal(service.db.prepare('SELECT api_key FROM llm_provider_profiles').get().api_key.includes('sk-local-device'), false)

    service.importSettings({ providers: [provider('sk-replaced-by-import')] })
    assert.equal(service.getSetting('providers')[0].apiKey, 'sk-replaced-by-import')
  } finally {
    service.close()
  }
})
