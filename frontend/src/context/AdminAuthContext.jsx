import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  refreshAdminToken,
} from '../services/adminAuthApi.js'
import { AdminAuthContext } from './adminAuthContextValue.js'

const STORAGE_KEY = 'projet_amal_admin_session'

function readStoredSession() {
  try {
    const rawSession = window.sessionStorage.getItem(STORAGE_KEY)
    return rawSession ? JSON.parse(rawSession) : null
  } catch {
    return null
  }
}

function storeSession(session) {
  if (!session?.access || !session?.refresh) {
    window.sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function AdminAuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => readStoredSession())
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('checking')

  const clearSession = useCallback(() => {
    setTokens(null)
    setUser(null)
    storeSession(null)
  }, [])

  const applySession = useCallback((session, nextUser = null) => {
    setTokens(session)
    setUser(nextUser)
    storeSession(session)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function validateSession() {
      const storedSession = readStoredSession()

      if (!storedSession?.access || !storedSession?.refresh) {
        if (isMounted) {
          clearSession()
          setStatus('anonymous')
        }
        return
      }

      try {
        const currentUser = await getCurrentAdmin(storedSession.access)

        if (isMounted) {
          applySession(storedSession, currentUser)
          setStatus('authenticated')
        }
      } catch {
        try {
          const refreshed = await refreshAdminToken(storedSession.refresh)
          const nextSession = {
            access: refreshed.access,
            refresh: refreshed.refresh || storedSession.refresh,
          }
          const currentUser = await getCurrentAdmin(nextSession.access)

          if (isMounted) {
            applySession(nextSession, currentUser)
            setStatus('authenticated')
          }
        } catch {
          if (isMounted) {
            clearSession()
            setStatus('anonymous')
          }
        }
      }
    }

    validateSession()

    return () => {
      isMounted = false
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (credentials) => {
      setStatus('checking')
      const data = await loginAdmin(credentials)
      const nextSession = {
        access: data.access,
        refresh: data.refresh,
      }

      applySession(nextSession, data.user)
      setStatus('authenticated')
      return data.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const currentTokens = tokens
    clearSession()
    setStatus('anonymous')
    await logoutAdmin(currentTokens?.access, currentTokens?.refresh)
  }, [clearSession, tokens])

  const value = useMemo(
    () => ({
      accessToken: tokens?.access || null,
      user,
      isAuthenticated: status === 'authenticated',
      isChecking: status === 'checking',
      login,
      logout,
    }),
    [login, logout, status, tokens?.access, user],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
