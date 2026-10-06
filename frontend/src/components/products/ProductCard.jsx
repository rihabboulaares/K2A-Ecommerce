import { useState } from 'react'
import { Link } from 'react-router-dom'
import useCart from '../../hooks/useCart.js'
import {
  formatPrice,
  formatVolume,
  getPrimaryImage,
} from '../../utils/formatters.js'
import ProductImage from './ProductImage.jsx'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [feedback, setFeedback] = useState('')
  const image = getPrimaryImage(product.images)
  const volume = formatVolume(product.volume_value, product.volume_unit)

  function handleAddToCart() {
    const result = addToCart(product, 1)
    setFeedback(result.message)
  }

  return (
    <article className="product-card">
      <Link
        className="product-card-media"
        to={`/products/${product.id}`}
        aria-label={`Voir ${product.name}`}
      >
        <span className={product.is_in_stock ? 'stock-badge in' : 'stock-badge out'}>
          {product.is_in_stock ? 'En stock' : 'Rupture'}
        </span>
        <ProductImage
          src={image?.image}
          alt={`Image du produit ${product.name}`}
        />
      </Link>

      <div className="product-card-body">
        <div className="product-card-title">
          <p>{product.category?.name || 'Catalogue'}</p>
          <h3>
            <Link to={`/products/${product.id}`}>{product.name}</Link>
          </h3>
        </div>

        <div className="product-meta">
          {volume && <span>{volume}</span>}
          {product.scent && <span>{product.scent}</span>}
        </div>

        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.old_price && <span>{formatPrice(product.old_price)}</span>}
        </div>

        <div className="card-actions">
          <Link to={`/products/${product.id}`} className="text-link">
            Voir la fiche
          </Link>
        </div>
        <button
          className="button primary wide"
          type="button"
          onClick={handleAddToCart}
          disabled={!product.is_in_stock}
        >
          {product.is_in_stock ? 'Ajouter au panier' : 'Rupture de stock'}
        </button>
        {feedback && (
          <p className="inline-feedback" role="status">
            {feedback}
          </p>
        )}
      </div>
    </article>
  )
}

export default ProductCard
