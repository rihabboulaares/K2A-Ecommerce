import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import ProductCard from '../../components/products/ProductCard.jsx'
import {
  getCategories,
  getProducts,
  getUsages,
} from '../../services/productApi.js'

const DEFAULT_ORDERING = '-created_at'

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [usages, setUsages] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      usage: searchParams.get('usage') || '',
      scent: searchParams.get('scent') || '',
      volume_unit: searchParams.get('volume_unit') || '',
      ordering: searchParams.get('ordering') || DEFAULT_ORDERING,
    }),
    [searchParams],
  )

  useEffect(() => {
    let ignore = false

    async function loadFilters() {
      try {
        const [categoryData, usageData] = await Promise.all([
          getCategories(),
          getUsages(),
        ])

        if (!ignore) {
          setCategories(categoryData)
          setUsages(usageData)
        }
      } catch {
        if (!ignore) {
          setError(true)
        }
      }
    }

    loadFilters()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadProducts() {
      setLoading(true)
      setError(false)

      try {
        const productData = await getProducts(filters)

        if (!ignore) {
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

    loadProducts()

    return () => {
      ignore = true
    }
  }, [filters, reloadKey])

  function updateFilter(name, value) {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set(name, value)
    } else {
      nextParams.delete(name)
    }

    setSearchParams(nextParams)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateFilter('search', formData.get('search')?.trim())
  }

  function clearFilters() {
    setSearchParams({})
  }

  function retryProducts() {
    setReloadKey((current) => current + 1)
  }

  return (
    <section className="page-section">
      <div className="container page-heading">
        <p className="eyebrow">Catalogue</p>
        <h1>Nos produits</h1>
        <p>
          Produits d’entretien automobile, eau déminéralisée, parfums et
          désodorisants disponibles.
        </p>
      </div>

      <div className="container catalogue-layout">
        <aside className="filters-panel" aria-label="Filtres produits">
          <div className="filters-title">
            <h2>Filtres</h2>
            <button type="button" onClick={clearFilters}>
              Réinitialiser
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="filter-group">
            <label htmlFor="product-search">Recherche</label>
            <div className="search-row">
              <input
                id="product-search"
                name="search"
                key={filters.search}
                type="search"
                defaultValue={filters.search}
                placeholder="Nom, référence, parfum..."
              />
              <button type="submit">Chercher</button>
            </div>
          </form>

          <div className="filter-group">
            <label htmlFor="category-filter">Catégorie</label>
            <select
              id="category-filter"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="usage-filter">Usage</label>
            <select
              id="usage-filter"
              value={filters.usage}
              onChange={(event) => updateFilter('usage', event.target.value)}
            >
              <option value="">Tous les usages</option>
              {usages.map((usage) => (
                <option key={usage.id} value={usage.id}>
                  {usage.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="scent-filter">Parfum</label>
            <input
              id="scent-filter"
              value={filters.scent}
              onChange={(event) => updateFilter('scent', event.target.value)}
              placeholder="Ex. Vanille"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="volume-filter">Unité</label>
            <select
              id="volume-filter"
              value={filters.volume_unit}
              onChange={(event) =>
                updateFilter('volume_unit', event.target.value)
              }
            >
              <option value="">Toutes les unités</option>
              <option value="ML">ml</option>
              <option value="L">L</option>
            </select>
          </div>

          <div className="filter-help">
            Les produits affichés viennent du catalogue actif.
          </div>
        </aside>

        <div className="catalogue-content">
          <div className="catalogue-toolbar">
            <div>
              <p>{loading ? 'Chargement...' : `${products.length} résultat(s)`}</p>
              <span>Tri et filtres appliqués en temps réel.</span>
            </div>
            <label htmlFor="ordering-filter">
              <span>Tri</span>
              <select
                id="ordering-filter"
                value={filters.ordering}
                onChange={(event) => updateFilter('ordering', event.target.value)}
              >
                <option value="-created_at">Plus récents</option>
                <option value="price">Prix croissant</option>
                <option value="-price">Prix décroissant</option>
                <option value="name">Nom A-Z</option>
              </select>
            </label>
          </div>

          {loading && <ProductSkeletonGrid />}
          {error && (
            <ErrorState
              message="Impossible de charger les produits."
              actionLabel="Réessayer"
              onAction={retryProducts}
            />
          )}
          {!loading && !error && products.length === 0 && (
            <EmptyState
              message="Aucun produit ne correspond à votre recherche."
              actionLabel="Voir tout le catalogue"
              actionTo="/products"
            />
          )}
          {!loading && !error && products.length > 0 && (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ProductSkeletonGrid() {
  return (
    <div className="products-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="product-card skeleton-card" key={index}>
          <div className="skeleton-media" />
          <div className="skeleton-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProductsPage
