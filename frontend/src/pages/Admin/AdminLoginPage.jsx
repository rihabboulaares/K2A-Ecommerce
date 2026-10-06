import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'

function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isChecking, login } = useAdminAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Espace administrateur - Projet Amal'
  }, [])

  if (!isChecking && isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      setError('Veuillez saisir votre identifiant et votre mot de passe.')
      return
    }

    try {
      setIsSubmitting(true)
      await login({
        username: form.username.trim(),
        password: form.password,
      })
      const nextPath = location.state?.from?.pathname || '/admin'
      navigate(nextPath, { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Connexion impossible pour le moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          <span>PA</span>
          <div>
            <strong>Projet Amal</strong>
            <small>Back-office</small>
          </div>
        </div>
        <div className="admin-login-heading">
          <p>Espace administrateur</p>
          <h1 id="admin-login-title">Connexion sécurisée</h1>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label>
            Identifiant
            <input
              autoComplete="username"
              name="username"
              onChange={updateField}
              value={form.username}
            />
          </label>
          <label>
            Mot de passe
            <input
              autoComplete="current-password"
              name="password"
              onChange={updateField}
              type="password"
              value={form.password}
            />
          </label>

          {error && <p className="admin-form-error">{error}</p>}

          <button className="button primary wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage
