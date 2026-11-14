import { getAppVersion } from '@/utils/tools'
import { BRAND } from '@/config/brand'

export const BETA_RELEASE = {
  enabled: false,
  batch: 'sapere-development',
  expiresAt: null,
  downloadUrl: BRAND.releases,
  fallbackLabel: 'Sapere 项目发布页',
  latestVersion: getAppVersion(),
  releaseNotes: BRAND.updateNotice,
  productName: BRAND.name,
  updateSources: [],
}

export function isBetaExpired(now = new Date()) {
  if (!BETA_RELEASE.enabled || !BETA_RELEASE.expiresAt) return false
  return now.getTime() >= new Date(BETA_RELEASE.expiresAt).getTime()
}

export function formatBetaDate(value) {
  if (!value) return '未设置'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', hour12: false,
  }).format(new Date(value))
}
