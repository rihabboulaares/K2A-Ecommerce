import { ADMIN_API_BASE_URL, getAdminErrorMessage } from './adminHttp.js'

export async function adminRequest(path, accessToken, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  })

  if (response.status === 204) {
    return null
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      getAdminErrorMessage(data, 'Action impossible pour le moment.'),
    )
  }

  return data
}

export function toQueryString(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}
