import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import ProductImage from '../../components/products/ProductImage.jsx'
import useCart from '../../hooks/useCart.js'
import {
  createOrder,
  getDeliveryZones,
  getPaymentMethods,
} from '../../services/orderApi.js'
import {
  formatMillimes,
  getLineSubtotal,
  priceToMillimes,
} from '../../utils/cartMath.js'
import { formatPrice } from '../../utils/formatters.js'

const initialForm = {
  customer_first_name: '',
  customer_last_name: '',
  customer_email: '',
  customer_phone: '',
  shipping_address: '',
  shipping_city: '',
  shipping_postal_code: '',
  delivery_zone_id: '',
  customer_note: '',
}

function CheckoutPage() {
  const { cartItems, cartSubtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [configError, setConfigError] = useState('')
  const [configLoading, setConfigLoading] = useState(true)

  const requiredFields = useMemo(
    () => [
      'customer_first_name',
      'customer_last_name',
      'customer_email',
      'customer_phone',
      'shipping_address',
      'shipping_city',
      'shipping_postal_code',
      'delivery_zone_id',
    ],
    [],
  )

  useEffect(() => {
    let ignore = false

    async function loadCheckoutConfig() {
      setConfigLoading(true)
      setConfigError('')

      try {
        const [zones, methods] = await Promise.all([
          getDeliveryZones(),
          getPaymentMethods(),
        ])

        if (!ignore) {
          setDeliveryZones(zones)
          setPaymentMethods(methods)
        }
      } catch {
        if (!ignore) {
          setConfigError(
            'Impossible de charger les options de livraison et de paiement.',
          )
        }
      } finally {
        if (!ignore) {
          setConfigLoading(false)
        }
      }
    }

    loadCheckoutConfig()

    return () => {
      ignore = true
    }
  }, [])

  const selectedDeliveryZone = useMemo(
    () =>
      deliveryZones.find(
        (zone) => String(zone.id) === String(formData.delivery_zone_id),
      ),
    [deliveryZones, formData.delivery_zone_id],
  )

  const cashOnDelivery = useMemo(
    () =>
      paymentMethods.find(
        (method) => method.payment_method === 'CASH_ON_DELIVERY',
      ),
    [paymentMethods],
  )

  const deliveryFeeMillimes = selectedDeliveryZone
    ? priceToMillimes(selectedDeliveryZone.delivery_fee)
    : 0
  const paymentFeeMillimes = cashOnDelivery
    ? priceToMillimes(cashOnDelivery.fee)
    : 0
  const indicativeTotal =
    cartSubtotal + deliveryFeeMillimes + paymentFeeMillimes

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setFormErrors((current) => ({ ...current, [name]: '' }))
  }

  function validateForm() {
    const nextErrors = {}

    requiredFields.forEach((field) => {
      if (!formData[field].trim()) {
        nextErrors[field] = 'Champ obligatoire.'
      }
    })

    if (formData.customer_email && !/^\S+@\S+\.\S+$/.test(formData.customer_email)) {
      nextErrors.customer_email = 'Email invalide.'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validateForm() || cartItems.length === 0) {
      return
    }

    const payload = {
      ...formData,
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    }

    setIsSubmitting(true)

    try {
      const order = await createOrder(payload)
      sessionStorage.setItem('projet_amal_last_order', JSON.stringify(order))
      clearCart()
      navigate('/order-confirmation', { state: { order } })
    } catch (error) {
      setSubmitError(normalizeOrderError(error.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <section className="page-section">
        <div className="container cart-empty">
          <EmptyState
            message="Votre panier est vide. Ajoutez des produits avant de passer commande."
            actionLabel="Découvrir les produits"
            actionTo="/products"
          />
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="container page-heading">
        <p className="eyebrow">Checkout</p>
        <h1>Finaliser la commande</h1>
        <p>Vous réglerez votre commande lors de sa réception.</p>
      </div>

      <div className="container checkout-stepper" aria-label="Progression de commande">
        <span className="active">Informations</span>
        <span>Livraison</span>
        <span>Paiement</span>
        <span>Confirmation</span>
      </div>

      <div className="container checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>Informations client</h2>
          <div className="form-grid">
            <FormField
              label="Prénom *"
              name="customer_first_name"
              value={formData.customer_first_name}
              error={formErrors.customer_first_name}
              onChange={handleChange}
            />
            <FormField
              label="Nom *"
              name="customer_last_name"
              value={formData.customer_last_name}
              error={formErrors.customer_last_name}
              onChange={handleChange}
            />
            <FormField
              label="Email *"
              name="customer_email"
              type="email"
              value={formData.customer_email}
              error={formErrors.customer_email}
              onChange={handleChange}
            />
            <FormField
              label="Téléphone *"
              name="customer_phone"
              value={formData.customer_phone}
              error={formErrors.customer_phone}
              onChange={handleChange}
            />
          </div>

          <label className="field">
            <span>Zone de livraison / Gouvernorat *</span>
            <select
              name="delivery_zone_id"
              value={formData.delivery_zone_id}
              onChange={handleChange}
              aria-invalid={Boolean(formErrors.delivery_zone_id)}
              disabled={configLoading || deliveryZones.length === 0}
            >
              <option value="">
                {deliveryZones.length === 0
                  ? 'Aucune zone disponible'
                  : 'Choisir une zone'}
              </option>
              {deliveryZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {formErrors.delivery_zone_id && (
              <small>{formErrors.delivery_zone_id}</small>
            )}
          </label>

          <h2>Livraison</h2>
          <FormField
            label="Adresse *"
            name="shipping_address"
            value={formData.shipping_address}
            error={formErrors.shipping_address}
            onChange={handleChange}
          />
          <div className="form-grid">
            <FormField
              label="Ville *"
              name="shipping_city"
              value={formData.shipping_city}
              error={formErrors.shipping_city}
              onChange={handleChange}
            />
            <FormField
              label="Code postal *"
              name="shipping_postal_code"
              value={formData.shipping_postal_code}
              error={formErrors.shipping_postal_code}
              onChange={handleChange}
            />
          </div>

          <label className="field">
            <span>Note pour la commande</span>
            <textarea
              name="customer_note"
              value={formData.customer_note}
              onChange={handleChange}
              rows="4"
              placeholder="Instruction utile pour la livraison..."
            />
          </label>

          <section className="payment-option" aria-label="Mode de paiement">
            <div>
              <p className="eyebrow">Mode de paiement</p>
              <h2>{cashOnDelivery?.label || 'Paiement à la livraison'}</h2>
              <p>Vous réglerez votre commande lors de sa réception.</p>
            </div>
            <span aria-hidden="true">Sélectionné</span>
          </section>

          {configError && <ErrorState message={configError} />}
          {!configLoading && deliveryZones.length === 0 && (
            <ErrorState message="Aucune zone de livraison n'est actuellement disponible." />
          )}
          {!configLoading && !cashOnDelivery && (
            <ErrorState message="Le paiement à la livraison n'est actuellement pas disponible." />
          )}

          <p className="checkout-note">
            La validation backend reste la source de vérité pour les prix, le stock
            et la disponibilité des produits.
          </p>

          {submitError && <ErrorState message={submitError} />}

          <button
            className="button primary wide"
            type="submit"
            disabled={
              isSubmitting ||
              configLoading ||
              deliveryZones.length === 0 ||
              !cashOnDelivery
            }
          >
            {isSubmitting ? 'Validation en cours...' : 'Confirmer la commande'}
          </button>
        </form>

        <aside className="checkout-summary" aria-label="Récapitulatif checkout">
          <h2>Récapitulatif</h2>
          <p className="checkout-note">
            Le prix et la disponibilité sont confirmés lors de la validation de la
            commande.
          </p>
          <div className="checkout-items">
            {cartItems.map((item) => (
              <div className="checkout-item" key={item.id}>
                <ProductImage src={item.image} alt={`Image du produit ${item.name}`} />
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatPrice(item.price)}
                  </span>
                  <span>{formatMillimes(getLineSubtotal(item))}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="summary-row total">
            <span>Sous-total produits</span>
            <strong>{formatMillimes(cartSubtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Livraison</span>
            <strong>
              {selectedDeliveryZone
                ? formatMillimes(deliveryFeeMillimes)
                : 'Choisissez votre zone'}
            </strong>
          </div>
          <div className="summary-row">
            <span>Frais de paiement</span>
            <strong>
              {cashOnDelivery
                ? formatMillimes(paymentFeeMillimes)
                : 'Indisponible'}
            </strong>
          </div>
          <div className="summary-row total">
            <span>Total à payer</span>
            <strong>{formatMillimes(indicativeTotal)}</strong>
          </div>
          <p className="checkout-note">
            Le montant final est confirmé lors de la validation de la commande.
          </p>
        </aside>
      </div>
    </section>
  )
}

function FormField({ label, name, value, onChange, error, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
      />
      {error && <small>{error}</small>}
    </label>
  )
}

function normalizeOrderError(message) {
  if (message.toLowerCase().includes('stock')) {
    return 'Certains produits ne sont plus disponibles dans la quantité demandée.'
  }

  if (message.toLowerCase().includes('disponible') || message.toLowerCase().includes('existe')) {
    return "Un produit de votre panier n'est plus disponible."
  }

  return 'Impossible de valider votre commande pour le moment.'
}

export default CheckoutPage
