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
      <header><h1 class="text-2xl font-bold">Sapere · 致知使用说明</h1><p class="mt-2">本地开发版 · 更新于 2026-11-14</p></header>
      <section><h2 class="font-semibold mb-2">项目范围</h2><p>Sapere 是个人维护的桌面学习工作空间，目前处于开发与验证阶段。课程组织、学习记录和复习能力分阶段建设，页面出现的入口不代表所有服务均已上线。阅读和本地资料管理不要求注册 Sapere 账号；本项目没有官方账号、订阅或充值服务。</p></section>
      <section><h2 class="font-semibold mb-2">模型与第三方服务</h2><p>AI、OCR、语音、搜索、外部知识库等能力可能需要自行配置服务。连接第三方账号或模型时，费用、使用条件和数据处理受相应服务商规则约束，不构成本项目的云服务承诺。模型输出可能错误，请核对来源及重要结论。</p></section>
      <section><h2 class="font-semibold mb-2">资料与备份</h2><p>请使用有权处理的资料，留意导入内容、生成内容与第三方素材的权利要求。重要资料应自行备份；开发中的版本可能存在功能缺陷，已验证的场景不代表所有数据恢复情况均有保障。</p></section>
      <section><h2 class="font-semibold mb-2">开源来源与权利归属</h2><p>Sapere 基于 Reviva 二次开发，保留原作者明辰及上游贡献者的历史、版权和许可声明。上游代码、第三方技能、依赖及素材仍归相应权利人，本项目不宣称拥有全部知识产权。工程沿用上游的 AGPL-3.0 声明，原始许可说明保存在仓库 docs/upstream/；本页不替代或缩减适用开源许可授予的权利。</p></section>
      <section><h2 class="font-semibold mb-2">反馈</h2><p>问题和建议通过项目仓库提交，不在公开反馈中附 API Key、密码或私人资料。</p><a :href="BRAND.issues" target="_blank" rel="noopener noreferrer" class="underline">Sapere 问题反馈</a></section>
      <router-link class="underline" to="/legal/privacy-policy">查看数据与隐私说明</router-link>
    </div>
  </article>
</template>

<style scoped>
a, button { color: inherit; }
</style>
