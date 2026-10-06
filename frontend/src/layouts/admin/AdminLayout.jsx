import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/products', label: 'Produits', icon: 'products' },
  { to: '/admin/categories', label: 'Catégories', icon: 'categories' },
  { to: '/admin/orders', label: 'Commandes', icon: 'orders' },
  { to: '/admin/stock', label: 'Stock', icon: 'stock' },
  { to: '/admin/delivery', label: 'Livraison', icon: 'delivery' },
  { to: '/admin/payments', label: 'Paiements', icon: 'payments' },
  { to: '/admin/settings', label: 'Paramètres', icon: 'settings' },
]

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { logout, user } = useAdminAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <span>PA</span>
          <div>
            <strong>Projet Amal</strong>
            <small>Administration</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Navigation admin">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className={`admin-nav-icon ${link.icon}`} aria-hidden="true" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="admin-logout" type="button" onClick={handleLogout}>
          Déconnexion
        </button>
        <NavLink className="admin-shop-link" to="/">
          Voir la boutique
        </NavLink>
      </aside>

      {isSidebarOpen && (
        <button
          aria-label="Fermer le menu admin"
          className="admin-backdrop"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-header">
          <button
            aria-label="Ouvrir le menu admin"
            className="admin-menu-button"
            type="button"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span aria-hidden="true" />
          </button>
          <div>
            <span>Espace administrateur</span>
            <strong>{user?.first_name || user?.username || 'Admin'}</strong>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
