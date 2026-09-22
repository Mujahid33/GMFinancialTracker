<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  {
    to: { name: 'dashboard' },
    label: 'Beranda',
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V10',
  },
  {
    to: { name: 'expenses' },
    label: 'Pengeluaran',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M3 3l18 18',
  },
  {
    to: { name: 'incomes' },
    label: 'Pemasukan',
    icon: 'M12 8v4m0 4h.01M10.29 3.86l-8.29 14.14A2 2 0 003.82 21h16.36a2 2 0 001.72-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  {
    to: { name: 'loans' },
    label: 'Pinjaman',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  },
]

function isActive(name) {
  return route.name === name
}
</script>

<template>
  <nav class="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
    <div class="pointer-events-auto flex w-full max-w-sm items-center justify-around rounded-full border border-slate-200/70 bg-white/85 px-1.5 py-1.5 shadow-[0_10px_30px_-8px_rgba(2,44,34,0.25)] ring-1 ring-black/5 backdrop-blur-xl">
      <RouterLink
        v-for="item in items"
        :key="item.to.name"
        :to="item.to"
        class="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 transition-all duration-200"
        :class="isActive(item.to.name) ? 'bg-emerald-100/80 text-emerald-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="item.icon" />
        </svg>
        <span class="text-[10px] font-semibold">{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>