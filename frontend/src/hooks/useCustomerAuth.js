import { useContext } from 'react'
import CustomerAuthContext from '../context/customerAuthContextValue.js'

export default function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)

  if (!context) {
    throw new Error(
      'useCustomerAuth doit être utilisé dans CustomerAuthProvider.'
    )
  }

  return context
}
