
import { ApiError } from './accountClient'

const API_BASE = import.meta.env.VITE_PUBLIC_API_URL

export async function publicRequest(path, options = {}) {
  const { body, headers: suppliedHeaders = {}, ...fetchOptions } = options
  const headers = new Headers(suppliedHeaders)

  headers.set('Accept', 'application/json')

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'omit',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }

  return data
}
