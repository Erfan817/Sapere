<script setup>
import { computed } from 'vue';
import BrandLogo from '@/components/BrandLogo.vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useAutoUpdate } from '@/composables/useAutoUpdate';
import { getAppVersion } from '@/utils/tools';
import { versionChangelog } from '@/config/release';
import { BRAND } from '@/config/brand';

const appVersion = getAppVersion();
const router = useRouter();
const appStore = useAppStore();
const isDark = computed(() => appStore.isDark);
const { checking, updateInfo, error, lastCheckStatus, lastCheckMessage, checkForUpdate } =
  useAutoUpdate();

const updateNotice = computed(() => {
  if (checking.value) return '正在检查更新...';
  if (updateInfo.value?.version)
    return `发现新版本 v${updateInfo.value.version}，请在更新弹窗中继续处理。`;
  if (error.value) return BRAND.updateNotice;
  if (lastCheckStatus.value === 'not-available')
    return lastCheckMessage.value || '当前已是最新版本。';
  return '';
});

const changelogTypeMap = {
  new: { label: '新增', tone: 'emerald' },
  improve: { label: '优化', tone: 'brand' },
  fix: { label: '修复', tone: 'amber' },
};

function go(route) {
  if (!route) return;
  router.push(route);
}

function checkUpdate() {
  checkForUpdate();
}

function openExternal(url) {
  if (!url) return;
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url).catch(console.error);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function toneClass(tone) {
  const dark = {
    brand: 'bg-brand-400/10 text-brand-400 border-brand-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    rose: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  };
  const light = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  const palette = isDark.value ? dark : light;
  return palette[tone] || palette.brand;
}

</script>

<template>
  <div class="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-5">
    <!-- ═══ Hero ═══ -->
    <div
      class="rounded-xl p-5"
      :class="isDark ? 'bg-d3 border border-bdr' : 'bg-l3 border border-bdrF'"
    >
      <div class="flex items-start gap-4">
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          :class="isDark ? 'bg-d0' : 'bg-l2'"
        >
          <BrandLogo class="h-12 w-12" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2
                  class="text-[21px] font-bold"
                  :class="isDark ? 'text-wt-main' : 'text-lt-main'"
                >
                  Sapere · 致知
                </h2>
                <span
                  class="ctx-pill"
                  :class="
                    isDark
                      ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  "
                  >开发版</span
                >
                <span
                  class="ctx-pill font-mono"
                  :class="
                    isDark
                      ? 'bg-d0 text-wt-sub border border-bdr'
                      : 'bg-l2 text-lt-sub border border-bdrF'
                  "
                  >v{{ appVersion }}</span
                >
              </div>
              <p
                class="text-[12px] leading-relaxed mt-2 max-w-3xl"
                :class="isDark ? 'text-wt-aux' : 'text-lt-aux'"
              >
                围绕你的资料，帮助你理解、实践，并记住所学的桌面学习工作空间。当前为本地开发阶段，开源来源见「关于项目」。
              </p>
            </div>
            <button
              class="h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 border transition-colors"
              :disabled="checking"
              :class="
                isDark
                  ? 'bg-d0 border-bdr text-wt-sub hover:border-brand-400/30 disabled:opacity-60'
                  : 'bg-l2 border-bdrF text-lt-sub hover:border-brand-200 disabled:opacity-60'
              "
              @click="checkUpdate"
            >
              <i class="ri-refresh-line text-[12px]" :class="checking ? 'animate-spin' : ''" />
              {{ checking ? '检查中' : '检查更新' }}
            </button>
          </div>
          <div
            v-if="updateNotice"
            class="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-lg text-[11px]"
            :class="
              isDark
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            "
          >
            <i class="ri-information-line text-[12px]" />
            <span>{{ updateNotice }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 数据与隐私（原"关于 Reviva 1.0"，不再重复产品介绍） ═══ -->
    <div
      class="rounded-xl p-4"
      :class="isDark ? 'bg-d3 border border-bdr' : 'bg-l3 border border-bdrF'"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
          :class="toneClass('brand')"
        >
          <i class="ri-lock-2-line text-[16px]" />
        </div>
        <div class="min-w-0">
          <h3
            class="text-[13px] font-bold mb-1.5"
            :class="isDark ? 'text-wt-main' : 'text-lt-main'"
          >
            数据与隐私
          </h3>
          <p
            class="text-[12px] leading-relaxed flex-1"
            :class="isDark ? 'text-wt-aux' : 'text-lt-aux'"
          >
            对话、文档、笔记、知识库和 Agent 配置主要存储在本机工作区与 SQLite
            数据库中，可自由迁移、备份或删除。文件工具通过授权根目录和虚拟文件系统访问，减少误触敏感路径。是否向云端发送请求，取决于你配置的模型、OCR、语音和检索服务——使用前请留意对应服务商的数据政策与计费方式。
          </p>
        </div>
      </div>
    </div>

    <!-- ═══ 当前版本更新日志 ═══ -->
    <div class="rounded-xl p-4"
        :class="isDark ? 'bg-d3 border border-bdr' : 'bg-l3 border border-bdrF'"
    >
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <i class="ri-file-list-3-line text-brand-400 text-[18px]" />
          <span class="section-title" :class="isDark ? 'text-wt-sub' : 'text-lt-sub'"
            >当前版本更新日志</span
          >
        </div>
        <span class="text-[14px] font-mono" :class="isDark ? 'text-wt-dim' : 'text-lt-aux'"
          >v{{ appVersion }}</span
        >
      </div>

      <ul class="max-h-[280px] overflow-y-auto pr-1 -mt-1">
        <li
          v-for="(item, idx) in versionChangelog"
          :key="idx"
          class="flex items-baseline gap-2 py-2 border-b last:border-b-0"
          :class="isDark ? 'border-white/5' : 'border-black/5'"
        >
          <span
            class="shrink-0 w-4 text-[12px] font-mono font-semibold leading-relaxed"
            :class="isDark ? 'text-wt-dim' : 'text-lt-aux'"
          >
            {{ idx + 1 }}
          </span>
          <span
            class="shrink-0 px-1.5 rounded text-[11px] font-bold leading-relaxed border"
            :class="toneClass(changelogTypeMap[item.type]?.tone || 'brand')"
          >
            {{ changelogTypeMap[item.type]?.label || '更新' }}
          </span>
          <span
            class="text-[12px] leading-relaxed flex-1"
            :class="isDark ? 'text-wt-aux' : 'text-lt-aux'"
          >
            {{ item.text }}
          </span>
        </li>
      </ul>
    </div>

    <!-- ═══ 反馈与交流 ═══ -->
    <div
      class="rounded-xl p-4"
      :class="isDark ? 'bg-d3 border border-bdr' : 'bg-l3 border border-bdrF'"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
          :class="toneClass('emerald')"
        >
          <i class="ri-feedback-line text-[16px]" />
        </div>
        <div class="min-w-0 flex-1">
          <h3
            class="text-[13px] font-bold mb-1.5"
            :class="isDark ? 'text-wt-main' : 'text-lt-main'"
          >
            反馈与交流
          </h3>
          <p
            class="text-[12px] leading-relaxed mb-3"
            :class="isDark ? 'text-wt-aux' : 'text-lt-aux'"
          >
            使用中遇到问题或有功能建议，请向 Sapere 项目提交 Issue。当前尚未设立官方邮箱、交流群或赞助渠道。
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              class="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all"
              :class="isDark ? 'bg-brand-400/12 border-brand-400/25 text-brand-300 hover:bg-brand-400/20 hover:border-brand-400/40' : 'bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100 hover:border-brand-300'"
              @click="go('/settings/guide')"
            >
              <i class="ri-graduation-cap-line text-[12px]" />
              新手教程
              <i class="ri-arrow-right-up-line text-[9px] opacity-50" />
            </button>
            <button
              class="h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-colors"
              :class="isDark ? 'bg-d0 border-bdr text-wt-sub hover:border-brand-400/30' : 'bg-l2 border-bdrF text-lt-sub hover:border-brand-200'"
              @click="openExternal(BRAND.issues)"
            >
              <i class="ri-bug-line text-[12px]" />
              提交反馈
            </button>

            <button
              class="h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-colors"
              :class="isDark ? 'bg-d0 border-bdr text-wt-sub hover:border-purple-400/30' : 'bg-l2 border-bdrF text-lt-sub hover:border-purple-200'"
              @click="go('/settings/author')"
            >
              <i class="ri-user-heart-line text-[12px]" />
              关于项目
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Footer ═══ -->
    <p class="text-center text-[12px]" :class="isDark ? 'text-wt-dim' : 'text-lt-aux'">
      Sapere · 致知 · v{{ appVersion }} · 本地开发版 · 开源来源见关于项目
    </p>
  </div>
</template>
