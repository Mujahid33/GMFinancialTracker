const fmtIDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const fmtDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const fmtMonth = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
})

export function formatIDR(value) {
  return fmtIDR.format(Number(value ?? 0))
}

export function formatDate(iso) {
  if (!iso) return '-'
  const value = String(iso)
  return fmtDate.format(new Date(value.includes('T') ? value : `${value}T00:00:00`))
}

export function formatMonth(date) {
  return fmtMonth.format(date)
}

export function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthRange(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const iso = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return {
    startDate: iso(start),
    endDate: iso(end),
    label: fmtMonth.format(start),
  }
}