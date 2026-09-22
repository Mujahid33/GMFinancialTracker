<script setup>
import { ref, watch } from 'vue'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories.js'
import { todayISO } from '../lib/format.js'

const props = defineProps({
  type: { type: String, required: true },
  transaction: { type: Object, default: null },
})

const emit = defineEmits(['save'])

const categories = computedCategories()
const saving = ref(false)
const error = ref('')

const form = ref({
  amount: '',
  category: '',
  note: '',
  date: todayISO(),
})

function computedCategories() {
  return props.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

watch(
  () => props.transaction,
  (tx) => {
    if (tx) {
      form.value = {
        amount: tx.amount,
        category: tx.category,
        note: tx.note ?? '',
        date: tx.date.slice(0, 10),
      }
    } else {
      form.value = { amount: '', category: '', note: '', date: todayISO() }
    }
    error.value = ''
  },
  { immediate: true },
)

async function submit() {
  const amount = Number(form.value.amount)
  error.value = ''
  if (!form.value.category) {
    error.value = 'Pilih kategori dulu yuk.'
    return
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Masukkan nominal yang valid (lebih dari 0).'
    return
  }
  saving.value = true
  try {
    await emit('save', {
      type: props.type,
      amount,
      category: form.value.category,
      note: form.value.note,
      date: form.value.date,
    })
    form.value = { amount: '', category: '', note: '', date: todayISO() }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700">Nominal</label>
      <div class="relative">
        <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
        <input
          v-model="form.amount"
          type="number"
          inputmode="numeric"
          min="0"
          step="any"
          placeholder="0"
          class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-right text-lg font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700">Kategori</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
          :class="form.category === cat ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400'"
          @click="form.category = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700">Tanggal</label>
      <input
        v-model="form.date"
        type="date"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-slate-700">Catatan</label>
      <input
        v-model="form.note"
        type="text"
        placeholder="Mis. belanja bulanan di pasar"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
    </div>

    <p v-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>

    <button
      type="submit"
      :disabled="saving"
      class="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
    >
      {{ saving ? 'Menyimpan…' : transaction ? 'Simpan Perubahan' : 'Simpan' }}
    </button>
  </form>
</template>