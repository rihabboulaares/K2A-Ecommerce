import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useCart from '../../hooks/useCart.js'
import { getCategories } from '../../services/productApi.js'

function Header() {
  const { cartCount } = useCart()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadCategories() {
      try {
        const data = await getCategories()

        if (!ignore) {
          setCategories(data.slice(0, 4))
        }
      } catch {
        if (!ignore) {
          setCategories([])
        }
      }
    }

    loadCategories()

    return () => {
      ignore = true
    }
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const search = formData.get('search')?.trim()

    navigate(search ? `/products?search=${encodeURIComponent(search)}` : '/products')
    setIsMenuOpen(false)
  }

  function formatNavLabel(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toLocaleUpperCase('fr-FR') + part.slice(1))
      .join(' ')
  }

  return (
    <header className="site-header">
      <div className="container header-main">
        <NavLink to="/" className="brand" aria-label="Projet Amal accueil">
          <span className="brand-mark">PA</span>
          <span>
            <strong>Projet Amal</strong>
            <small>Entretien & fraîcheur</small>
          </span>
        </NavLink>

        <form className="header-search" onSubmit={handleSearch}>
          <label htmlFor="header-search" className="sr-only">
            Rechercher un produit
          </label>
          <input
            id="header-search"
            name="search"
            type="search"
            placeholder="Rechercher un produit..."
          />
          <button type="submit">Rechercher</button>
        </form>

        <NavLink className="cart-preview" to="/cart" aria-label={`Panier, ${cartCount} article(s)`}>
          <span>Panier</span>
          <span className="cart-count">{cartCount}</span>
        </NavLink>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="main-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          Menu
        </button>
      </div>

      <div className={`header-nav-wrap ${isMenuOpen ? 'open' : ''}`}>
        <nav
          id="main-navigation"
          className="container main-nav"
          aria-label="Navigation principale"
        >
          <NavLink to="/" onClick={() => setIsMenuOpen(false)}>
            Accueil
          </NavLink>
          <NavLink to="/products" onClick={() => setIsMenuOpen(false)}>
            Tous les produits
          </NavLink>
          {categories.map((category) => (
            <NavLink
              key={category.id}
              to={`/products?category=${category.id}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {formatNavLabel(category.name)}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
