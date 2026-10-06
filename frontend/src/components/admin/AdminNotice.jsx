function AdminNotice({ notice, onClose }) {
  if (!notice?.message) {
    return null
  }

  return (
    <div className={`admin-notice ${notice.type || 'success'}`} role="status">
      <span>{notice.message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer la notification">
          ×
        </button>
      )}
    </div>
  )
}

export default AdminNotice
