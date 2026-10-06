export function priceToMillimes(price) {
  if (price === null || price === undefined || price === '') {
    return 0
  }

  const [whole = '0', decimals = ''] = String(price).split('.')
  const normalizedDecimals = decimals.padEnd(3, '0').slice(0, 3)

  return Number.parseInt(whole, 10) * 1000 + Number.parseInt(normalizedDecimals, 10)
}

export function formatMillimes(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  const whole = Math.trunc(safeValue / 1000)
  const decimals = String(Math.abs(safeValue % 1000)).padStart(3, '0')

  return `${whole}.${decimals} DT`
}

export function getLineSubtotal(item) {
  return priceToMillimes(item.price) * item.quantity
}
