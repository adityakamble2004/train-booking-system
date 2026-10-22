
const API_BASE = import.meta.env.VITE_ACCOUNT_API_URL

let accessToken = null
let refreshPromise = null
let startupRestorePromise = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export async function refreshAccessToken() {
  // Share the same refresh request across concurrent callers.
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        accessToken = null
        throw new Error('Session refresh failed')
      }

      const data = await response.json()

      if (!data.accessToken) {
        accessToken = null
        throw new Error('Refresh response did not contain an access token')
      }

      accessToken = data.accessToken
      return data
    } catch (error) {
      accessToken = null
      throw error
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export function restoreSession() {
  // Cache even a failed startup attempt. StrictMode must not
  // consume the same rotating refresh cookie twice.
  if (!startupRestorePromise) {
    startupRestorePromise = refreshAccessToken().catch(() => null)
  }

  return startupRestorePromise
}

export function markSessionStarted(data) {
  startupRestorePromise = Promise.resolve(data)
}

export function markSessionEnded() {
  accessToken = null
  startupRestorePromise = Promise.resolve(null)
}
