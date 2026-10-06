function AdminPageState({ type = 'loading', message }) {
  if (type === 'loading') {
    return (
      <div className="admin-state-panel">
        <span className="loader" aria-hidden="true" />
        <p>{message || 'Chargement...'}</p>
      </div>
    )
  }

  return (
    <div className={`admin-state-panel ${type}`}>
      <p>{message}</p>
    </div>
  )
}

export default AdminPageState
