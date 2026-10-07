import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useCustomerAuth from '../../hooks/useCustomerAuth.js'

function LoginPage() {
  const { login } = useCustomerAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(formData)

      const next = searchParams.get('next')
      navigate(next && next.startsWith('/') ? next : '/', {
        replace: true,
      })
    } catch (requestError) {
      setError(
        requestError.data?.non_field_errors?.[0] ||
        requestError.data?.detail ||
        requestError.message ||
        'Connexion impossible.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const next = searchParams.get('next')
  const registerUrl = next
    ? `/register?next=${encodeURIComponent(next)}`
    : '/register'

  return (
    <section className="page-section">
      <div className="container auth-page">
        <div className="auth-card">
          <p className="eyebrow">Espace client</p>
          <h1>Connexion</h1>
          <p>Connectez-vous pour poursuivre votre commande.</p>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Numéro de téléphone</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </label>

            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="button primary wide"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p>
            Pas encore de compte ?{' '}
            <Link to={registerUrl}>Créer un compte</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
