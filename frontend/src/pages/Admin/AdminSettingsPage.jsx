import { useAdminAuth } from '../../hooks/useAdminAuth.js'

function AdminSettingsPage() {
  const { user } = useAdminAuth()

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <p>Compte</p>
        <h1>Paramètres</h1>
      </div>
      <section className="admin-panel admin-details">
        <h2>Administrateur courant</h2>
        <dl>
          <dt>Identifiant</dt>
          <dd>{user?.username || '-'}</dd>
          <dt>Email</dt>
          <dd>{user?.email || '-'}</dd>
          <dt>Prénom</dt>
          <dd>{user?.first_name || '-'}</dd>
          <dt>Nom</dt>
          <dd>{user?.last_name || '-'}</dd>
        </dl>
      </section>
      <section className="admin-panel">
        <h2>Production</h2>
        <p>Les paramètres sensibles doivent rester dans les variables d'environnement et non dans React.</p>
      </section>
    </div>
  )
}

export default AdminSettingsPage
