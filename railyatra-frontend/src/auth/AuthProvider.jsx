import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  restoreLoginSession,
} from '../api/authApi'

import { accountRequest } from '../api/accountClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadCurrentUser = useCallback(async () => {
    const currentUser = await accountRequest('/users/me', {
      method: 'GET',
    })

    setUser(currentUser)
    return currentUser
  }, [])

  useEffect(() => {
    let active = true

    const handleExpired = () => {
      if (active) {
        setUser(null)
        setLoading(false)
      }
    }

    window.addEventListener(
      'railyatra:session-expired',
      handleExpired,
    )

    async function initializeSession() {
      try {
        const session = await restoreLoginSession()

        if (!session?.accessToken) {
          if (active) setUser(null)
          return
        }

        // Always verify the logged-in user with the backend.
        const currentUser = await accountRequest('/users/me', {
          method: 'GET',
        })

        if (active) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Session restoration failed:', error)

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      active = false
      window.removeEventListener(
        'railyatra:session-expired',
        handleExpired,
      )
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await loginApi(credentials)

    // Use the login response first, then verify with GET /users/me.
    setUser(data.user ?? null)

    try {
      const currentUser = await loadCurrentUser()
      return { ...data, user: currentUser }
    } catch (error) {
      setUser(null)
      throw error
    }
  }, [loadCurrentUser])

  const register = useCallback(async (details) => {
    const data = await registerApi(details)

    if (data.accessToken) {
      try {
        const currentUser = await loadCurrentUser()
        return { ...data, user: currentUser }
      } catch (error) {
        setUser(null)
        throw error
      }
    }

    return data
  }, [loadCurrentUser])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
