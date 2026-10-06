export const ORDER_STATUS_LABELS = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}

export const PAYMENT_STATUS_LABELS = {
  PENDING: 'En attente',
  PAID: 'Payé',
}

export function orderStatusLabel(value) {
  return ORDER_STATUS_LABELS[value] || value
}

export function paymentStatusLabel(value) {
  return PAYMENT_STATUS_LABELS[value] || value
}

export function stockState(product, lowStockThreshold = 5) {
  if (!product || Number(product.stock_quantity) <= 0) {
    return { label: 'Rupture', className: 'danger' }
  }

  if (Number(product.stock_quantity) <= lowStockThreshold) {
    return { label: 'Stock faible', className: 'warning' }
  }

  return { label: 'En stock', className: 'success' }
}
