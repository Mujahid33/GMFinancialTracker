<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loansApi, loanPaymentsApi } from '../lib/api.js'
import { formatIDR, formatDate, todayISO } from '../lib/format.js'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const loan = ref(null)
const payments = ref([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saveError = ref('')
const form = ref({ amount: '', paid_at: todayISO(), note: '' })

const totalPaid = computed(() => payments.value.reduce((s, p) => s + Number(p.amount), 0))
const remaining = computed(() => Math.max(0, Number(loan.value?.amount ?? 0) - totalPaid.value))
const percent = computed(() => {
  const total = Number(loan.value?.amount ?? 0)
  if (total <= 0) return 0
  return Math.min(100, Math.round((totalPaid.value / total) * 100))
})
const isFullyPaid = computed(() => loan.value && Number(loan.value.amount) - totalPaid.value <= 0 && payments.value.length > 0)

const emptyIcon = 'M12 8v4m0 4h.01M10.29 3.86l-8.29 14.14A2 2 0 003.82 21h16.36a2 2 0 001.72-3L13.71 3.86a2 2 0 00-3.42 0z'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [l, p] = await Promise.all([
      loansApi.get(route.params.id),
      loanPaymentsApi.list(route.params.id),
    ])
    loan.value = l
    payments.value = p
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function addPayment() {
  saveError.value = ''
  const amount = Number(form.value.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    saveError.value = 'Nominal harus lebih dari 0.'
    return
  }
  try {
    await loanPaymentsApi.create(loan.value.id, {
      amount,
      paid_at: form.value.paid_at,
      note: form.value.note,
    })
    showModal.value = false
    form.value = { amount: '', paid_at: todayISO(), note: '' }
    await load()
  } catch (err) {
    saveError.value = 'Gagal menyimpan: ' + err.message
  }
}

async function handleDeletePayment(p) {
  if (!window.confirm(`Hapus cicilan ${formatIDR(p.amount)} tanggal ${formatDate(p.paid_at)}?`)) return
  try {
    await loanPaymentsApi.remove(p.id)
    await load()
  } catch (err) {
    alert('Gagal menghapus: ' + err.message)
  }
}

async function toggleStatus() {
  if (!loan.value) return
  try {
    if (loan.value.status === 'active') {
      const done = window.confirm('Tandai pinjaman ini sebagai lunas?')
      if (!done) return
      await loansApi.settle(loan.value.id)
    } else {
      await loansApi.reopen(loan.value.id)
    }
    await load()
  } catch (err) {
    alert('Gagal: ' + err.message)
  }
}

function openModal() {
  saveError.value = ''
  showModal.value = true
}

onMounted(load)
</script>

<template>
  <section>
    <button class="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-emerald-600" @click="router.push('/pinjaman')">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      Pinjaman
    </button>

    <div v-if="loading" class="space-y-3">
      <div class="h-28 animate-pulse rounded-3xl bg-slate-200"></div>
      <div class="h-48 animate-pulse rounded-3xl bg-slate-200"></div>
    </div>

    <template v-else-if="loan">
      <p v-if="error" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{{ error }}</p>

      <!-- Info pinjaman -->
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <p class="text-lg font-extrabold text-slate-900">{{ loan.person }}</p>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="loan.kind === 'borrowed' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
                {{ loan.kind === 'borrowed' ? 'Utang' : 'Piutang' }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="loan.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ loan.status === 'active' ? 'Aktif' : 'Lunas' }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-slate-400">{{ loan.note || 'Tanpa catatan' }}</p>
          </div>
          <button
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition"
            :class="loan.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
            @click="toggleStatus"
          >
            {{ loan.status === 'active' ? 'Tandai Lunas' : 'Buka Lagi' }}
          </button>
        </div>

        <!-- Progress -->
        <div class="mt-5 flex items-end justify-between">
          <div>
            <p class="text-[11px] font-medium text-slate-500">Sisa</p>
            <p class="text-2xl font-extrabold" :class="remaining <= 0 ? 'text-emerald-600' : 'text-slate-900'">{{ formatIDR(remaining) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[11px] font-medium text-slate-500">Total Pinjaman</p>
            <p class="text-lg font-bold" :class="loan.kind === 'borrowed' ? 'text-amber-600' : 'text-blue-600'">{{ formatIDR(loan.amount) }}</p>
          </div>
        </div>

        <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full transition-all duration-500" :class="remaining <= 0 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'" :style="{ width: percent + '%' }"></div>
        </div>
        <div class="mt-1.5 flex justify-between text-[11px] text-slate-400">
          <span>{{ percent }}% terbayar</span>
          <span>Terbayar <b class="text-emerald-700">{{ formatIDR(totalPaid) }}</b></span>
        </div>

        <div v-if="isFullyPaid" class="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Semua cicilan sudah lunas 🎉 — tandai status jadi Lunas bila perlu.
        </div>
      </div>

      <!-- Header cicilan -->
      <div class="mt-6 mb-3 flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Riwayat Cicilan</h2>
          <p class="text-xs text-slate-400">{{ payments.length }} pembayaran</p>
        </div>
        <button class="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95" @click="openModal">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14m-7-7h14" /></svg>
          Tambah
        </button>
      </div>

      <!-- Daftar cicilan -->
      <div v-if="payments.length" class="space-y-2.5">
        <div v-for="p in payments" :key="p.id" class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-800">{{ p.note || 'Pembayaran cicilan' }}</p>
            <p class="text-xs text-slate-400">{{ formatDate(p.paid_at) }}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-bold text-emerald-600">{{ formatIDR(p.amount) }}</p>
            <button class="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500" aria-label="Hapus cicilan" @click="handleDeletePayment(p)">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.9 12.1a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      <EmptyState v-else :icon="emptyIcon" title="Belum ada cicilan." subtitle="Tekan tombol Tambah untuk mencatat pembayaran pertama." />
    </template>

    <EmptyState v-else :icon="emptyIcon" title="Pinjaman tidak ditemukan." subtitle="Mungkin sudah dihapus." />

    <!-- Modal tambah cicilan -->
    <Modal :show="showModal" title="Tambah Cicilan" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="addPayment">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Nominal</label>
          <div class="relative">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
            <input v-model="form.amount" type="number" inputmode="numeric" min="0" step="any" placeholder="0" class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-right text-lg font-bold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Tanggal bayar</label>
          <input v-model="form.paid_at" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Catatan</label>
          <input v-model="form.note" type="text" placeholder="Mis. cicilan ke-2" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>

        <p v-if="saveError" class="text-sm font-medium text-red-600">{{ saveError }}</p>

        <button type="submit" class="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]">
          Simpan
        </button>
      </form>
    </Modal>
  </section>
</template>