import { API_BASE_URL } from '../config/api'

const ACCESS_TOKEN_KEY = 'k2a_customer_access'
const REFRESH_TOKEN_KEY = 'k2a_customer_refresh'

export function getCustomerAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getCustomerRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function saveCustomerTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }
}

export function clearCustomerTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data.detail ||
        data.non_field_errors?.[0] ||
        'Une erreur est survenue.'
    )

    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export async function loginCustomer(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  return parseResponse(response)
}

export async function registerCustomer(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function getCurrentCustomer(accessToken) {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseResponse(response)
}

export async function refreshCustomerToken(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  })

  return parseResponse(response)
}

export async function logoutCustomer(refreshToken, accessToken) {
  const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  })

  if (response.status === 204) {
    return
  }

  return parseResponse(response)
}
