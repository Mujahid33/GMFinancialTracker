<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { transactionsApi, summaryApi, loansApi, familyApi } from '../lib/api.js'
import { formatIDR, formatDate, formatMonth, monthRange } from '../lib/format.js'
import { categoryColor } from '../lib/categories.js'

const auth = useAuthStore()

const cursor = ref(new Date())
const summary = ref({ income: 0, expense: 0, count: 0 })
const loans = ref({ gave: 0, borrowed: 0 })
const recent = ref([])
const activeLoans = ref([])
const family = ref(null)
const loading = ref(true)
const error = ref('')

const range = computed(() => monthRange(cursor.value))
const balance = computed(() => summary.value.income - summary.value.expense)
const totalActiveLoans = computed(() => loans.value.gave + loans.value.borrowed)

const todayLabel = computed(() =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [month, loanTotals, latest, active, fam] = await Promise.all([
      summaryApi.month(range.value.startDate, range.value.endDate),
      summaryApi.activeLoans(),
      transactionsApi.list(null, { limit: 5 }),
      loansApi.list('active'),
      familyApi.getMy(),
    ])
    summary.value = month
    loans.value = loanTotals
    recent.value = latest
    activeLoans.value = active.slice(0, 3)
    family.value = fam
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function shiftMonth(dir) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + dir, 1)
  load()
}

function currentMonth() {
  const now = new Date()
  cursor.value = new Date(now.getFullYear(), now.getMonth(), 1)
  load()
}

onMounted(load)
</script>

<template>
  <section>
    <!-- Header -->
    <div class="mb-5">
      <p class="text-sm text-slate-400">{{ todayLabel }}</p>
      <div class="mt-0.5 flex items-center justify-between gap-2">
        <h1 class="text-xl font-extrabold text-slate-900">
          {{ greeting }}, {{ auth.displayName.split(' ')[0] }} <span class="ml-1 inline-block">👋</span>
        </h1>
        <span v-if="family" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          {{ family.name }}
        </span>
      </div>
    </div>

    <!-- Month navigator -->
    <div class="mb-4 flex items-center justify-between rounded-full border border-slate-100 bg-white px-2 py-1.5 shadow-sm">
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-emerald-600" aria-label="Bulan sebelumnya" @click="shiftMonth(-1)">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button class="text-sm font-semibold text-slate-600" @click="currentMonth">{{ formatMonth(cursor) }}</button>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-emerald-600" aria-label="Bulan berikutnya" @click="shiftMonth(1)">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>

    <p v-if="error" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{{ error }}</p>

    <div v-if="loading" class="space-y-4">
      <div class="h-48 animate-pulse rounded-3xl bg-slate-200"></div>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="i in 2" :key="i" class="h-24 animate-pulse rounded-2xl bg-slate-200"></div>
      </div>
      <div class="h-56 animate-pulse rounded-3xl bg-slate-200"></div>
    </div>

    <template v-else>
      <!-- Hero: saldo -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-600/20">
        <div class="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10"></div>
        <div class="absolute -bottom-16 -right-4 h-36 w-36 rounded-full bg-white/10"></div>
        <div class="absolute -left-8 bottom-6 h-20 w-20 rounded-full bg-white/5"></div>

        <div class="relative">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-emerald-50">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6m0 0l-2-2m2 2l2-2M5 20h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-3H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </span>
              <p class="text-xs font-semibold">Saldo Bulan Ini</p>
            </div>
            <span class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-emerald-50">{{ range.label }}</span>
          </div>

          <p class="mt-3 text-3xl font-extrabold tracking-tight">{{ formatIDR(balance) }}</p>

          <div class="mt-5 grid grid-cols-2 gap-2.5">
            <div class="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <div class="flex items-center gap-1 text-[11px] font-medium text-emerald-100">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m0 0l-6 6m6-6l6 6" /></svg>
                Pemasukan
              </div>
              <p class="mt-1 text-sm font-bold">{{ formatIDR(summary.income) }}</p>
            </div>
            <div class="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <div class="flex items-center gap-1 text-[11px] font-medium text-emerald-100">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m0 0l6-6m-6 6l-6-6" /></svg>
                Pengeluaran
              </div>
              <p class="mt-1 text-sm font-bold">{{ formatIDR(summary.expense) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Soft tiles -->
      <div class="mt-4 grid grid-cols-2 gap-3">
        <RouterLink
          to="/pinjaman"
          class="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 transition active:scale-[0.98]"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm">
            <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </span>
          <p class="mt-2.5 text-[11px] font-medium text-amber-600/80">Pinjaman Aktif</p>
          <p class="truncate text-base font-extrabold text-slate-900">{{ formatIDR(totalActiveLoans) }}</p>
        </RouterLink>

        <div class="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-500 shadow-sm">
            <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
          </span>
          <p class="mt-2.5 text-[11px] font-medium text-violet-600/80">Transaksi Bulan Ini</p>
          <p class="text-base font-extrabold text-slate-900">{{ summary.count }} catatan</p>
        </div>
      </div>

      <!-- Transaksi terakhir -->
      <div class="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div class="flex items-center justify-between px-5 py-4">
          <h2 class="text-sm font-bold text-slate-900">Transaksi Terakhir</h2>
          <RouterLink to="/pengeluaran" class="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700">Lihat semua</RouterLink>
        </div>
        <div v-if="recent.length" class="divide-y divide-slate-50">
          <div v-for="tx in recent" :key="tx.id" class="flex items-center gap-3 px-5 py-3.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" :style="{ backgroundColor: categoryColor(tx.category) }">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14m-7-7h14" /></svg>
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-800">{{ tx.category }}</p>
              <p class="text-xs text-slate-400">{{ tx.note || formatDate(tx.date) }} · {{ formatDate(tx.date) }}</p>
            </div>
            <p class="text-sm font-bold" :class="tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'">
              {{ tx.type === 'income' ? '+' : '−' }}{{ formatIDR(tx.amount) }}
            </p>
          </div>
        </div>
        <p v-else class="px-5 py-8 text-center text-sm text-slate-400">Belum ada transaksi bulan ini.<br />Ketik tombol + di bawah untuk memulai 🌱</p>
      </div>

      <!-- Pinjaman aktif -->
      <div class="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div class="flex items-center justify-between px-5 py-4">
          <h2 class="text-sm font-bold text-slate-900">Pinjaman Aktif</h2>
          <RouterLink to="/pinjaman" class="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700">Kelola</RouterLink>
        </div>
        <div v-if="activeLoans.length" class="divide-y divide-slate-50">
          <div v-for="loan in activeLoans" :key="loan.id" class="flex items-center gap-3 px-5 py-3.5">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" :class="loan.kind === 'borrowed' ? 'bg-amber-400' : 'bg-blue-500'">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21a9 9 0 0118 0" /></svg>
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-800">{{ loan.person }}</p>
              <p class="text-xs" :class="loan.kind === 'borrowed' ? 'text-amber-600' : 'text-blue-500'">{{ loan.kind === 'borrowed' ? 'Utang' : 'Piutang' }}</p>
            </div>
            <p class="text-sm font-bold text-slate-800">{{ formatIDR(loan.amount) }}</p>
          </div>
        </div>
        <p v-else class="px-5 py-8 text-center text-sm text-slate-400">Tidak ada pinjaman yang aktif saat ini.<br />Semua beres! 🎉</p>
      </div>
    </template>
  </section>
</template>