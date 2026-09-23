export const SESSION_MAX_DAYS = 30
export const SESSION_STARTED_KEY = 'gm_session_started_at'
const SESSION_COOKIE_DAYS = SESSION_MAX_DAYS

const DAY_MS = 24 * 60 * 60 * 1000

function isSecureContext() {
  return typeof location !== 'undefined' && location.protocol === 'https:'
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function setCookie(key, value) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + SESSION_COOKIE_DAYS * DAY_MS)
  const secure = isSecureContext() ? '; Secure' : ''
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`
}

function getCookie(key) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegExp(key)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function eraseCookie(key) {
  if (typeof document === 'undefined') return
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function localStorageAvailable() {
  try {
    const t = '__gm_t__'
    window.localStorage.setItem(t, '1')
    window.localStorage.removeItem(t)
    return true
  } catch {
    return false
  }
}

const useLocal = typeof window !== 'undefined' && localStorageAvailable()

/**
 * Menyimpan sesi di localStorage DAN cookie sekaligus.
 * Cookie memastikan sesi tetap ada saat app ditutup/dibuka ulang
 * (mis. PWA standalone iOS/Android yang kadang menghapus localStorage),
 * sekaligus jadi batas auto-logout ~1 bulan (cookie expires).
 */
export const supabaseSessionStorage = {
  getItem(key) {
    if (useLocal) {
      const local = window.localStorage.getItem(key)
      if (local) return local
    }
    return getCookie(key)
  },
  setItem(key, value) {
    if (useLocal) window.localStorage.setItem(key, value)
    setCookie(key, value)
  },
  removeItem(key) {
    if (useLocal) window.localStorage.removeItem(key)
    eraseCookie(key)
  },
}

function storeValue(key, value) {
  if (useLocal) window.localStorage.setItem(key, value)
  setCookie(key, value)
}

function readValue(key) {
  if (!useLocal) return getCookie(key)
  return window.localStorage.getItem(key) || getCookie(key)
}

export function recordSessionStart() {
  storeValue(SESSION_STARTED_KEY, new Date().toISOString())
}

export function isSessionExpired() {
  const raw = readValue(SESSION_STARTED_KEY)
  if (!raw) return false
  const started = new Date(raw).getTime()
  if (Number.isNaN(started)) return false
  return Date.now() - started > SESSION_MAX_DAYS * DAY_MS
}