function ErrorState({
  message = 'Une erreur est survenue. Veuillez réessayer dans quelques instants.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="button secondary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default ErrorState
