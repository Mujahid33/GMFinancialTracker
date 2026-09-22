<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from './components/TopBar.vue'
import BottomNav from './components/BottomNav.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const route = useRoute()
const requiresLayout = computed(() => route.meta.requiresAuth)
</script>

<template>
  <InstallPrompt />
  <RouterView v-if="requiresLayout" v-slot="{ Component }">
    <div class="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-200 to-emerald-100/70 sm:flex sm:items-center sm:justify-center sm:py-6">
      <div class="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-slate-50 shadow-none sm:h-[min(840px,94dvh)] sm:rounded-[2.75rem] sm:border sm:border-slate-200/80 sm:shadow-[0_30px_70px_-20px_rgba(2,44,34,0.4)]">
        <TopBar />
        <main class="no-scrollbar flex-1 overflow-y-auto px-5 pb-36 pt-5">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </main>
        <BottomNav />
      </div>
    </div>
  </RouterView>
  <RouterView v-else />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>