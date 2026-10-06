const normalizeUrl = (url) => {
  return (url || '').replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL || '/api'
)

export const apiUrl = (path = '') => {
  const cleanPath = path.replace(/^\/+/, '')
  return `${API_BASE_URL}/${cleanPath}`
}
