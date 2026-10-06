function AdminConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  onConfirm,
  onCancel,
}) {
  if (!title) {
    return null
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <div className="admin-modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="admin-modal-actions">
          <button className="button secondary" type="button" onClick={onCancel}>
            Annuler
          </button>
          <button className="button primary" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminConfirmDialog
