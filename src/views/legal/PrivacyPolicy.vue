<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { BRAND } from '@/config/brand'
const router = useRouter()
const appStore = useAppStore()
const isDark = computed(() => appStore.isDark)
</script>
<template>
  <article class="h-full overflow-y-auto p-6" :class="isDark ? 'text-wt-sub bg-d1' : 'text-lt-sub bg-l1'">
    <div class="max-w-3xl mx-auto space-y-6 text-sm leading-relaxed">
      <button class="underline" @click="router.back()">返回</button>
      <header><h1 class="text-2xl font-bold">Sapere · 致知数据与隐私说明</h1><p class="mt-2">本地开发版 · 更新于 2026-11-14</p></header>
      <section><h2 class="font-semibold mb-2">本地数据</h2><p>资料、笔记、对话、工作区注册信息及偏好主要保存在本机的文件、SQLite 和浏览器会话存储中。开发环境默认使用项目下的 .sapere 隔离数据目录；工作区内仍有沿用底座的兼容目录和格式。这些路径是实现细节，不代表独立的外部服务。</p></section>
      <section><h2 class="font-semibold mb-2">联网与数据发送</h2><p>本地优先不等于全部离线。使用云模型、OCR、语音、搜索、网页导入、外部知识库、MCP 或第三方账号服务时，相关输入、引用资料及必要请求信息可能发送至你配置的目标。数据留存、训练用途、地域和计费应以服务商政策及配置为准；本项目不声称已与所有服务商签署数据处理协议。</p></section>
      <section><h2 class="font-semibold mb-2">密钥、日志与访问</h2><p>API Key 和服务配置可能保存在本机。不要把配置导出包、日志、截图或整个工作区未经检查地公开。文件与命令工具受授权目录和应用权限限制，但不能据此承诺所有运行情形均已完成安全审计。</p></section>
      <section><h2 class="font-semibold mb-2">账号和云服务</h2><p>Sapere 当前没有自营账号、云同步、充值或订阅服务。兼容的第三方服务入口按实际配置连接，受对应运营者规则约束。本页不承诺不存在的专属云服务器、全盘加密或固定响应时限。</p></section>
      <section><h2 class="font-semibold mb-2">查看、导出和删除</h2><p>可在应用中查看本地资料，并使用数据与备份功能导出配置或工作区。删除、清理或迁移前先备份；只复制数据库不能代替备份笔记正文和其他文件。第三方持有的数据需要向实际服务商管理或申请删除。</p></section>
      <section><h2 class="font-semibold mb-2">联系与变更</h2><p>说明随实现变化更新。可在 Sapere 项目仓库反馈与数据处理相关的问题；请勿在公开 Issue 中提交私人资料或凭据。</p><a :href="BRAND.issues" target="_blank" rel="noopener noreferrer" class="underline">Sapere 问题反馈</a></section>
      <router-link class="underline" to="/legal/user-agreement">查看使用说明与开源来源</router-link>
    </div>
  </article>
</template>

<style scoped>
a, button { color: inherit; }
</style>
