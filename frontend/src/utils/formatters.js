import { getApiOrigin } from '../services/productApi.js'

export function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  return `${value} DT`
}

export function formatVolume(value, unit) {
  if (!value || !unit) {
    return ''
  }

  const formattedValue = String(value).replace(/\.00$/, '')
  const formattedUnit = unit === 'ML' ? 'ml' : unit

  return `${formattedValue} ${formattedUnit}`
}

export function getPrimaryImage(images = []) {
  if (!Array.isArray(images) || images.length === 0) {
    return null
  }

  return images.find((image) => image.is_primary) || images[0]
}

export function resolveImageUrl(url) {
  if (!url) {
    return ''
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `${getApiOrigin()}${url}`
}
