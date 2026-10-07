import { API_BASE_URL } from '../config/api'

function buildApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return new URL(`${API_BASE_URL}${cleanPath}`)
  }

  return new URL(
    `${API_BASE_URL}${cleanPath}`,
    window.location.origin,
  )
}

async function request(path, params) {
  const url = buildApiUrl(path)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json()
}

export function getApiOrigin() {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return new URL(API_BASE_URL).origin
  }

  return window.location.origin
}

export function getCategories() {
  return request('/categories/')
}

export function getUsages() {
  return request('/usages/')
}

export function getProducts(params = {}) {
  return request('/products/', params)
}

export function getProductById(id) {
  return request(`/products/${id}/`)
}
