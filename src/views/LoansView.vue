<script setup>
import { computed, onMounted, ref } from 'vue'
import { loansApi, summaryApi } from '../lib/api.js'
import { formatIDR, formatDate } from '../lib/format.js'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'

const loans = ref([])
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const showModal = ref(false)
const editing = ref(null)

const summary = ref({ gave: 0, borrowed: 0 })

const form = ref(emptyForm())

function emptyForm() {
  return { person: '', kind: 'borrowed', amount: '', due_date: '', note: '' }
}

const kinds = {
  borrowed: { label: 'Utang', badge: 'bg-amber-100 text-amber-700' },
  gave: { label: 'Piutang', badge: 'bg-blue-100 text-blue-700' },
}

const filtered = computed(() => {
  if (filter.value === 'all') return loans.value
  return loans.value.filter((l) => l.kind === filter.value)
})

const emptyIcon = 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.88L3 20l1.18-4.12A7.73 7.73 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, totals] = await Promise.all([loansApi.list(), summaryApi.activeLoans()])
    loans.value = list
    summary.value = totals
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(loan) {
  editing.value = loan
  form.value = {
    person: loan.person,
    kind: loan.kind,
    amount: loan.amount,
    due_date: loan.due_date ? loan.due_date.slice(0, 10) : '',
    note: loan.note ?? '',
  }
  showModal.value = true
}

async function handleSave() {
  error.value = ''
  const amount = Number(form.value.amount)
  if (!form.value.person.trim()) {
    error.value = 'Nama orang wajib diisi.'
    return
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Nominal harus lebih dari 0.'
    return
  }
  try {
    if (editing.value) {
      await loansApi.update(editing.value.id, { ...form.value, amount })
    } else if (loans.value.some((l) => l.person === form.value.person.trim() && l.status === 'active')) {
      const confirmed = window.confirm(
        `Masih ada pinjaman aktif atas nama "${form.value.person.trim()}". Tetap simpan?`,
      )
      if (!confirmed) return
      await loansApi.create({ ...form.value, amount })
    } else {
      await loansApi.create({ ...form.value, amount })
    }
    showModal.value = false
    await load()
  } catch (err) {
    error.value = 'Gagal menyimpan: ' + err.message
  }
}

async function toggleStatus(loan) {
  try {
    if (loan.status === 'active') {
      const done = window.confirm(
        `Tandai pinjaman ${loan.person} sebesar ${formatIDR(loan.amount)} sebagai lunas?`,
      )
      if (!done) return
      await loansApi.settle(loan.id)
    } else {
      await loansApi.reopen(loan.id)
    }
    await load()
  } catch (err) {
    alert('Gagal: ' + err.message)
  }
}

async function handleDelete(loan) {
  if (!window.confirm(`Hapus catatan pinjaman ${loan.person}?`)) return
  try {
    await loansApi.remove(loan.id)
    await load()
  } catch (err) {
    alert('Gagal menghapus: ' + err.message)
  }
}

onMounted(load)
</script>

<template>
  <section>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-extrabold text-slate-900">Catatan Pinjaman</h1>
        <p class="text-xs text-slate-500">Utang & piutang keluarga</p>
      </div>
      <button class="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95" @click="openAdd">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14m-7-7h14" /></svg>
        Catat
      </button>
    </div>

    <div class="mb-4 grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">Total Utang aktif</p>
        <p class="mt-1 text-lg font-extrabold text-amber-600">{{ formatIDR(summary.borrowed) }}</p>
      </div>
      <div class="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-medium text-slate-500">Total Piutang aktif</p>
        <p class="mt-1 text-lg font-extrabold text-blue-600">{{ formatIDR(summary.gave) }}</p>
      </div>
    </div>

    <div class="mb-3 flex gap-2">
      <button
        v-for="opt in [
          { key: 'all', label: 'Semua' },
          { key: 'borrowed', label: 'Utang' },
          { key: 'gave', label: 'Piutang' },
        ]"
        :key="opt.key"
        class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
        :class="filter === opt.key ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-600'"
        @click="filter = opt.key"
      >
        {{ opt.label }}
      </button>
    </div>

    <p v-if="error" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{{ error }}</p>

    <div v-if="loading && loans.length === 0" class="space-y-2.5">
      <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-2xl bg-slate-200"></div>
    </div>

    <div v-else-if="filtered.length" class="space-y-2.5">
      <div v-for="loan in filtered" :key="loan.id" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" :class="loan.status === 'settled' ? 'opacity-60' : ''">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-bold text-slate-900">{{ loan.person }}</p>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="kinds[loan.kind].badge">{{ kinds[loan.kind].label }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="loan.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ loan.status === 'active' ? 'Aktif' : 'Lunas' }}
              </span>
            </div>
            <p class="mt-1 text-lg font-extrabold" :class="loan.kind === 'borrowed' ? 'text-amber-600' : 'text-blue-600'">{{ formatIDR(loan.amount) }}</p>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ loan.note || 'Tanpa catatan' }}
              <span v-if="loan.due_date" class="ml-1 text-slate-400">· Jatuh tempo {{ formatDate(loan.due_date) }}</span>
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1.5">
            <button
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="loan.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
              @click="toggleStatus(loan)"
            >
              {{ loan.status === 'active' ? 'Tandai Lunas' : 'Buka Lagi' }}
            </button>
            <div class="flex gap-1">
              <button class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Ubah" @click="openEdit(loan)">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 11 2.8 2.8L11 15l-4 1 1-4 9.6-9.4z" /></svg>
              </button>
              <button class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus" @click="handleDelete(loan)">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.9 12.1a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState v-else :icon="emptyIcon" title="Belum ada catatan pinjaman." subtitle="Tekan tombol Catat untuk menambahkan utang atau piutang." />

    <Modal :show="showModal" :title="editing ? 'Ubah Pinjaman' : 'Catat Pinjaman'" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="handleSave">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Jenis</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-xl border py-2.5 text-sm font-semibold transition"
              :class="form.kind === 'borrowed' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 bg-white text-slate-500'"
              @click="form.kind = 'borrowed'"
            >
              Utang (saya berhutang)
            </button>
            <button
              type="button"
              class="rounded-xl border py-2.5 text-sm font-semibold transition"
              :class="form.kind === 'gave' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-500'"
              @click="form.kind = 'gave'"
            >
              Piutang (orang berhutang)
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Nama orang</label>
          <input v-model="form.person" type="text" placeholder="Mis. Pak Andi" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Nominal</label>
          <div class="relative">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
            <input v-model="form.amount" type="number" inputmode="numeric" min="0" step="any" placeholder="0" class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-right text-lg font-bold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Jatuh tempo</label>
          <input v-model="form.due_date" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Catatan</label>
          <input v-model="form.note" type="text" placeholder="Opsional" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>

        <p v-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>

        <button type="submit" class="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]">
          {{ editing ? 'Simpan Perubahan' : 'Simpan' }}
        </button>
      </form>
    </Modal>
  </section>
</template>