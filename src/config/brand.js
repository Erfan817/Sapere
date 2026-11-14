// User-facing project identity. Internal storage/protocol keys remain compatible.
export const BRAND = Object.freeze({
  name: 'Sapere',
  displayName: 'Sapere · 致知',
  description: '本地优先的 AI 工作台：围绕你的资料，帮助你学习、写作与创作。',
  repository: 'https://github.com/Erfan817/Sapere',
  issues: 'https://github.com/Erfan817/Sapere/issues',
  releases: 'https://github.com/Erfan817/Sapere/releases',
  documentation: 'https://github.com/Erfan817/Sapere#readme',
  // Installable Sapere releases and a verified update feed are not available yet.
  updatesEnabled: false,
  updateNotice: 'Sapere 当前为本地开发版，尚未启用安装包自动更新。请在项目仓库查看进展。',
})
