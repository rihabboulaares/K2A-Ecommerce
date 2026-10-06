import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState.jsx'
import ProductCard from '../../components/products/ProductCard.jsx'
import ProductImage from '../../components/products/ProductImage.jsx'
import { getCategories, getProducts } from '../../services/productApi.js'
import { getPrimaryImage } from '../../utils/formatters.js'

const benefits = [
  {
    title: 'Livraison selon votre zone',
    text: 'Frais calculés au checkout.',
    icon: 'delivery',
  },
  {
    title: 'Paiement à la livraison',
    text: 'Règlement à la réception.',
    icon: 'payment',
  },
  {
    title: 'Commande simple',
    text: 'Panier, livraison, confirmation.',
    icon: 'check',
  },
]

function HomePage() {
  const [categories, setCategories] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadHomeData() {
      try {
        const [categoryData, featuredData, productData] = await Promise.all([
          getCategories(),
          getProducts({ is_featured: true }),
          getProducts({ ordering: '-created_at' }),
        ])

        if (!ignore) {
          setCategories(categoryData)
          setFeaturedProducts(featuredData)
          setProducts(productData)
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

    loadHomeData()

    return () => {
      ignore = true
    }
  }, [])

  const productsWithImages = [...featuredProducts, ...products].filter(
    (product, index, list) =>
      getPrimaryImage(product.images) &&
      list.findIndex((candidate) => candidate.id === product.id) === index,
  )
  const heroProduct = productsWithImages[0] || featuredProducts[0] || products[0]
  const perfumeProducts = products.filter((product) => {
    const categoryName = product.category?.name?.toLowerCase() || ''
    const productName = product.name?.toLowerCase() || ''
    return (
      categoryName.includes('parfum') ||
      categoryName.includes('désod') ||
      productName.includes('lamssa') ||
      productName.includes('parfum') ||
      productName.includes('désod')
    )
  })

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Entretien automobile & fraîcheur</p>
            <h1>
              Une vision claire
              <span>à chaque trajet</span>
            </h1>
            <p>
              Produits d’entretien automobile, eau déminéralisée, parfums et
              désodorisants pour garder vos espaces propres, nets et agréables.
            </p>
            <Link className="button primary" to="/products">
              Découvrir la gamme
            </Link>
          </div>
          <div className="hero-panel">
            <div className="hero-watermark" aria-hidden="true" />
            <div className="hero-product-card">
              {heroProduct ? (
                <>
                  <ProductImage
                    src={getPrimaryImage(heroProduct.images)?.image}
                    alt={`Produit phare ${heroProduct.name}`}
                  />
                  <div>
                    <span>{heroProduct.category?.name || 'Produit phare'}</span>
                    <strong>{heroProduct.name}</strong>
                  </div>
                </>
              ) : (
                <div className="hero-product-fallback" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="benefits-band">
        <div className="container benefits-grid">
          {benefits.map((benefit) => (
            <div key={benefit.title}>
              <BenefitIcon type={benefit.icon} />
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container section-heading section-heading-row">
          <div>
            <p className="eyebrow">Catégories</p>
            <h2>Nos catégories</h2>
          </div>
          <Link className="text-link" to="/products">Voir toutes →</Link>
        </div>

        <div className="container">
          {loading && <div className="home-mini-loading">Chargement des catégories...</div>}
          {error && <ErrorState />}
          {!loading && !error && categories.length === 0 && (
            <div className="home-compact-empty">Les catégories actives apparaîtront ici.</div>
          )}
          {!loading && !error && categories.length > 0 && (
            <div className="category-grid">
              {categories.slice(0, 3).map((category) => (
                <Link
                  className="category-tile"
                  key={category.id}
                  to={`/products?category=${category.id}`}
                >
                  <ProductImage
                    src={category.image}
                    alt={`Catégorie ${category.name}`}
                  />
                  <div>
                    <strong>{category.name}</strong>
                    {category.description && <p>{category.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {!loading && !error && featuredProducts.length > 0 && (
        <section className="section soft-section">
          <div className="container section-heading">
            <p className="eyebrow">Sélection</p>
            <h2>Nos produits phares</h2>
          </div>

          <div className="container">
            <div className="products-grid">
              {featuredProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {perfumeProducts.length > 0 && (
        <section className="section fragrance-section">
          <div className="container fragrance-panel">
            <div>
              <p className="eyebrow">Parfums & désodorisants</p>
              <h2>Lamssa, une fraîcheur discrète au quotidien</h2>
              <p>
                Retrouvez les senteurs disponibles dans le catalogue, avec les
                usages réellement renseignés sur chaque produit.
              </p>
              <Link className="button secondary" to="/products?search=parfum">
                Voir les parfums
              </Link>
            </div>
            <div className="fragrance-products">
              {perfumeProducts.slice(0, 2).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function BenefitIcon({ type }) {
  return (
    <span className="benefit-icon" aria-hidden="true">
      {type === 'delivery' && (
        <svg viewBox="0 0 24 24">
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      )}
      {type === 'payment' && (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      )}
      {type === 'check' && (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      )}
    </span>
  )
}

export default HomePage
