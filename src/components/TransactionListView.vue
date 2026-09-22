<script setup>
import { computed, onMounted, ref } from 'vue'
import { transactionsApi, summaryApi } from '../lib/api.js'
import { formatIDR, formatDate, monthRange } from '../lib/format.js'
import { categoryColor } from '../lib/categories.js'
import Modal from './Modal.vue'
import TransactionForm from './TransactionForm.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  type: { type: String, required: true },
})

const isExpense = computed(() => props.type === 'expense')

const transactions = ref([])
const monthTotal = ref(0)
const loading = ref(true)
const showModal = ref(false)
const editing = ref(null)
const error = ref('')

const title = computed(() => (isExpense.value ? 'Catatan Pengeluaran' : 'Catatan Pemasukan'))
const emptyIcon =
  'M3 10h18M7 15h.01M11 15h.01M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z'

const range = computed(() => monthRange(new Date()))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, summary] = await Promise.all([
      transactionsApi.list(props.type),
      summaryApi.month(range.value.startDate, range.value.endDate),
    ])
    transactions.value = list
    monthTotal.value = isExpense.value ? summary.expense : summary.income
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  showModal.value = true
}

function openEdit(tx) {
  editing.value = tx
  showModal.value = true
}

async function handleSave(payload) {
  try {
    if (editing.value) {
      await transactionsApi.update(editing.value.id, payload)
    } else {
      await transactionsApi.create(payload)
    }
    showModal.value = false
    await load()
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message)
  }
}

async function handleDelete(tx) {
  if (!window.confirm('Hapus catatan ini?')) return
  try {
    await transactionsApi.remove(tx.id)
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
        <h1 class="text-lg font-extrabold text-slate-900">{{ title }}</h1>
        <p class="text-xs text-slate-500">Total {{ range.label }}</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
        :class="isExpense ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'"
        @click="openAdd"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14m-7-7h14" /></svg>
        Catat
      </button>
    </div>

    <div class="mb-4 rounded-2xl bg-white p-4 shadow-sm" :class="isExpense ? 'border border-red-100' : 'border border-emerald-100'">
      <p class="text-xs font-medium text-slate-500">Total bulan ini</p>
      <p class="mt-1 text-2xl font-extrabold" :class="isExpense ? 'text-red-600' : 'text-emerald-600'">{{ formatIDR(monthTotal) }}</p>
    </div>

    <p v-if="error" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{{ error }}</p>

    <div v-if="loading && transactions.length === 0" class="space-y-2.5">
      <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-2xl bg-slate-200"></div>
    </div>

    <TransitionGroup v-else-if="transactions.length" name="list" tag="div" class="space-y-2.5">
      <div v-for="tx in transactions" :key="tx.id" class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :style="{ backgroundColor: categoryColor(tx.category) + '1a' }">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: categoryColor(tx.category) }"></span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">{{ tx.category }}</p>
          <p class="truncate text-xs text-slate-500">{{ tx.note || formatDate(tx.date) }}</p>
          <p class="text-[11px] text-slate-400">{{ formatDate(tx.date) }} · {{ tx.payment_method || 'Cash' }}</p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <p class="text-sm font-bold" :class="isExpense ? 'text-red-600' : 'text-emerald-600'">
            {{ isExpense ? '−' : '+' }}{{ formatIDR(tx.amount) }}
          </p>
          <div class="flex gap-1">
            <button class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Ubah" @click="openEdit(tx)">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 11 2.8 2.8L11 15l-4 1 1-4 9.6-9.4z" /></svg>
            </button>
            <button class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Hapus" @click="handleDelete(tx)">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.9 12.1a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <EmptyState v-else :icon="emptyIcon" :title="`Belum ada catatan ${props.type === 'expense' ? 'pengeluaran' : 'pemasukan'}.`" subtitle="Tekan tombol Catat untuk menambahkan." />

    <Modal :show="showModal" :title="editing ? `Ubah ${isExpense ? 'Pengeluaran' : 'Pemasukan'}` : `Catat ${isExpense ? 'Pengeluaran' : 'Pemasukan'}`" @close="showModal = false">
      <TransactionForm :type="type" :transaction="editing" @save="handleSave" />
    </Modal>
  </section>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>