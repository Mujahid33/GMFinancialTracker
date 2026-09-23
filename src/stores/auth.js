import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { recordSessionStart, isSessionExpired, storageDiag } from '../lib/sessionStorage.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)
  const failReason = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => profile.value?.full_name?.trim() || user.value?.email || 'Pengguna')
  const initial = computed(() => displayName.value.charAt(0).toUpperCase())

  async function refreshUser() {
    loading.value = true
    failReason.value = ''
    try {
      // 1) Pulihkan sesi dari penyimpanan lokal (tanpa jaringan) -> login tetap saat offline.
      const { data: sessionData } = await supabase.auth.getSession()
      const storedUser = sessionData?.session?.user ?? null

      if (!storedUser) {
        failReason.value = 'storage kosong'
        user.value = null
        console.warn('[auth] Tidak ada sesi tersimpan. Fungsi penyimpanan:', await storageDiag())
        return null
      }

      // 2) Guard auto-logout: maksimal aktif 1 bulan.
      if (await isSessionExpired()) {
        failReason.value = 'sesi kedaluwarsa (1 bulan)'
        await supabase.auth.signOut({ scope: 'local' })
        user.value = null
        profile.value = null
        return null
      }

      // 3) Validasi token ke server (rotasi refresh token).
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          user.value = data.user
        } else {
          // Token sudah tidak valid di server -> keluar (hanya lokal, jangan
          // membatalkan token server yang mungkin masih sah di perangkat lain).
          failReason.value = 'token tidak valid di server'
          await supabase.auth.signOut({ scope: 'local' })
          user.value = null
          profile.value = null
          return null
        }
      } catch {
        // Gagal jaringan: tetap gunakan sesi tersimpan.
        user.value = storedUser
      }

      if (user.value) await loadProfile(user.value.id)
      return user.value
    } catch (err) {
      failReason.value = err.message || 'error'
      console.error('[auth] Gagal memuat sesi:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function loadProfile(id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (data?.full_name) {
      profile.value = data
    } else {
      profile.value = data ?? { id, full_name: null }
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    recordSessionStart()
    user.value = data.user
    if (data.user) await loadProfile(data.user.id)
    return data
  }

  async function signUp(fullName, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) throw error
    if (data.session) recordSessionStart()
    return data
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function updateProfile(fullName) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.value.id)
      .select()
      .single()
    if (error) throw error
    profile.value = data
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    loading,
    failReason,
    isAuthenticated,
    displayName,
    initial,
    refreshUser,
    loadProfile,
    signIn,
    signUp,
    requestPasswordReset,
    updateProfile,
    signOut,
  }
})