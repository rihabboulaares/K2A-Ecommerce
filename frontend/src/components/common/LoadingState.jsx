function LoadingState({ label = 'Chargement en cours...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export default LoadingState
