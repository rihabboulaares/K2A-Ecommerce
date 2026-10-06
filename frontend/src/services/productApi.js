import { API_BASE_URL } from '../config/api'

async function request(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('API request failed')
  }

  return response.json()
}

export function getApiOrigin() {
  return new URL(API_BASE_URL).origin
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


