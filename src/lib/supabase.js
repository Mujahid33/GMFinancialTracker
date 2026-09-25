import { createClient } from '@supabase/supabase-js'
import {
  supabaseSessionStorage,
  saveSessionSnapshot,
  clearSessionSnapshot,
  loadSessionSnapshot,
} from './sessionStorage.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase belum dikonfigurasi. Salin .env.example menjadi .env dan isi VITE_SUPABASE_URL serta VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Simpan snapshot sesi setiap kali ada perubahan auth, supaya bisa
// dipulihkan secara mandiri di boot berikutnya.
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    saveSessionSnapshot(JSON.stringify(session))
  } else {
    clearSessionSnapshot()
  }
})

/**
 * Pulihkan sesi dari snapshot kita sendiri bila penyimpanan internal
 * supabase tidak menemukan apa-apa (mis. browser menghapus storage).
 */
export async function restoreStoredSession() {
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) return { restored: 'supabase', hasSnapshot: false }

    const saved = await loadSessionSnapshot()
    if (!saved) return { restored: 'none', hasSnapshot: false }

    try {
      await supabase.auth.setSession(JSON.parse(saved))
      return { restored: 'snapshot', hasSnapshot: true }
    } catch {
      return { restored: 'snapshot-invalid', hasSnapshot: true }
    }
  } catch {
    return { restored: 'error', hasSnapshot: false }
  }
}