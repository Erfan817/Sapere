<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { BRAND } from '@/config/brand'
import BrandLogo from '@/components/BrandLogo.vue'

const appStore = useAppStore()
const isDark = computed(() => appStore.isDark)
function open(url) {
  if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url).catch(console.error)
  else window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-5">
    <section class="rounded-xl p-6" :class="isDark ? 'bg-d3 border border-bdr' : 'bg-l3 border border-bdrF'">
      <div class="flex items-center gap-4">
        <BrandLogo class="w-16 h-16" />
        <div>
          <h1 class="text-xl font-bold" :class="isDark ? 'text-wt-main' : 'text-lt-main'">Sapere · 致知</h1>
          <p class="text-sm mt-1" :class="isDark ? 'text-wt-aux' : 'text-lt-aux'">Sapere aude — 敢于求知</p>
        </div>
      </div>
      <p class="text-sm leading-relaxed mt-5" :class="isDark ? 'text-wt-sub' : 'text-lt-sub'">{{ BRAND.description }}</p>
      <p class="text-sm leading-relaxed mt-3" :class="isDark ? 'text-wt-aux' : 'text-lt-aux'">
        由 Erfan817 维护的个人学习项目。当前处于本地开发阶段：先让资料和笔记可靠保存，再逐步建设课程、练习、学习记录与复习。
      </p>
      <div class="flex flex-wrap gap-3 mt-5">
        <button class="px-4 py-2 rounded-lg text-sm border" :class="isDark ? 'border-bdr text-wt-main' : 'border-bdrF text-lt-main'" @click="open(BRAND.repository)">项目仓库</button>
        <button class="px-4 py-2 rounded-lg text-sm border" :class="isDark ? 'border-bdr text-wt-main' : 'border-bdrF text-lt-main'" @click="open(BRAND.issues)">问题与建议</button>
      </div>
    </section>
    <section class="rounded-xl p-6 text-sm leading-relaxed" :class="isDark ? 'bg-d3 border border-bdr text-wt-sub' : 'bg-l3 border border-bdrF text-lt-sub'">
      <h2 class="font-semibold mb-3">项目进展</h2>
      <ul class="list-disc pl-5 space-y-2">
        <li>已验证：Windows 本机启动、独立工作区、笔记关闭重启后恢复、黑白标志接入。</li>
        <li>建设中：精选学习包、持久学习记录、练习反馈与间隔复习。</li>
        <li>目前没有已验收的 Sapere 安装包、官方账号、付费云模型、交流群或赞助渠道。</li>
      </ul>
    </section>
    <section class="rounded-xl p-6 text-sm leading-relaxed" :class="isDark ? 'bg-d3 border border-bdr text-wt-aux' : 'bg-l3 border border-bdrF text-lt-aux'">
      <h2 class="font-semibold mb-3" :class="isDark ? 'text-wt-main' : 'text-lt-main'">开源来源与致谢</h2>
      <p>Sapere 基于 Reviva 二次开发，感谢原作者明辰及上游贡献者。上游代码的作者、版权、历史和许可归属保持不变；本项目新增内容和原创标志不代表对上游成果的重新署名。</p>
      <p class="mt-3">工程沿用上游声明的 AGPL-3.0；原始授权说明存于仓库 docs/upstream/。第三方依赖、技能、字体和图标保留各自许可。本项目没有授予额外商业授权。</p>
      <button class="underline underline-offset-4 mt-3" @click="open('https://github.com/mingchen666/Reviva')">查看上游来源</button>
    </section>
  </div>
</template>

<style scoped>
button { color: #26312b; }
:global(.theme-dark) button { color: #e4e4e7; }
</style>
