export const EXPENSE_CATEGORIES = [
  'Makanan',
  'Transportasi',
  'Belanja',
  'Tagihan & Utilitas',
  'Kesehatan',
  'Pendidikan',
  'Hiburan',
  'Kebutuhan Anak',
  'Rumah Tangga',
  'Lainnya',
]

export const INCOME_CATEGORIES = [
  'Gaji',
  'Bonus',
  'Usaha / Bisnis',
  'Investasi',
  'Hadiah',
  'Uang Saku',
  'Lainnya',
]

export const CATEGORY_COLORS = {
  Makanan: '#f97316',
  Transportasi: '#3b82f6',
  Belanja: '#ec4899',
  'Tagihan & Utilitas': '#8b5cf6',
  Kesehatan: '#ef4444',
  Pendidikan: '#06b6d4',
  Hiburan: '#f59e0b',
  'Kebutuhan Anak': '#14b8a6',
  'Rumah Tangga': '#84cc16',
  Gaji: '#10b981',
  Bonus: '#22c55e',
  'Usaha / Bisnis': '#0ea5e9',
  Investasi: '#6366f1',
  Hadiah: '#f472b6',
  'Uang Saku': '#2dd4bf',
  Lainnya: '#94a3b8',
}

export function categoryColor(category) {
  return CATEGORY_COLORS[category] ?? '#94a3b8'
}