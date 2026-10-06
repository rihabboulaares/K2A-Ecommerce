import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="page-section">
      <div className="container not-found">
        <p className="eyebrow">404</p>
        <h1>Page introuvable</h1>
        <p>La page demandée n'existe pas ou n'est plus disponible.</p>
        <Link className="button primary" to="/">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  )
}

export default NotFoundPage
