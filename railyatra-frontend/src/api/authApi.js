
import { accountRequest } from './accountClient'
import {
  setAccessToken,
  markSessionStarted,
  markSessionEnded,
  refreshAccessToken,
} from './session'

export async function login(credentials) {
  const data = await accountRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: credentials,
  })

  setAccessToken(data.accessToken)
  markSessionStarted(data)
  return data
}

export async function register(details) {
  const data = await accountRequest('/auth/register', {
    method: 'POST',
    auth: false,
    body: details,
  })

  if (data.accessToken) {
    setAccessToken(data.accessToken)
    markSessionStarted(data)
  }

  return data
}

export function restoreLoginSession() {
  return import('./session').then(({ restoreSession }) => restoreSession())
}

export async function logout() {
  try {
    await accountRequest('/auth/logout', {
      method: 'POST',
      auth: false,
    })
  } finally {
    markSessionEnded()
  }
}

export { refreshAccessToken }
