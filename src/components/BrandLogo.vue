<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import lightLogo from '@/assets/brand/sapere-symbol-small.svg'
import darkLogo from '@/assets/brand/sapere-symbol-small-white.svg'

const props = defineProps({
  // Leave unset to follow the app's active light/dark theme.
  dark: { type: Boolean, default: undefined },
})
const appStore = useAppStore()
const source = computed(() => (props.dark ?? appStore.isDark) ? darkLogo : lightLogo)
</script>

<template>
  <img :src="source" alt="Sapere 致知" class="brand-logo" draggable="false" />
</template>

<style scoped>
.brand-logo {
  object-fit: contain;
  flex-shrink: 0;
}
</style>
