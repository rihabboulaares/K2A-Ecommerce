import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useCustomerAuth from '../../hooks/useCustomerAuth.js'

function CustomerProtectedRoute() {
  const { isAuthenticated, isLoading } = useCustomerAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="container">
          <p>Vérification de votre session...</p>
        </div>
      </section>
    )
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`

    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}`}
        replace
      />
    )
  }

  return <Outlet />
}

export default CustomerProtectedRoute
