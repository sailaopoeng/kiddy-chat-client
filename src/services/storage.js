// Small wrappers around localStorage / sessionStorage.
// Storage can be missing or throw (private mode, blocked cookies, quota full),
// so every call is guarded and falls back quietly.

const getStore = (name) => {
  try {
    return window[name] ?? null
  } catch {
    return null
  }
}

const createStore = (name) => ({
  getString(key, fallback = null) {
    try {
      return getStore(name)?.getItem(key) ?? fallback
    } catch {
      return fallback
    }
  },

  setString(key, value) {
    try {
      const store = getStore(name)
      if (!store) return false
      store.setItem(key, value)
      return true
    } catch {
      return false
    }
  },

  getJSON(key, fallback = null) {
    const raw = this.getString(key)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  },

  setJSON(key, value) {
    return this.setString(key, JSON.stringify(value))
  },

  remove(key) {
    try {
      getStore(name)?.removeItem(key)
    } catch {
      // Nothing to do if storage is unavailable.
    }
  },
})

export const local = createStore('localStorage')
export const session = createStore('sessionStorage')
