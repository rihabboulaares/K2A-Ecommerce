import { ADMIN_API_BASE_URL, getAdminErrorMessage } from './adminHttp.js'

export async function getAdminDashboard(access) {
  const response = await fetch(`${ADMIN_API_BASE_URL}/admin/dashboard/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      getAdminErrorMessage(data, 'Impossible de charger le tableau de bord.'),
    )
  }

  return data
}
