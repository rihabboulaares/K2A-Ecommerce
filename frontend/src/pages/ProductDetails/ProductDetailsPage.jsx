import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ProductImage from '../../components/products/ProductImage.jsx'
import useCart from '../../hooks/useCart.js'
import { getProductById } from '../../services/productApi.js'
import {
  formatPrice,
  formatVolume,
  getPrimaryImage,
} from '../../utils/formatters.js'

function ProductDetailsPage() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadProduct() {
      setLoading(true)
      setError(false)

      try {
        const productData = await getProductById(id)
        const primaryImage = getPrimaryImage(productData.images)

        if (!ignore) {
          setProduct(productData)
          setSelectedImage(primaryImage)
          setQuantity(productData.stock_quantity > 0 ? 1 : 0)
          setFeedback('')
        }
      } catch {
        if (!ignore) {
          setError(true)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      ignore = true
    }
  }, [id])

  const volume = useMemo(
    () => formatVolume(product?.volume_value, product?.volume_unit),
    [product],
  )

  function handleQuantityChange(event) {
    const stockQuantity = product?.stock_quantity || 0
    const nextQuantity = Number.parseInt(event.target.value, 10) || 1

    setQuantity(Math.min(Math.max(nextQuantity, 1), stockQuantity || 1))
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(current - 1, 1))
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(current + 1, product?.stock_quantity || current),
    )
  }

  function handleAddToCart() {
    if (!product?.is_in_stock) {
      setFeedback('Rupture de stock.')
      return
    }

    if (quantity > product.stock_quantity) {
      setFeedback(`Quantité limitée au stock disponible (${product.stock_quantity}).`)
      return
    }

    const result = addToCart(product, quantity)
    setFeedback(result.message)
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="container">
          <LoadingState label="Chargement du produit..." />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page-section">
        <div className="container">
          <ErrorState message="Impossible de charger ce produit pour le moment." />
          <Link className="text-link" to="/products">
            Retour au catalogue
          </Link>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="page-section">
        <div className="container">
          <EmptyState message="Produit introuvable." />
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="container product-detail">
        <div className="gallery">
          <div className="main-image">
            <ProductImage
              src={selectedImage?.image}
              alt={`Image principale du produit ${product.name}`}
            />
          </div>

          {product.images?.length > 0 && (
            <div className="thumbnail-row" aria-label="Galerie produit">
              {product.images.map((image) => (
                <button
                  className={
                    selectedImage?.id === image.id ? 'thumbnail active' : 'thumbnail'
                  }
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Afficher l'image ${image.id}`}
                >
                  <ProductImage src={image.image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <Link className="text-link" to="/products">
            Retour au catalogue
          </Link>
          <p className="eyebrow">{product.category?.name || 'Produit'}</p>
          <h1>{product.name}</h1>
          <p className="reference">Référence : {product.reference}</p>

          <div className="detail-price">
            <strong>{formatPrice(product.price)}</strong>
            {product.old_price && <span>{formatPrice(product.old_price)}</span>}
          </div>

          <span className={product.is_in_stock ? 'stock-badge in' : 'stock-badge out'}>
            {product.is_in_stock ? 'En stock' : 'Rupture de stock'}
          </span>

          <dl className="product-specs">
            <dt>Catégorie</dt>
            <dd>{product.category?.name || '-'}</dd>
            {volume && (
              <>
                <dt>Volume</dt>
                <dd>{volume}</dd>
              </>
            )}
            {product.scent && (
              <>
                <dt>Parfum</dt>
                <dd>{product.scent}</dd>
              </>
            )}
            {product.usages?.length > 0 && (
              <>
                <dt>Usages</dt>
                <dd>{product.usages.map((usage) => usage.name).join(', ')}</dd>
              </>
            )}
            <dt>Stock</dt>
            <dd>{product.is_in_stock ? 'Disponible' : 'Indisponible'}</dd>
          </dl>

          <div className="purchase-preview">
            <label htmlFor="quantity">Quantité</label>
            <div className="quantity-control product-quantity">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={!product.is_in_stock || quantity <= 1}
                aria-label="Diminuer la quantité"
              >
                -
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max={product.stock_quantity || 1}
                value={quantity}
                onChange={handleQuantityChange}
                disabled={!product.is_in_stock}
              />
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={!product.is_in_stock || quantity >= product.stock_quantity}
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>
            {!product.is_in_stock && <p className="stock out">Rupture de stock</p>}
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
        </div>
      </div>

      <div className="container product-tabs">
        <section className="product-tab-panel">
          <h2>Description</h2>
          <p>
            {product.description ||
              'Aucune description détaillée n’est disponible pour ce produit.'}
          </p>
        </section>
        <section className="product-tab-panel">
          <h2>Caractéristiques</h2>
          <ul>
            {volume && <li>Volume : {volume}</li>}
            {product.scent && <li>Parfum : {product.scent}</li>}
            {product.usages?.length > 0 && (
              <li>Usages : {product.usages.map((usage) => usage.name).join(', ')}</li>
            )}
            <li>Stock : {product.is_in_stock ? 'Disponible' : 'Indisponible'}</li>
          </ul>
        </section>
      </div>
    </section>
  )
}

export default ProductDetailsPage
