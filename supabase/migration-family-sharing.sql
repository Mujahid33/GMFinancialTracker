-- ============================================================
-- GM Financial Tracker — MIGRASI: Keluarga (berbagi data antar anggota)
-- ============================================================
-- Dengan ini, anggota satu keluarga bisa saling melihat & mengelola
-- data: Catatan Pengeluaran, Pemasukan, dan Pinjaman.
--
-- Couple bawaan yang dihubungkan:
--   garnisajeng3@gmail.com  (istri)  &  mujahidislami030@gmail.com  (suami)
--   -> satu keluarga bernama "Keluarga Mujahid"
-- Data lama mereka otomatis ikut dipindah ke keluarga ini.
-- User lain tanpa keluarga otomatis dibuatkan "keluarga personal" sendiri.
-- ============================================================

-- 1) Tabel + kolom keluarga
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Keluarga',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists family_id uuid references public.families (id) on delete set null;

alter table public.transactions
  add column if not exists family_id uuid references public.families (id) on delete cascade;

alter table public.loans
  add column if not exists family_id uuid references public.families (id) on delete cascade;

create index if not exists profiles_family_idx on public.profiles (family_id);
create index if not exists transactions_family_idx on public.transactions (family_id, date desc);
create index if not exists loans_family_idx on public.loans (family_id, status);

-- 2) Helper: family id milik user yang login
create or replace function public.get_my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- 3) Trigger signup: user baru otomatis mendapat keluarga personal
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- 4) RLS baru: akses dibatasi per keluarga
alter table public.families enable row level security;

drop policy if exists "families_select_member" on public.families;
create policy "families_select_member"
  on public.families for select
  using (id = public.get_my_family_id());

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

-- profile: boleh baca profil sendiri & anggota sekeluarga (untuk fitur keluarga)
drop policy if exists "profiles_select_family" on public.profiles;
create policy "profiles_select_family"
  on public.profiles for select
  using (family_id = public.get_my_family_id() or id = auth.uid());

-- 5) Migrasi data + hubungkan suami & istri
do $$
declare
  v_family uuid;
  v_user uuid;
  v_full text;
begin
  -- keluarga utama untuk kedua akun
  select id into v_family from public.families where name = 'Keluarga Mujahid';
  if v_family is null then
    insert into public.families (name) values ('Keluarga Mujahid') returning id into v_family;
  end if;

  -- tetapkan suami & istri ke keluarga ini
  for v_user, v_full in
    select u.id, coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name')
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) in ('garnisajeng3@gmail.com', 'mujahidislami030@gmail.com')
  loop
    update public.profiles
    set family_id = v_family, full_name = coalesce(full_name, v_full)
    where id = v_user;
  end loop;

  -- pindahkan data lama mereka ke keluarga baru
  update public.transactions
  set family_id = v_family
  where user_id in (
    select id from auth.users u
    where lower(u.email) in ('garnisajeng3@gmail.com', 'mujahidislami030@gmail.com')
  )
  and family_id is null;

  update public.loans
  set family_id = v_family
  where user_id in (
    select id from auth.users u
    where lower(u.email) in ('garnisajeng3@gmail.com', 'mujahidislami030@gmail.com')
  )
  and family_id is null;

  -- user lain tanpa keluarga -> buatkan keluarga personal
  for v_user, v_full in
    select p.id,
           coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
    from auth.users u
    join public.profiles p on p.id = u.id
    where p.family_id is null
  loop
    insert into public.families (name) values (v_full || '''s Family')
    returning id into v_family;

    update public.profiles set family_id = v_family where id = v_user;
    update public.transactions set family_id = v_family where user_id = v_user and family_id is null;
    update public.loans set family_id = v_family where user_id = v_user and family_id is null;
  end loop;
end $$;

-- ============================================================
-- Setelah ini, app otomatis menampilkan data sekeluarga.
-- Kolom user_id tetap tersimpan (untuk tahu siapa pencatat).
-- Untuk menambahkan anggota lain:
--   update public.profiles set family_id = '<family_id>'
--   where id = '<user_id>';
-- ============================================================