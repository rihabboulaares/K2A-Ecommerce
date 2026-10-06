function AdminPlaceholderPage({ title }) {
  return (
    <div className="admin-placeholder">
      <div className="admin-page-heading">
        <p>Module préparé</p>
        <h1>{title}</h1>
      </div>
      <div className="admin-panel">
        <p>
          Cette section est prête dans la navigation. Les écrans de gestion
          détaillée seront développés dans une prochaine étape.
        </p>
      </div>
    </div>
  )
}

export default AdminPlaceholderPage
