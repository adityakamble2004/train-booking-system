
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

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const handleExpired = () => {
      if (active) {
        setUser(null)
        setLoading(false)
      }
    }

    window.addEventListener('railyatra:session-expired', handleExpired)

    restoreLoginSession()
      .then((data) => {
        if (active) setUser(data?.user ?? null)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

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
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (details) => {
    const data = await registerApi(details)

    if (data.accessToken && data.user) {
      setUser(data.user)
    }

    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
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
