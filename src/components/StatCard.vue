<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  icon: { type: String, required: true },
  tint: { type: String, default: 'emerald' },
})

const tints = {
  emerald: { chip: 'bg-emerald-100 text-emerald-600' },
  red: { chip: 'bg-red-100 text-red-600' },
  blue: { chip: 'bg-blue-100 text-blue-600' },
  amber: { chip: 'bg-amber-100 text-amber-600' },
  slate: { chip: 'bg-slate-100 text-slate-600' },
}

const chipClass = computed(() => tints[props.tint]?.chip ?? tints.emerald.chip)
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
      <span class="flex h-8 w-8 items-center justify-center rounded-xl" :class="chipClass">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="icon" />
        </svg>
      </span>
      {{ label }}
    </div>
    <p class="mt-2.5 truncate text-lg font-bold text-slate-900 sm:text-xl">{{ value }}</p>
  </div>
</template>