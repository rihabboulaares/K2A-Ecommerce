import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest, toQueryString } from '../../services/adminApi.js'
import { orderStatusLabel, paymentStatusLabel } from '../../utils/adminLabels.js'
import { formatPrice } from '../../utils/formatters.js'

function AdminOrdersPage() {
  const { accessToken } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '', payment_status: '', zone: '' })
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let ignore = false
    async function loadOrders() {
      try {
        setStatus('loading')
        const data = await adminRequest(`/admin/orders/${toQueryString(filters)}`, accessToken)
        if (!ignore) {
          setOrders(data)
          setStatus('success')
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ type: 'error', message: error.message })
          setStatus('error')
        }
      }
    }
    loadOrders()
    return () => {
      ignore = true
    }
  }, [accessToken, filters])

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading">
        <p>Ventes</p>
        <h1>Commandes</h1>
      </div>
      <section className="admin-panel admin-filters">
        <input name="search" placeholder="Numéro, client, téléphone..." value={filters.search} onChange={updateFilter} />
        <select name="status" value={filters.status} onChange={updateFilter}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="CONFIRMED">Confirmées</option>
          <option value="PROCESSING">En préparation</option>
          <option value="SHIPPED">Expédiées</option>
          <option value="DELIVERED">Livrées</option>
          <option value="CANCELLED">Annulées</option>
        </select>
        <select name="payment_status" value={filters.payment_status} onChange={updateFilter}>
          <option value="">Tous les paiements</option>
          <option value="PENDING">En attente</option>
          <option value="PAID">Payé</option>
        </select>
        <input name="zone" placeholder="Zone" value={filters.zone} onChange={updateFilter} />
      </section>
      {status === 'loading' && <AdminPageState />}
      {status === 'error' && <AdminPageState type="error" message="Impossible de charger les commandes." />}
      {status === 'success' && orders.length === 0 && <AdminPageState type="empty" message="Aucune commande trouvée." />}
      {status === 'success' && orders.length > 0 && (
        <section className="admin-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Numéro</th><th>Client</th><th>Téléphone</th><th>Zone</th><th>Total</th><th>Commande</th><th>Paiement</th><th>Date</th><th></th></tr></thead>
            <tbody>{orders.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.order_number}</strong></td>
                <td>{order.customer_first_name} {order.customer_last_name}</td>
                <td>{order.customer_phone}</td>
                <td>{order.delivery_zone_name || '-'}</td>
                <td>{formatPrice(order.total_amount)}</td>
                <td><span className="admin-badge info">{order.status_display || orderStatusLabel(order.status)}</span></td>
                <td><span className={`admin-badge ${order.payment_status === 'PAID' ? 'success' : 'warning'}`}>{order.payment_status_display || paymentStatusLabel(order.payment_status)}</span></td>
                <td>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                <td><Link className="button secondary" to={`/admin/orders/${order.id}`}>Voir</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}

export default AdminOrdersPage
