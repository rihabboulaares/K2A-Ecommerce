import { useEffect, useMemo, useState } from 'react'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { getAdminDashboard } from '../../services/adminDashboardApi.js'
import { formatPrice } from '../../utils/formatters.js'

function AdminDashboardPage() {
  const { accessToken } = useAdminAuth()
  const [dashboard, setDashboard] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setStatus('loading')
        const data = await getAdminDashboard(accessToken)

        if (isMounted) {
          setDashboard(data)
          setStatus('success')
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
          setStatus('error')
        }
      }
    }

    if (accessToken) {
      loadDashboard()
    }

    return () => {
      isMounted = false
    }
  }, [accessToken])

  const cards = useMemo(() => {
    if (!dashboard) {
      return []
    }

    return [
      {
        label: "Chiffre d'affaires",
        value: formatPrice(dashboard.revenue_collected),
        tone: 'blue',
      },
      { label: 'Commandes', value: dashboard.total_orders, tone: 'green' },
      { label: 'Produits', value: dashboard.total_products, tone: 'blue' },
      {
        label: 'Stock faible',
        value: dashboard.low_stock_products,
        detail: `Seuil ${dashboard.low_stock_threshold}`,
        tone: 'red',
      },
    ]
  }, [dashboard])

  const chartPoints = useMemo(() => {
    const values = dashboard?.sales_last_30_days?.map((item) =>
      Number.parseFloat(item.revenue_collected || 0),
    ) || []
    const max = Math.max(...values, 1)

    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100
        const y = 100 - (value / max) * 86 - 7
        return `${x},${y}`
      })
      .join(' ')
  }, [dashboard])

  const donutSegments = useMemo(() => {
    if (!dashboard) return []
    const rows = [
      { label: 'En attente', value: dashboard.pending_orders, color: '#0d7ff2' },
      { label: 'Confirmées', value: dashboard.confirmed_orders, color: '#10b981' },
      { label: 'En préparation', value: dashboard.processing_orders, color: '#38bdf8' },
      { label: 'Expédiées', value: dashboard.shipped_orders, color: '#6366f1' },
      { label: 'Livrées', value: dashboard.delivered_orders, color: '#22c55e' },
      { label: 'Annulées', value: dashboard.cancelled_orders, color: '#ef4444' },
    ]
    let start = 0
    const total = Math.max(dashboard.total_orders, 1)
    return rows.map((row) => {
      const size = (row.value / total) * 100
      const segment = { ...row, start, size }
      start += size
      return segment
    })
  }, [dashboard])

  const donutStyle = useMemo(() => {
    const gradient = donutSegments
      .map((segment) => {
        const end = segment.start + segment.size
        return `${segment.color} ${segment.start}% ${end}%`
      })
      .join(', ')

    return {
      background: gradient
        ? `conic-gradient(${gradient})`
        : 'conic-gradient(#e5edf7 0 100%)',
    }
  }, [donutSegments])

  if (status === 'loading') {
    return (
      <div className="admin-state">
        <span className="loader" aria-hidden="true" />
        <p>Chargement du tableau de bord...</p>
      </div>
    )
  }

  if (status === 'error') {
    return <div className="admin-state error">{error}</div>
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <p>Vue quotidienne</p>
        <h1>Dashboard</h1>
      </div>

      <section className="admin-kpi-grid" aria-label="Indicateurs principaux">
        {cards.map((card) => (
          <article className="admin-kpi-card" key={card.label}>
            <i className={`admin-kpi-icon ${card.tone}`} aria-hidden="true" />
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.detail && <small>{card.detail}</small>}
          </article>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Évolution des ventes (30 derniers jours)</h2>
          </div>
          <div className="admin-line-chart" aria-label="Chiffre d'affaires encaissé des 30 derniers jours">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={chartPoints} />
            </svg>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Répartition des commandes</h2>
          </div>
          <div className="admin-donut-wrap">
            <div className="admin-donut" style={donutStyle}>
              <div>
                <strong>{dashboard.total_orders}</strong>
                <span>commandes</span>
              </div>
            </div>
            <div className="admin-status-list compact">
              {donutSegments.map((row) => (
                <div className="admin-status-row" key={row.label}>
                  <span><i style={{ background: row.color }} /> {row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Dernières commandes</h2>
        </div>

        {dashboard.latest_orders.length === 0 ? (
          <p className="admin-empty">Aucune commande pour le moment.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Total</th>
                  <th>Statut commande</th>
                  <th>Paiement</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.latest_orders.map((order) => (
                  <tr key={order.order_number}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_first_name} {order.customer_last_name}</td>
                    <td>{order.items_count || '-'}</td>
                    <td>{formatPrice(order.total_amount)}</td>
                    <td><span className="admin-badge warning">{order.status_display}</span></td>
                    <td><span className={`admin-badge ${order.payment_status === 'PAID' ? 'success' : 'warning'}`}>{order.payment_status_display}</span></td>
                    <td>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboardPage
