const normalizeUrl = (url) => {
  return (url || '').replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL || '/api'
)

console.log('[K2A] MODE =', import.meta.env.MODE)
console.log('[K2A] API_BASE_URL =', API_BASE_URL)

export const apiUrl = (path = '') => {
  const cleanPath = path.replace(/^\/+/, '')
  return `${API_BASE_URL}/${cleanPath}`
}
