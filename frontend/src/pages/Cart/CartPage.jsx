import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import ProductImage from '../../components/products/ProductImage.jsx'
import useCart from '../../hooks/useCart.js'
import { formatMillimes, getLineSubtotal } from '../../utils/cartMath.js'
import { formatPrice } from '../../utils/formatters.js'

function CartPage() {
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart()

  function decreaseQuantity(item) {
    updateQuantity(item.id, Math.max(item.quantity - 1, 1))
  }

  function increaseQuantity(item) {
    updateQuantity(item.id, Math.min(item.quantity + 1, item.stock_quantity))
  }

  function handleQuantityInput(item, value) {
    updateQuantity(item.id, value)
  }

  if (cartItems.length === 0) {
    return (
      <section className="page-section">
        <div className="container cart-empty">
          <EmptyState
            message="Votre panier est vide."
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
        <p className="eyebrow">Panier</p>
        <h1>Votre panier</h1>
        <p>Vérifiez vos articles avant de passer à la commande.</p>
      </div>

      <div className="container cart-layout">
        <div className="cart-items" aria-label="Produits dans le panier">
          {cartItems.map((item) => (
            <article className="cart-item" key={item.id}>
              <ProductImage src={item.image} alt={`Image du produit ${item.name}`} />

              <div className="cart-item-main">
                <p className="eyebrow">{item.category || 'Produit'}</p>
                <h2>{item.name}</h2>
                {item.reference && (
                  <p className="reference">Référence : {item.reference}</p>
                )}
                <p className="unit-price">Prix unitaire : {formatPrice(item.price)}</p>
              </div>

              <div className="quantity-control" aria-label={`Quantité pour ${item.name}`}>
                <button
                  type="button"
                  onClick={() => decreaseQuantity(item)}
                  aria-label={`Diminuer la quantité de ${item.name}`}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.stock_quantity || 1}
                  value={item.quantity}
                  onChange={(event) =>
                    handleQuantityInput(item, event.target.value)
                  }
                  aria-label={`Quantité de ${item.name}`}
                />
                <button
                  type="button"
                  onClick={() => increaseQuantity(item)}
                  aria-label={`Augmenter la quantité de ${item.name}`}
                  disabled={item.quantity >= item.stock_quantity}
                >
                  +
                </button>
              </div>

              <div className="cart-item-total">
                <strong>{formatMillimes(getLineSubtotal(item))}</strong>
                {item.quantity >= item.stock_quantity && (
                  <span>Stock maximum atteint</span>
                )}
              </div>

              <button
                className="remove-button"
                type="button"
                onClick={() => removeFromCart(item.id)}
                aria-label={`Supprimer ${item.name} du panier`}
              >
                Supprimer
              </button>
            </article>
          ))}
        </div>

        <aside className="cart-summary" aria-label="Résumé du panier">
          <h2>Résumé</h2>
          <div className="summary-row">
            <span>Nombre d'articles</span>
            <strong>{cartCount}</strong>
          </div>
          <div className="summary-row">
            <span>Sous-total</span>
            <strong>{formatMillimes(cartSubtotal)}</strong>
          </div>
          <div className="summary-row muted">
            <span>Livraison</span>
            <span>Calculée lors de la commande</span>
          </div>
          <div className="summary-row muted">
            <span>Frais de paiement</span>
            <span>Calculés au checkout</span>
          </div>
          <div className="summary-row total">
            <span>Total provisoire</span>
            <strong>{formatMillimes(cartSubtotal)}</strong>
          </div>
          <Link className="button primary wide" to="/checkout">
            Passer la commande
          </Link>
          <button className="button secondary wide" type="button" onClick={clearCart}>
            Vider le panier
          </button>
        </aside>
      </div>
    </section>
  )
}

export default CartPage
