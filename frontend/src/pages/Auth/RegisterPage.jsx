import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useCustomerAuth from '../../hooks/useCustomerAuth.js'

function RegisterPage() {
  const { register } = useCustomerAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    password_confirm: '',
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

    if (formData.password !== formData.password_confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsSubmitting(true)

    try {
      await register(formData)

      const next = searchParams.get('next')
      navigate(next && next.startsWith('/') ? next : '/', {
        replace: true,
      })
    } catch (requestError) {
      const data = requestError.data || {}

      const firstError =
        data.phone?.[0] ||
        data.password?.[0] ||
        data.password_confirm?.[0] ||
        data.non_field_errors?.[0] ||
        data.detail

      setError(firstError || requestError.message || 'Inscription impossible.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const next = searchParams.get('next')
  const loginUrl = next
    ? `/login?next=${encodeURIComponent(next)}`
    : '/login'

  return (
    <section className="page-section">
      <div className="container auth-page">
        <div className="auth-card">
          <p className="eyebrow">Nouveau client</p>
          <h1>Créer mon compte</h1>
          <p>Créez votre compte pour finaliser votre commande.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Prénom</span>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />
              </label>

              <label className="field">
                <span>Nom</span>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

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
                autoComplete="new-password"
                required
              />
            </label>

            <label className="field">
              <span>Confirmer le mot de passe</span>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="button primary wide"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p>
            Vous avez déjà un compte ?{' '}
            <Link to={loginUrl}>Se connecter</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default RegisterPage
