// Local at-rest protection for user-provided credentials.
// Uses Electron safeStorage (DPAPI on Windows, Keychain on macOS, keyring on Linux).
// Values written before this existed are plain strings and remain readable.
export const SECRET_PREFIX = 'safe:'

function encryptionAvailable(secretStore) {
  if (!secretStore || typeof secretStore.encryptString !== 'function') return false
  try {
    return typeof secretStore.isEncryptionAvailable !== 'function' || secretStore.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function createSecretCodec(secretStore = null) {
  const available = encryptionAvailable(secretStore)
  return {
    available,
    isEncrypted(value) {
      return String(value || '').startsWith(SECRET_PREFIX)
    },
    encrypt(value) {
      const text = String(value ?? '')
      if (!text || this.isEncrypted(text) || !available) return text
      try {
        return SECRET_PREFIX + secretStore.encryptString(text).toString('base64')
      } catch {
        return text
      }
    },
    decrypt(value) {
      const text = String(value ?? '')
      if (!this.isEncrypted(text)) return text
      if (!secretStore || typeof secretStore.decryptString !== 'function') return ''
      try {
        return secretStore.decryptString(Buffer.from(text.slice(SECRET_PREFIX.length), 'base64'))
      } catch {
        return ''
      }
    },
  }
}

// A provider keeps its key only in the encrypted column; the compatibility
// settings row stores the catalog without secrets so no plaintext copy remains.
export function withoutProviderSecrets(providers) {
  if (!Array.isArray(providers)) return providers
  return providers.map(provider => {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) return provider
    const { apiKey, apiKeyRedacted, ...rest } = provider
    return { ...rest, apiKey: '' }
  })
}
