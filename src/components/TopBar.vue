<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import GmLogo from './GmLogo.vue'

const router = useRouter()
const auth = useAuthStore()
const open = ref(false)

async function handleSignOut() {
  open.value = false
  await auth.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="z-30 shrink-0 border-b border-slate-100 bg-white/80 px-5 py-3.5 backdrop-blur-xl">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <GmLogo :size="38" />
        <div class="leading-tight">
          <p class="text-sm font-extrabold tracking-tight text-slate-900">GM Finance</p>
          <p class="text-[11px] font-medium text-slate-400">Financial Tracker</p>
        </div>
      </div>

      <div class="relative">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shadow-sm shadow-emerald-600/30 transition active:scale-95"
          @click="open = !open"
          aria-label="Menu akun"
        >
          {{ auth.initial }}
        </button>

        <div v-if="open" class="fixed inset-0 z-10" @click="open = false"></div>
        <div v-if="open" class="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div class="border-b border-slate-100 px-4 py-3">
            <p class="truncate text-sm font-semibold text-slate-900">{{ auth.displayName }}</p>
            <p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p>
          </div>
          <button class="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50" @click="handleSignOut">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Keluar
          </button>
        </div>
      </div>
    </div>
  </header>
</template>