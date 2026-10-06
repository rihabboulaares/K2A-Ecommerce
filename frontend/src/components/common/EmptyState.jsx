import { Link } from 'react-router-dom'

function EmptyState({ message, actionLabel, actionTo }) {
  return (
    <div className="notice empty">
      <p>{message}</p>
      {actionLabel && actionTo && (
        <Link className="button primary" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export default EmptyState
