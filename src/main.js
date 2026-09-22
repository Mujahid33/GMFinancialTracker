import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth.js'
import router from './router/index.js'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuthStore()
try {
  await auth.refreshUser()
} catch (err) {
  console.error('Gagal memuat sesi:', err)
}

app.mount('#app')