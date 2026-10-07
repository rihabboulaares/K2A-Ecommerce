import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CustomerAuthContext from './customerAuthContextValue.js'
import {
  clearCustomerTokens,
  getCurrentCustomer,
  getCustomerAccessToken,
  getCustomerRefreshToken,
  loginCustomer,
  logoutCustomer,
  refreshCustomerToken,
  registerCustomer,
  saveCustomerTokens,
} from '../services/customerAuthApi.js'

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const disconnect = useCallback(() => {
    clearCustomerTokens()
    setCustomer(null)
  }, [])

  const loadCustomer = useCallback(async () => {
    const access = getCustomerAccessToken()
    const refresh = getCustomerRefreshToken()

    if (!access || !refresh) {
      setCustomer(null)
      setIsLoading(false)
      return
    }

    try {
      const user = await getCurrentCustomer(access)
      setCustomer(user)
    } catch (error) {
      if (error.status !== 401) {
        disconnect()
        setIsLoading(false)
        return
      }

      try {
        const tokens = await refreshCustomerToken(refresh)

        saveCustomerTokens({
          access: tokens.access,
          refresh: tokens.refresh || refresh,
        })

        const user = await getCurrentCustomer(tokens.access)
        setCustomer(user)
      } catch {
        disconnect()
      }
    } finally {
      setIsLoading(false)
    }
  }, [disconnect])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  const login = useCallback(async (credentials) => {
    const data = await loginCustomer(credentials)

    saveCustomerTokens(data)
    setCustomer(data.user)

    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const data = await registerCustomer(payload)

    saveCustomerTokens(data)
    setCustomer(data.user)

    return data.user
  }, [])

  const logout = useCallback(async () => {
    const access = getCustomerAccessToken()
    const refresh = getCustomerRefreshToken()

    try {
      if (access && refresh) {
        await logoutCustomer(refresh, access)
      }
    } catch {
      // La session locale doit être supprimée même si le token est expiré.
    } finally {
      disconnect()
    }
  }, [disconnect])

  const value = useMemo(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      isLoading,
      login,
      register,
      logout,
    }),
    [customer, isLoading, login, register, logout],
  )

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}
