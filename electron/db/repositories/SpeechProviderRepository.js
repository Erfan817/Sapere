import { parseJSON, stringifyJSON } from '../helpers.js'
import { BaseRepository } from './BaseRepository.js'

const DEFAULT_STT_PROVIDER_ID = 'local_asr'

function providerIdFromModelRef(value) {
  const ref = String(value || '')
  const separator = ref.indexOf('::')
  return separator > 0 ? ref.slice(0, separator) : ref
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeSttSettings(value) {
  const parsed = typeof value === 'string' ? parseJSON(value) : value
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('语音转文字配置必须是对象')
  const providers = parsed.providers && typeof parsed.providers === 'object' && !Array.isArray(parsed.providers)
    ? parsed.providers
    : {}
  const normalizedProviders = {}
  for (const [id, source] of Object.entries(providers)) {
    const providerId = String(id || '').trim()
    if (!providerId) throw new Error('语音转文字服务商缺少 ID')
    const config = objectValue(source)
    normalizedProviders[providerId] = { ...config, model: String(config.model || '') }
  }
  return {
    version: Number(parsed.version) || 2,
    defaultProviderId: String(parsed.defaultProviderId || DEFAULT_STT_PROVIDER_ID),
    providers: normalizedProviders,
  }
}

export class SpeechProviderRepository extends BaseRepository {
  _tableName(kind) {
    if (kind === 'stt') return 'stt_provider_profiles'
    if (kind === 'tts') return 'tts_provider_profiles'
    throw new Error(`未知语音服务类型：${kind}`)
  }

  _tableExists(table) {
    return Boolean(this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table))
  }

  isAvailable(kind = 'stt') {
    return this._tableExists(this._tableName(kind))
  }

  _readProfiles(kind) {
    const table = this._tableName(kind)
    if (!this._tableExists(table)) return []
    return this.db.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`).all()
  }

  _profileFromRow(row) {
    const config = objectValue(parseJSON(row.config_json))
    const profile = { ...config }
    if (Object.prototype.hasOwnProperty.call(config, 'name')) profile.name = row.name
    if (Object.prototype.hasOwnProperty.call(config, 'adapterId')) profile.adapterId = row.adapter_id
    if (Object.prototype.hasOwnProperty.call(config, 'baseUrl')) profile.baseUrl = row.base_url
    if (Object.prototype.hasOwnProperty.call(config, 'model')) profile.model = row.model_id
    if (Object.prototype.hasOwnProperty.call(config, 'enabled')) profile.enabled = Boolean(row.enabled)
    const storedKey = row.api_key || config.apiKey || ''
    const codec = this.context.secretCodec
    profile.apiKey = codec ? codec.decrypt(storedKey) : storedKey
    return profile
  }

  getSttSettings() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'mediaSpeechDefaultProviderId'").get()
    const modelRefRow = this.db.prepare("SELECT value FROM settings WHERE key = 'defaultSttModelRef'").get()
    const defaultProviderId = String(
      providerIdFromModelRef(parseJSON(modelRefRow?.value))
      || parseJSON(row?.value)
      || DEFAULT_STT_PROVIDER_ID,
    )
    const providers = Object.fromEntries(this._readProfiles('stt').map(profile => [profile.id, this._profileFromRow(profile)]))
    return { version: 2, defaultProviderId, providers }
  }

  replaceSttSettings(value) {
    const settings = normalizeSttSettings(value)
    if (!this.isAvailable('stt')) throw new Error('语音转文字服务商表尚未初始化')

    const replace = this.db.transaction(() => {
      this.db.prepare('DELETE FROM stt_provider_profiles').run()
      const insert = this.db.prepare(`
        INSERT INTO stt_provider_profiles
          (id, name, adapter_id, base_url, api_key, model_id, enabled, sort_order, config_json)
        VALUES (@id, @name, @adapter_id, @base_url, @api_key, @model_id, @enabled, @sort_order, @config_json)
      `)
      Object.entries(settings.providers).forEach(([id, source], sortOrder) => {
        const config = { ...source }
        delete config.apiKey
        insert.run({
          id,
          name: String(source.name || ''),
          adapter_id: String(source.adapterId || ''),
          base_url: String(source.baseUrl || ''),
          api_key: this.context.secretCodec.encrypt(source.apiKey),
          model_id: String(source.model || ''),
          enabled: source.enabled ? 1 : 0,
          sort_order: sortOrder,
          config_json: stringifyJSON(config),
        })
      })
      const defaultModelId = String(settings.providers[settings.defaultProviderId]?.model || '')
      const defaultModelRef = defaultModelId
        ? `${settings.defaultProviderId}::${defaultModelId}`
        : settings.defaultProviderId
      this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('defaultSttModelRef', JSON.stringify(defaultModelRef))
      this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('mediaSpeechDefaultProviderId', JSON.stringify(settings.defaultProviderId))
      // Keep the legacy blob shape without credentials; the encrypted table is authoritative.
      const portable = {
        ...settings,
        providers: Object.fromEntries(Object.entries(settings.providers).map(([id, profile]) => [id, { ...profile, apiKey: '' }])),
      }
      this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('mediaSpeechSettings', JSON.stringify(portable))
    })
    replace()
    return this.getSttSettings()
  }

  migrateLegacySttSettings(value) {
    if (!this.isAvailable('stt')) return { migrated: false }
    const parsed = typeof value === 'string' ? parseJSON(value) : value
    if (!parsed || typeof parsed !== 'object') return { migrated: false }
    if (this.db.prepare('SELECT COUNT(*) AS count FROM stt_provider_profiles').get().count > 0) {
      return { migrated: false, count: this._readProfiles('stt').length }
    }
    if (!parsed.providers || typeof parsed.providers !== 'object') return { migrated: false }
    const settings = this.replaceSttSettings(parsed)
    return { migrated: true, count: Object.keys(settings.providers).length }
  }

  encryptStoredKeys() {
    if (!this.context.secretCodec?.available) return 0
    let changed = 0
    for (const kind of ['stt', 'tts']) {
      const table = this._tableName(kind)
      if (!this._tableExists(table)) continue
      const rows = this.db.prepare(`SELECT id, api_key, config_json FROM ${table}`).all()
      const update = this.db.prepare(`UPDATE ${table} SET api_key = ?, config_json = ? WHERE id = ?`)
      for (const row of rows) {
        const config = objectValue(parseJSON(row.config_json))
        const hadConfigKey = Object.prototype.hasOwnProperty.call(config, 'apiKey')
        const storedKey = row.api_key || config.apiKey || ''
        const encrypted = this.context.secretCodec.encrypt(storedKey)
        if (!hadConfigKey && encrypted === row.api_key) continue
        delete config.apiKey
        update.run(encrypted, stringifyJSON(config), row.id)
        changed += 1
      }
    }
    return changed
  }

}
