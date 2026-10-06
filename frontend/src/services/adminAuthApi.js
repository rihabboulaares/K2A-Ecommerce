import { ADMIN_API_BASE_URL, getAdminErrorMessage } from './adminHttp.js'

export async function loginAdmin(credentials) {
  const response = await fetch(`${ADMIN_API_BASE_URL}/admin/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      getAdminErrorMessage(data, 'Connexion impossible pour le moment.'),
    )
  }

  return data
}

export async function refreshAdminToken(refresh) {
  const response = await fetch(`${ADMIN_API_BASE_URL}/admin/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error('Session expirée.')
  }

  return data
}

export async function getCurrentAdmin(access) {
  const response = await fetch(`${ADMIN_API_BASE_URL}/admin/auth/me/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      getAdminErrorMessage(data, 'Session administrateur invalide.'),
    )
  }

  return data
}

export async function logoutAdmin(access, refresh) {
  if (!access || !refresh) {
    return
  }

  await fetch(`${ADMIN_API_BASE_URL}/admin/auth/logout/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  }).catch(() => {})
}
