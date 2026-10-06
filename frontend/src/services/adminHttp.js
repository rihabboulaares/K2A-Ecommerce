import { API_BASE_URL } from '../config/api'

export const ADMIN_API_BASE_URL = API_BASE_URL

export function getAdminErrorMessage(data, fallback) {
  const rawMessage = data?.detail || data?.non_field_errors

  if (Array.isArray(rawMessage)) {
    return rawMessage.join(' ')
  }

  if (typeof rawMessage === 'string') {
    if (rawMessage.toLowerCase().includes('no active account')) {
      return 'Identifiant ou mot de passe incorrect.'
    }

    if (rawMessage.toLowerCase().includes('administrateur')) {
      return 'Ce compte nâ€™a pas accÃ¨s Ã  lâ€™espace administrateur.'
    }
  }

  return fallback
}



