import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import { formatPrice } from '../../utils/formatters.js'

function OrderConfirmationPage() {
  const location = useLocation()
  const order = useMemo(() => {
    if (location.state?.order) {
      return location.state.order
    }

    try {
      const storedOrder = sessionStorage.getItem('projet_amal_last_order')
      return storedOrder ? JSON.parse(storedOrder) : null
    } catch {
      return null
    }
  }, [location.state])

  if (!order) {
    return (
      <section className="page-section">
        <div className="container cart-empty">
          <EmptyState message="La confirmation de commande n'est plus disponible." />
          <Link className="button primary" to="/products">
            Retour au catalogue
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="container confirmation-panel">
        <div className="success-mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Commande confirmée</p>
        <h1>Commande confirmée !</h1>
        <p>
          Merci {order.customer_first_name}. Votre commande{' '}
          <strong>{order.order_number}</strong> a bien été enregistrée.
        </p>

        <div className="confirmation-grid">
          <section>
            <h2>Produits</h2>
            <div className="confirmation-items">
              {order.items.map((item) => (
                <div className="confirmation-item" key={item.product_reference}>
                  <strong>{item.product_name}</strong>
                  <span>Référence : {item.product_reference}</span>
                  <span>
                    {item.quantity} x {formatPrice(item.unit_price)}
                  </span>
                  <span>{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Livraison</h2>
            <p>
              {order.customer_first_name} {order.customer_last_name}
            </p>
            <p>{order.customer_phone}</p>
            <p>{order.customer_email}</p>
            <p>{order.shipping_address}</p>
            <p>
              {order.shipping_postal_code} {order.shipping_city}
            </p>
          </section>
        </div>

        <div className="summary-row total">
          <span>Statut</span>
          <strong>{order.status_display || order.status}</strong>
        </div>
        <div className="summary-row total">
          <span>Sous-total</span>
          <strong>{formatPrice(order.subtotal)}</strong>
        </div>
        <div className="summary-row total">
          <span>Zone de livraison</span>
          <strong>{order.delivery_zone_name}</strong>
        </div>
        <div className="summary-row total">
          <span>Frais de livraison</span>
          <strong>{formatPrice(order.delivery_fee)}</strong>
        </div>
        <div className="summary-row total">
          <span>Mode de paiement</span>
          <strong>
            {order.payment_method_display || 'Paiement à la livraison'}
          </strong>
        </div>
        <div className="summary-row total">
          <span>Frais de paiement</span>
          <strong>{formatPrice(order.payment_fee)}</strong>
        </div>
        <div className="summary-row total">
          <span>Statut du paiement</span>
          <strong>{order.payment_status_display || 'En attente'}</strong>
        </div>
        <div className="summary-row total">
          <span>Total confirmé par le backend</span>
          <strong>{formatPrice(order.total_amount)}</strong>
        </div>
        <p className="checkout-note">
          Le règlement sera effectué lors de la réception de votre commande.
        </p>

        <Link className="button primary" to="/products">
          Continuer mes achats
        </Link>
        <Link className="text-link" to="/">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  )
}

export default OrderConfirmationPage
