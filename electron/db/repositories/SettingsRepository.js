import { serializeTransferredSetting } from '../../SettingsTransferService.js'
import { parseJSON, stringifyJSON } from '../helpers.js'
import { SECRET_PREFIX, withoutProviderSecrets } from '../SecretCodec.js'
import { BaseRepository } from './BaseRepository.js'
import { ModelProviderRepository } from './ModelProviderRepository.js'
import { SpeechProviderRepository } from './SpeechProviderRepository.js'
import { ImageProviderRepository } from './ImageProviderRepository.js'

// Settings stored as JSON blobs that contain credentials.
const SECRET_SETTING_KEYS = new Set([
  'webImportSettings',
  'proxyPass',
  'mediaBilibiliCookieValue',
])
// Compatibility copies written by provider migrations before typed tables existed.
const LEGACY_PROVIDER_SETTING_KEYS = new Set(['providers', 'imageModels'])

function isPlainObjectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

// Re-importing a redacted export keeps the credentials currently on this device.
function restoreRedactedProviders(incoming, existing) {
  if (!Array.isArray(incoming)) return incoming
  const previous = new Map((Array.isArray(existing) ? existing : []).map(provider => [provider?.id, provider]))
  return incoming.map(provider => {
    if (!isPlainObjectValue(provider)) return provider
    const { apiKeyRedacted, ...rest } = provider
    if (!apiKeyRedacted) return rest
    return { ...rest, apiKey: String(previous.get(provider.id)?.apiKey || '') }
  })
}

function restoreRedactedWebImportSecrets(incoming, existing) {
  if (!isPlainObjectValue(incoming) || !isPlainObjectValue(incoming.providers)) return incoming
  const previousProviders = isPlainObjectValue(existing?.providers) ? existing.providers : {}
  const providers = {}
  for (const [id, config] of Object.entries(incoming.providers)) {
    if (!isPlainObjectValue(config)) { providers[id] = config; continue }
    const { apiKeyRedacted, ...rest } = config
    providers[id] = apiKeyRedacted
      ? { ...rest, apiKey: String(previousProviders[id]?.apiKey || '') }
      : rest
  }
  return { ...incoming, providers }
}

export class SettingsRepository extends BaseRepository {
  constructor(context) {
    super(context)
    this._modelProviders = new ModelProviderRepository(context)
    this._speechProviders = new SpeechProviderRepository(context)
    this._imageProviders = new ImageProviderRepository(context)
  }

  _decodeValue(key, rawValue) {
    const parsed = parseJSON(rawValue)
    if (SECRET_SETTING_KEYS.has(key) && typeof parsed === 'string' && parsed.startsWith(SECRET_PREFIX)) {
      const decrypted = this.context.secretCodec.decrypt(parsed)
      return decrypted ? parseJSON(decrypted) : null
    }
    return parsed
  }

  _encodeValue(key, value) {
    if (SECRET_SETTING_KEYS.has(key) && value !== '' && value !== null && value !== undefined && this.context.secretCodec.available) {
      const plain = JSON.stringify(value)
      if (plain !== undefined) return stringifyJSON(this.context.secretCodec.encrypt(plain))
    }
    return stringifyJSON(value)
  }

  getSetting(key) {
    if (key === 'providers' && this._modelProviders.isAvailable()) {
      return this._modelProviders.listProviders()
    }
    if (key === 'mediaSpeechSettings' && this._speechProviders.isAvailable('stt')) {
      return this._speechProviders.getSttSettings()
    }
    if (key === 'imageModels' && this._imageProviders.isAvailable()) {
      return this._imageProviders.listProviders()
    }
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? this._decodeValue(key, row.value) : null
  }

  setSetting(key, value) {
    if (key === 'providers' && this._modelProviders.isAvailable()) {
      this._modelProviders.replaceProviders(value)
      return { success: true }
    }
    if (key === 'mediaSpeechSettings' && this._speechProviders.isAvailable('stt')) {
      this._speechProviders.replaceSttSettings(value)
      return { success: true }
    }
    if (key === 'imageModels' && this._imageProviders.isAvailable()) {
      this._imageProviders.replaceProviders(value)
      return { success: true }
    }
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, this._encodeValue(key, value))
    return { success: true }
  }

  getAllSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all()
    const result = {}
    for (const row of rows) result[row.key] = this._decodeValue(row.key, row.value)
    if (this._modelProviders.isAvailable()) result.providers = this._modelProviders.listProviders()
    if (this._speechProviders.isAvailable('stt')) result.mediaSpeechSettings = this._speechProviders.getSttSettings()
    if (this._imageProviders.isAvailable()) result.imageModels = this._imageProviders.listProviders()
    return result
  }

  importSettings(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('配置内容必须是对象')
    }
    const entries = Object.entries(settings)
    const statement = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    const apply = this.db.transaction(items => {
      for (const [key, rawValue] of items) {
        if (key === 'providers' && this._modelProviders.isAvailable()) {
          this._modelProviders.replaceProviders(restoreRedactedProviders(rawValue, this._modelProviders.listProviders()))
        } else if (key === 'mediaSpeechSettings' && this._speechProviders.isAvailable('stt')) {
          this._speechProviders.replaceSttSettings(rawValue)
        } else if (key === 'imageModels' && this._imageProviders.isAvailable()) {
          this._imageProviders.replaceProviders(restoreRedactedProviders(rawValue, this._imageProviders.listProviders()))
        } else {
          const value = key === 'webImportSettings'
            ? restoreRedactedWebImportSecrets(rawValue, this.getSetting('webImportSettings'))
            : rawValue
          statement.run(key, this._encodeValue(key, value))
        }
      }
    })
    apply(entries)
    return { count: entries.length }
  }

  encryptStoredSecrets() {
    if (!this.context.secretCodec.available) {
      return { modelProviders: 0, imageProviders: 0, speechProviders: 0, settings: 0 }
    }
    const modelProviders = this._modelProviders.encryptStoredKeys()
    const imageProviders = this._imageProviders.encryptStoredKeys()
    const speechProviders = this._speechProviders.encryptStoredKeys()
    let settings = 0

    for (const key of SECRET_SETTING_KEYS) {
      const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      if (!row) continue
      const parsed = parseJSON(row.value)
      if (typeof parsed === 'string' && parsed.startsWith(SECRET_PREFIX)) continue
      if (parsed === null || parsed === '' || parsed === undefined) continue
      this.db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(this._encodeValue(key, parsed), key)
      settings += 1
    }

    for (const key of LEGACY_PROVIDER_SETTING_KEYS) {
      const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      if (!row) continue
      const typedTableAvailable = key === 'providers' ? this._modelProviders.isAvailable() : this._imageProviders.isAvailable()
      if (!typedTableAvailable) continue
      let migrated = false
      try {
        migrated = key === 'providers'
          ? this._modelProviders.migrateLegacyProviders(row.value).migrated
          : this._imageProviders.migrateLegacyImageProviders(row.value).migrated
      } catch { /* typed table handles its own migration */ }
      // Never drop credentials from a legacy row into an empty typed table.
      if (migrated) { settings += 1; continue }
      const parsed = parseJSON(row.value)
      if (!Array.isArray(parsed)) continue
      if (parsed.some(provider => String(provider?.apiKey || ''))) {
        this.db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(withoutProviderSecrets(parsed)), key)
        settings += 1
      }
    }

    const speechRow = this.db.prepare("SELECT value FROM settings WHERE key = 'mediaSpeechSettings'").get()
    const speechBlob = parseJSON(speechRow?.value)
    if (isPlainObjectValue(speechBlob) && isPlainObjectValue(speechBlob.providers)
      && Object.values(speechBlob.providers).some(profile => String(profile?.apiKey || ''))) {
      const speechTableAvailable = this._speechProviders.isAvailable('stt')
      let migrated = false
      try { migrated = this._speechProviders.migrateLegacySttSettings(speechBlob).migrated } catch { /* keep blob */ }
      if (migrated) {
        settings += 1
      } else if (speechTableAvailable) {
        const portable = {
          ...speechBlob,
          providers: Object.fromEntries(Object.entries(speechBlob.providers).map(([id, profile]) => [id, { ...profile, apiKey: '' }])),
        }
        this.db.prepare("UPDATE settings SET value = ? WHERE key = 'mediaSpeechSettings'").run(JSON.stringify(portable))
        settings += 1
      }
    }

    return { modelProviders, imageProviders, speechProviders, settings }
  }
}
