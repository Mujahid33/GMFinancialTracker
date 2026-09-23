const DB_NAME = 'gm-auth'
const DB_STORE = 'kv'
const IDB_KEY_PREFIX = 'gm:idb:'

export const SESSION_MAX_DAYS = 30
export const SESSION_STARTED_KEY = 'gm_session_started_at'
const DAY_MS = 24 * 60 * 60 * 1000

function isSecureContext() {
  return typeof location !== 'undefined' && location.protocol === 'https:'
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function setCookie(key, value) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + SESSION_MAX_DAYS * DAY_MS)
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
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
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

// ---- IndexedDB: penyimpanan paling awet di mobile (fallback terakhir) ----
function idbOpen() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbGet(key) {
  try {
    const db = await idbOpen()
    if (!db) return null
    const value = await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const rq = tx.objectStore(DB_STORE).get(IDB_KEY_PREFIX + key)
      rq.onsuccess = () => resolve(rq.result ?? null)
      rq.onerror = () => resolve(null)
    })
    db.close()
    return value
  } catch {
    return null
  }
}

async function idbDelete(key) {
  try {
    const db = await idbOpen()
    if (!db) return
    await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).delete(IDB_KEY_PREFIX + key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {}
}

function idbPut(key, value) {
  idbOpen()
    .then((db) => {
      if (!db) return
      return new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, 'readwrite')
        tx.objectStore(DB_STORE).put(value, IDB_KEY_PREFIX + key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      }).finally(() => db.close())
    })
    .catch(() => {})
}

/**
 * Menyimpan sesi di 3 tempat: localStorage + cookie + IndexedDB.
 * Cookie memastikan sesi bertahan saat app ditutup/dibuka ulang,
 * IndexedDB jadi cadangan paling awet bila localStorage dibersihkan
 * (terutama PWA standalone iOS/Android).
 */
export const supabaseSessionStorage = {
  getItem(key) {
    if (useLocal) {
      const local = window.localStorage.getItem(key)
      if (local != null) return local
    }
    const ck = getCookie(key)
    if (ck != null) return ck
    return idbGet(key)
  },
  setItem(key, value) {
    if (useLocal) window.localStorage.setItem(key, value)
    setCookie(key, value)
    idbPut(key, value)
  },
  removeItem(key) {
    if (useLocal) window.localStorage.removeItem(key)
    eraseCookie(key)
    idbDelete(key)
  },
}

// ---- Penanda waktu login (untuk auto-logout 1 bulan) ----
function storeValue(key, value) {
  if (useLocal) window.localStorage.setItem(key, value)
  setCookie(key, value)
  idbPut(key, value)
}

function readValue(key, syncOnly) {
  if (useLocal) {
    const local = window.localStorage.getItem(key)
    if (local != null) return { value: local, source: 'localStorage' }
  }
  const ck = getCookie(key)
  if (ck != null) return { value: ck, source: 'cookie' }
  return syncOnly ? null : { value: null, source: 'none' }
}

export function recordSessionStart() {
  storeValue(SESSION_STARTED_KEY, new Date().toISOString())
}

export async function isSessionExpired() {
  const local = readValue(SESSION_STARTED_KEY, true)
  const raw = local?.value ?? (await idbGet(SESSION_STARTED_KEY))
  if (!raw) return false
  const started = new Date(raw).getTime()
  if (Number.isNaN(started)) return false
  return Date.now() - started > SESSION_MAX_DAYS * DAY_MS
}

/**
 * Status penyimpanan untuk diagnostic (dipakai di halaman login).
 */
export async function storageDiag() {
  const testKey = '__gm_diag__'
  const sample = 'ok'
  const results = { localStorage: 'n/a', cookie: 'n/a', indexedDB: 'n/a', session: null }
  try {
    if (useLocal) {
      window.localStorage.setItem(testKey, sample)
      results.localStorage = window.localStorage.getItem(testKey) === sample ? 'ok' : 'gagal'
    } else {
      results.localStorage = 'tidak tersedia'
    }
  } catch {
    results.localStorage = 'gagal'
  }
  try {
    setCookie(testKey, sample)
    results.cookie = getCookie(testKey) === sample ? 'ok' : 'gagal'
  } catch {
    results.cookie = 'gagal'
  }
  try {
    idbPut(testKey, sample)
    const v = await idbGet(testKey)
    await idbDelete(testKey)
    results.indexedDB = v === sample ? 'ok' : 'gagal'
  } catch {
    results.indexedDB = 'gagal'
  }
  // Bersihkan test keys
  try {
    if (useLocal) window.localStorage.removeItem(testKey)
  } catch {}
  eraseCookie(testKey)
  const started = readValue(SESSION_STARTED_KEY, true)
  results.session = started?.value ? (await isSessionExpired() ? 'kedaluwarsa' : 'ada') : 'tidak ada'
  return results
}