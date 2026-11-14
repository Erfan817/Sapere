<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import BrandLogo from '@/components/BrandLogo.vue'
const appStore = useAppStore()
const router = useRouter()
const isDark = computed(() => appStore.isDark)
</script>
<template>
  <section class="max-w-3xl mx-auto m-6 p-6 rounded-xl text-sm leading-relaxed" :class="isDark ? 'bg-d3 text-wt-sub border border-bdr' : 'bg-l3 text-lt-sub border border-bdrF'">
    <BrandLogo class="h-14 w-14 mb-4" />
    <h1 class="text-xl font-bold mb-3">Sapere · 致知本地工作空间</h1>
    <p>当前不需要 Sapere 账号，也没有已开通的官方会员、订阅或充值服务。你的本地资料与模型配置可以在设置中管理。</p>
    <p class="mt-3">如使用兼容的第三方账号接口，身份和服务由所配置的服务商提供；本项目不展示虚构用户、额度或云端连接状态。</p>
    <div class="flex flex-wrap gap-4 mt-5">
      <button class="underline" @click="router.push('/settings/models')">配置自己的模型</button>
      <button class="underline" @click="router.push('/settings/data')">数据与备份</button>
      <button class="underline" @click="router.push('/legal/privacy-policy')">数据与隐私说明</button>
    </div>
  </section>
</template>
