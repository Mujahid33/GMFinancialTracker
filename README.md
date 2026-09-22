# GM Financial Tracker

PWA keluarga untuk mencatat **Pengeluaran**, **Pemasukan**, dan **Pinjaman** (utang-piutang), dengan autentikasi & backend **Supabase**.

Stack: Vue 3 · Vite · Tailwind CSS v4 · Pinia · Vue Router · Supabase · vite-plugin-pwa

## Fitur
- 🔐 Login & register (email/password), reset password
- 💸 Catatan Pengeluaran (CRUD + kategori + total bulanan)
- 💰 Catatan Pemasukan (CRUD + kategori + total bulanan)
- 🤝 Catatan Pinjaman / utang-piutang (status aktif/lunas, jatuh tempo)
- 📊 Dashboard ringkasan bulanan (pemasukan, pengeluaran, selisih, pinjaman aktif)
- 📱 PWA: bisa diinstall, berjalan offline (app shell di-cache)

## Setup

### 1. Supabase
1. Buat project di https://supabase.com/dashboard
2. Buka **SQL Editor** → jalankan isi [supabase/schema.sql](supabase/schema.sql) (membuat tabel `profiles`, `transactions`, `loans`, trigger profil, dan kebijakan Row Level Security)
3. Pastikan **Authentication → Providers → Email** aktif

### 2. Konfigurasi
```bash
cp .env.example .env
```
Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari **Settings → API**.

### 3. Jalankan
```bash
npm install
npm run dev       # development
npm run build     # produksi + generate ikon + service worker
npm run preview   # pratinjau hasil build
npm run icons     # regenerate ikon PWA (public/icons)
```

## Struktur
```
src/
  lib/           supabase client, API layer, format Rupiah, kategori
  stores/        pinia (auth)
  router/        vue-router + guard autentikasi
  views/         Login · Dashboard · Pengeluaran · Pemasukan · Pinjaman
  components/    TopBar · BottomNav · Modal · StatCard · form transaksi dll.
supabase/schema.sql   skema DB & RLS
public/gm-logo.svg    logo GM
```

## Deploy
Build menghasilkan folder `dist/`. Hosting static apa pun (Vercel, Netlify, GitHub Pages, Supabase Hosting) bisa digunakan — pastikan SPA fallback menunjuk ke `index.html`.