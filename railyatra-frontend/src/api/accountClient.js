
import {
  getAccessToken,
  refreshAccessToken,
  clearAccessToken,
  markSessionEnded,
} from './session'

const API_BASE = import.meta.env.VITE_ACCOUNT_API_URL

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = data?.code || 'UNKNOWN_ERROR'
    this.fieldErrors = data?.fieldErrors || []
    this.data = data
  }
}

async function readResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

function expireSession() {
  clearAccessToken()
  markSessionEnded()

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('railyatra:session-expired'))
  }
}

async function execute(path, options, canRefresh) {
  const {
    auth = true,
    body,
    headers: suppliedHeaders = {},
    ...fetchOptions
  } = options

  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth && getAccessToken()) {
    headers.set('Authorization', `Bearer ${getAccessToken()}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = await readResponse(response)

  if (response.ok) return data

  const error = new ApiError(response.status, data)

  if (auth && response.status === 401 && error.code === 'UNAUTHORIZED') {
    if (canRefresh) {
      try {
        await refreshAccessToken()
        return execute(path, options, false)
      } catch {
        expireSession()
        throw error
      }
    }

    expireSession()
  }

  throw error
}

export function accountRequest(path, options = {}) {
  return execute(path, options, true)
}
