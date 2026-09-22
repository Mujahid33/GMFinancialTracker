<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const deferredPrompt = ref(null)
const visible = ref(false)
const isIOS = ref(false)

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function onPrompt(e) {
  e.preventDefault()
  deferredPrompt.value = e
  visible.value = true
}

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
  visible.value = false
}

function dismiss() {
  visible.value = false
  deferredPrompt.value = null
}

onMounted(() => {
  if (isStandalone()) return
  const ua = window.navigator.userAgent
  isIOS.value = /iPad|iPhone|iPod/.test(ua)
  if (isIOS.value) visible.value = true
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', dismiss)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
  window.removeEventListener('appinstalled', dismiss)
})
</script>

<template>
  <Transition name="rise">
    <div v-if="visible" class="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <div class="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-xl shadow-emerald-900/10 ring-1 ring-black/5 backdrop-blur-xl">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-sm">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10m0 0l-3-3m3 3l3-3M5 13a7 7 0 0013 0M4 21h16" /></svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-slate-900">Pasang GM Finance</p>
          <p class="text-[11px] leading-snug text-slate-500">
            <template v-if="deferredPrompt">Akses lebih cepat, bisa dibuka dari layar utama perangkat.</template>
            <template v-else-if="isIOS">Klik ikon Bagikan di Safari → pilih "Add to Home Screen".</template>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button v-if="deferredPrompt" class="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95" @click="install">
            Pasang
          </button>
          <button class="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" @click="dismiss">
            Nanti
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.rise-enter-active,
.rise-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.rise-enter-from,
.rise-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>