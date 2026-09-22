-- ============================================================
-- GM Financial Tracker — Supabase Schema (jalankan di SQL Editor)
-- ============================================================
-- Cara pakai:
--  1. Buka https://supabase.com/dashboard  ->  pilih project
--  2. Menu "SQL Editor"  ->  "New query"
--  3. Salin seluruh isi file ini  ->  Run
--  4. Di menu "Authentication"  ->  "Providers"  pastikan
--     "Email" aktif (untuk login email/password)
--
-- Catatan: untuk menghubungkan anggota ke SATU keluarga
-- (mis. suami & istri), jalankan juga:
--   migration-family-sharing.sql
-- ============================================================

-- ---------- Families ----------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Keluarga',
  created_at timestamptz not null default now()
);

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  family_id uuid references public.families (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-membuat profile + keluarga personal saat user mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_family uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  select family_id into v_family
  from public.profiles where id = new.id;

  if v_family is null then
    insert into public.families (name)
    values (
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(new.email, '@', 1)
      ) || '''s Family'
    )
    returning id into v_family;

    update public.profiles set family_id = v_family where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: id keluarga milik user yang login
create or replace function public.get_my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- ---------- Transactions (pengeluaran & pemasukan) ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null default 'Lainnya',
  payment_method text not null default 'Cash'
    check (payment_method in ('QRIS', 'Transfer', 'Topup', 'Cash')),
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists transactions_family_idx
  on public.transactions (family_id, date desc);

-- ---------- Loans (pinjaman / utang-piutang) ----------
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete cascade,
  person text not null,
  kind text not null check (kind in ('gave', 'borrowed')),
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  due_date date,
  status text not null default 'active' check (status in ('active', 'settled')),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists loans_family_idx
  on public.loans (family_id, status);

-- ---------- Loan Payments (cicilan pinjaman) ----------
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

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.families enable row level security;

-- profiles: bisa baca profil sendiri & anggota sekeluarga; ubah profil sendiri
drop policy if exists "profiles_select_family" on public.profiles;
create policy "profiles_select_family"
  on public.profiles for select
  using (family_id = public.get_my_family_id() or id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- families: anggota bisa melihat data keluarganya
drop policy if exists "families_select_member" on public.families;
create policy "families_select_member"
  on public.families for select
  using (id = public.get_my_family_id());

-- transactions / loans: dibatasi per keluarga
drop policy if exists "transactions_all_own" on public.transactions;
create policy "transactions_all_own"
  on public.transactions for all
  using (family_id = public.get_my_family_id())
  with check (family_id = public.get_my_family_id());

drop policy if exists "loans_all_own" on public.loans;
create policy "loans_all_own"
  on public.loans for all
  using (family_id = public.get_my_family_id())
  with check (family_id = public.get_my_family_id());

-- loan_payments: hanya anggota pemilik lengkap pinjaman
drop policy if exists "loan_payments_all_own" on public.loan_payments;
create policy "loan_payments_all_own"
  on public.loan_payments for all
  using (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.family_id = public.get_my_family_id()
    )
  )
  with check (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.family_id = public.get_my_family_id()
    )
  );

-- ============================================================
-- Selesai. Untuk menyatukan akun dalam satu keluarga, jalankan:
--   migration-family-sharing.sql
-- Yang juga otomatis memindahkan data lama ke keluarga tersebut.
--
-- Isi file .env dengan:
--   VITE_SUPABASE_URL       = URL project (Settings > API)
--   VITE_SUPABASE_ANON_KEY  = anon public key (Settings > API)
-- ============================================================