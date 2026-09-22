import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => profile.value?.full_name?.trim() || user.value?.email || 'Pengguna')
  const initial = computed(() => displayName.value.charAt(0).toUpperCase())

  async function refreshUser() {
    loading.value = true
    const { data } = await supabase.auth.getUser()
    user.value = data.user ?? null
    if (user.value) await loadProfile(user.value.id)
    loading.value = false
    return user.value
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