import { getAppVersion } from '@/utils/tools'
import { BRAND } from '@/config/brand'

export const RELEASE_CONFIG = {
  downloadUrl: BRAND.releases,
  fallbackLabel: 'Sapere 项目发布页',
  latestVersion: getAppVersion(),
  releaseNotes: BRAND.updateNotice,
  updatesEnabled: BRAND.updatesEnabled,
  updateSources: [],
}

// Only changes actually made in this project; do not present upstream history as ours.
export const versionChangelog = [
  { type: 'new', text: '建立 Sapere 项目与开发环境，明确本地学习工作空间的建设方向。' },
  { type: 'improve', text: '接入黑白「启页」标志，支持浅色与深色界面。' },
  { type: 'improve', text: '统一项目名称、引导、帮助与反馈入口，保留上游来源说明。' },
  { type: 'fix', text: '验证独立工作区和 Markdown 笔记在应用重启后保留。' },
]
