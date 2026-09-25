import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth.js'
import router from './router/index.js'
import App from './App.vue'
import './style.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // Pulihkan sesi DULU sebelum router aktif, supaya guard navigasi
  // tidak pernah mengambil keputusan "belum login" saat sesi sebenarnya
  // berhasil dipulihkan.
  const auth = useAuthStore()
  try {
    await auth.refreshUser()
  } catch (err) {
    console.error('Gagal memuat sesi:', err)
  }

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

bootstrap()