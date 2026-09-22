import { supabase } from './supabase.js'
import { todayISO } from './format.js'

const toNumber = (value) => Math.round(Number(value) * 100) / 100

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Sesi login tidak ditemukan.')
  return data.user.id
}

function transactionRow(payload) {
  return {
    type: payload.type,
    amount: toNumber(payload.amount),
    category: payload.category,
    payment_method: payload.payment_method || 'Cash',
    note: payload.note?.trim() || null,
    date: payload.date || todayISO(),
  }
}

function withPaid(loan) {
  const payments = loan.loan_payments ?? []
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  return {
    ...loan,
    total_paid: totalPaid,
    remaining: Math.max(0, Number(loan.amount) - totalPaid),
  }
}

export const transactionsApi = {
  async list(type, { limit } = {}) {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (type) query = query.eq('type', type)
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(payload) {
    const row = transactionRow(payload)
    row.user_id = await currentUserId()
    const { data, error } = await supabase
      .from('transactions')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('transactions')
      .update(transactionRow(payload))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}

export const loansApi = {
  async list(status) {
    let query = supabase
      .from('loans')
      .select('*, loan_payments(amount)')
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(withPaid)
  },

  async get(id) {
    const { data, error } = await supabase.from('loans').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Pinjaman tidak ditemukan.')
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('loans')
      .insert({
        user_id: await currentUserId(),
        person: payload.person.trim(),
        kind: payload.kind,
        amount: toNumber(payload.amount),
        note: payload.note?.trim() || null,
        due_date: payload.due_date || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('loans')
      .update({
        person: payload.person.trim(),
        kind: payload.kind,
        amount: toNumber(payload.amount),
        note: payload.note?.trim() || null,
        due_date: payload.due_date || null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async settle(id) {
    const { data, error } = await supabase
      .from('loans')
      .update({ status: 'settled', settled_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async reopen(id) {
    const { data, error } = await supabase
      .from('loans')
      .update({ status: 'active', settled_at: null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (error) throw error
  },
}

export const loanPaymentsApi = {
  async list(loanId) {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('paid_at', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(loanId, payload) {
    const { data, error } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        amount: toNumber(payload.amount),
        paid_at: payload.paid_at || todayISO(),
        note: payload.note?.trim() || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('loan_payments').delete().eq('id', id)
    if (error) throw error
  },
}

export const summaryApi = {
  async month(startDate, endDate) {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('type, amount', { count: 'exact' })
      .gte('date', startDate)
      .lte('date', endDate)
    if (error) throw error
    let income = 0
    let expense = 0
    for (const row of data ?? []) {
      const amount = Number(row.amount)
      if (row.type === 'income') income += amount
      else expense += amount
    }
    return { income, expense, count: count ?? data?.length ?? 0 }
  },

  async activeLoans() {
    const { data, error } = await supabase
      .from('loans')
      .select('kind, amount')
      .eq('status', 'active')
    if (error) throw error
    let gave = 0
    let borrowed = 0
    for (const row of data ?? []) {
      const amount = Number(row.amount)
      if (row.kind === 'gave') gave += amount
      else borrowed += amount
    }
    return { gave, borrowed }
  },
}