<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import GmLogo from '../components/GmLogo.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const forgot = ref(false)
const loading = ref(false)
const message = ref('')
const error = ref('')
const showDiag = ref(false)
const diagText = ref('')

async function checkStorage() {
  const { storageDiag } = await import('../lib/sessionStorage.js')
  const result = await storageDiag()
  diagText.value = JSON.stringify(result, null, 2)
  showDiag.value = true
}

if (auth.failReason) checkStorage()

function switchMode(m) {
  mode.value = m
  error.value = ''
  message.value = ''
}

async function submit() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    if (forgot.value) {
      await auth.requestPasswordReset(email.value)
      message.value = 'Tautan reset password sudah dikirim ke email kamu.'
      forgot.value = false
      return
    }
    if (mode.value === 'login') {
      await auth.signIn(email.value, password.value)
      router.push(String(route.query.redirect || '/'))
    } else {
      if (!name.value.trim()) throw new Error('Nama lengkap wajib diisi.')
      const data = await auth.signUp(name.value.trim(), email.value, password.value)
      if (data.session) {
        router.push('/')
      } else {
        message.value = 'Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk.'
        mode.value = 'login'
      }
    }
  } catch (err) {
    error.value = err.message || 'Terjadi kesalahan, coba lagi.'
  } finally {
    loading.value = false
  }
}

watch(forgot, (v) => {
  error.value = ''
  message.value = ''
  if (v) document.title = 'Reset Password · GM Finance'
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-900 px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center text-center">
        <GmLogo :size="64" />
        <h1 class="mt-4 text-2xl font-extrabold text-white">GM Finance</h1>
        <p class="mt-1 text-sm text-emerald-100">Catat pengeluaran, pemasukan, dan pinjaman keluargamu.</p>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-xl">
        <template v-if="forgot">
          <h2 class="mb-4 text-lg font-bold text-slate-900">Reset Password</h2>
          <form class="space-y-4" @submit.prevent="submit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input v-model="email" type="email" autocomplete="email" required placeholder="kamu@email.com" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
            <p v-if="message" class="text-sm font-medium text-emerald-600">{{ message }}</p>
            <p v-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>
            <button type="submit" :disabled="loading" class="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {{ loading ? 'Mengirim…' : 'Kirim Tautan Reset' }}
            </button>
            <button type="button" class="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700" @click="forgot = false">Kembali ke masuk</button>
          </form>
        </template>

        <template v-else>
          <div class="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button class="rounded-lg py-2 text-sm font-semibold transition" :class="mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'" @click="switchMode('login')">Masuk</button>
            <button class="rounded-lg py-2 text-sm font-semibold transition" :class="mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'" @click="switchMode('register')">Daftar</button>
          </div>

          <h2 class="mb-4 text-lg font-bold text-slate-900">{{ mode === 'login' ? 'Selamat datang kembali 👋' : 'Buat akun baru' }}</h2>

          <form class="space-y-4" @submit.prevent="submit">
            <div v-if="mode === 'register'">
              <label class="mb-1.5 block text-sm font-medium text-slate-700">Nama Lengkap</label>
              <input v-model="name" type="text" autocomplete="name" placeholder="Nama anggota keluarga" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input v-model="email" type="email" autocomplete="email" required placeholder="kamu@email.com" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input v-model="password" type="password" autocomplete="current-password" required minlength="6" placeholder="Minimal 6 karakter" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div v-if="mode === 'login'" class="flex justify-end">
              <button type="button" class="text-xs font-medium text-emerald-600 hover:text-emerald-700" @click="forgot = true">Lupa password?</button>
            </div>
            <p v-if="message" class="text-sm font-medium text-emerald-600">{{ message }}</p>
            <p v-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>
            <button type="submit" :disabled="loading" class="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {{ loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar' }}
            </button>
          </form>
        </template>
      </div>

      <p class="mt-6 text-center text-xs text-emerald-100/80">GM Financial Tracker · Kelola keuangan keluarga dengan mudah</p>

      <details v-if="auth.failReason" class="mt-3 rounded-lg bg-emerald-900/40 p-2 text-[10px] leading-relaxed text-emerald-100/60" open>
        <summary class="cursor-pointer select-none font-medium">Info teknis (sesi)</summary>
        <div class="mt-1">Sesi tidak dipulihkan: <code class="text-emerald-100">{{ auth.failReason }}</code></div>
        <button type="button" class="mt-1 underline" @click="checkStorage">Cek status penyimpanan browser</button>
        <pre v-if="showDiag" class="mt-1 whitespace-pre-wrap">{{ diagText }}</pre>
      </details>
    </div>
  </div>
</template>