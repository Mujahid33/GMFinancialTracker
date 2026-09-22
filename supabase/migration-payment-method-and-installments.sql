-- ============================================================
-- GM Financial Tracker — MIGRASI: Metode Bayar & Cicilan Pinjaman
-- ============================================================
-- Jalankan di SQL Editor Supabase (project yang sudah dipakai).
-- Aman dijalankan berulang (idempotent).

-- 1) Kolom "Metode Bayar" untuk Pemasukan & Pengeluaran
alter table public.transactions
  add column if not exists payment_method text not null default 'Cash'
  check (payment_method in ('QRIS', 'Transfer', 'Topup', 'Cash'));

-- 2) Tabel Cicilan Pinjaman
create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists loan_payments_loan_idx
  on public.loan_payments (loan_id, paid_at desc);

-- 3) Row Level Security: cicilan hanya bisa diakses pemilik pinjaman-nya
alter table public.loan_payments enable row level security;

drop policy if exists "loan_payments_all_own" on public.loan_payments;
create policy "loan_payments_all_own"
  on public.loan_payments for all
  using (
    exists (select 1 from public.loans l where l.id = loan_id and l.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.loans l where l.id = loan_id and l.user_id = auth.uid())
  );

-- ============================================================
-- Selesai. Data lama aman:
--   - transaksi yang sudah ada otomatis ber-metode "Cash"
-- ============================================================