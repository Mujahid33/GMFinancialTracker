<script setup>
defineProps({
  size: { type: [Number, String], default: 40 },
})
</script>

<template>
  <div class="relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-sm" :style="{ width: size + 'px', height: size + 'px' }">
    <span class="font-extrabold leading-none tracking-tight" :style="{ fontSize: (size * 0.38) + 'px' }">GM</span>
  </div>
</template>