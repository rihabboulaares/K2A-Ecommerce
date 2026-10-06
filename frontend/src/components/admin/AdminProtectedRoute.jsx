import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'

function AdminProtectedRoute() {
  const location = useLocation()
  const { isAuthenticated, isChecking } = useAdminAuth()

  if (isChecking) {
    return (
      <div className="admin-auth-check">
        <span className="loader" aria-hidden="true" />
        <p>Vérification de la session administrateur...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default AdminProtectedRoute
