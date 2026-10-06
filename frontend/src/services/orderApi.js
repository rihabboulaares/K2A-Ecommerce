import { API_BASE_URL } from '../config/api'

export async function createOrder(payload) {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(getOrderErrorMessage(data))
  }

  return data
}

export async function getDeliveryZones() {
  return request('/delivery-zones/')
}

export async function getPaymentMethods() {
  return request('/payment-methods/')
}

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(getOrderErrorMessage(data))
  }

  return data
}

function getOrderErrorMessage(data) {
  const rawMessage = data?.items || data?.detail || data?.non_field_errors

  if (Array.isArray(rawMessage)) {
    return rawMessage.join(' ')
  }

  if (typeof rawMessage === 'string') {
    return rawMessage
  }

  return 'Impossible de valider votre commande pour le moment.'
}


