import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import Header from './Header.jsx'

function MainLayout() {
  const { isAuthenticated } = useAdminAuth()

  return (
    <div className="app-shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Projet Amal</p>
          <p>Produits d'entretien, eau et parfums pour vos espaces.</p>
          <Link className="footer-admin-link" to={isAuthenticated ? '/admin' : '/admin/login'}>
            Administration
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
