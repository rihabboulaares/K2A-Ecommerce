import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog.jsx'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest } from '../../services/adminApi.js'
import { orderStatusLabel, paymentStatusLabel } from '../../utils/adminLabels.js'
import { formatPrice, resolveImageUrl } from '../../utils/formatters.js'

const statusActions = {
  PENDING: [
    { key: 'confirm', label: 'Confirmer' },
    { key: 'cancel', label: 'Annuler' },
  ],
  CONFIRMED: [
    { key: 'process', label: 'Passer en préparation' },
    { key: 'cancel', label: 'Annuler' },
  ],
  PROCESSING: [
    { key: 'ship', label: 'Marquer comme expédiée' },
    { key: 'cancel', label: 'Annuler' },
  ],
  SHIPPED: [{ key: 'deliver', label: 'Marquer comme livrée' }],
}

function AdminOrderDetailPage() {
  const { id } = useParams()
  const { accessToken } = useAdminAuth()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadOrder() {
      try {
        const data = await adminRequest(`/admin/orders/${id}/`, accessToken)
        if (!ignore) {
          setOrder(data)
          setStatus('success')
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ type: 'error', message: error.message })
          setStatus('error')
        }
      }
    }

    loadOrder()

    return () => {
      ignore = true
    }
  }, [id, accessToken])

  const actions = useMemo(() => {
    if (!order) return []
    const nextActions = [...(statusActions[order.status] || [])]
    if (order.payment_status !== 'PAID' && order.status !== 'CANCELLED') {
      nextActions.push({ key: 'mark-paid', label: 'Marquer comme payé' })
    }
    return nextActions
  }, [order])

  async function runAction(action) {
    try {
      const data = await adminRequest(`/admin/orders/${order.id}/${action.key}/`, accessToken, { method: 'POST' })
      setOrder(data)
      setNotice({ type: 'success', message: 'Commande mise à jour.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setConfirm(null)
    }
  }

  if (status === 'loading') return <AdminPageState />
  if (status === 'error' || !order) return <AdminPageState type="error" message="Commande introuvable." />

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading row">
        <div>
          <p>Commande</p>
          <h1>{order.order_number}</h1>
        </div>
        <Link className="button secondary" to="/admin/orders">Retour</Link>
      </div>

      <section className="admin-panel admin-actions-row">
        {actions.length === 0 ? <p>Aucune action disponible pour ce statut.</p> : actions.map((action) => (
          <button
            className="button primary"
            key={action.key}
            type="button"
            onClick={() => setConfirm({
              title: action.label,
              message: `Confirmer l'action sur ${order.order_number} ?`,
              onConfirm: () => runAction(action),
            })}
          >
            {action.label}
          </button>
        ))}
      </section>

      <div className="admin-grid two">
        <section className="admin-panel admin-details">
          <h2>Client</h2>
          <dl><dt>Nom</dt><dd>{order.customer_first_name} {order.customer_last_name}</dd><dt>Email</dt><dd>{order.customer_email}</dd><dt>Téléphone</dt><dd>{order.customer_phone}</dd></dl>
        </section>
        <section className="admin-panel admin-details">
          <h2>Livraison</h2>
          <dl><dt>Adresse</dt><dd>{order.shipping_address}</dd><dt>Ville</dt><dd>{order.shipping_postal_code} {order.shipping_city}</dd><dt>Zone</dt><dd>{order.delivery_zone_name}</dd></dl>
        </section>
      </div>

      <section className="admin-panel admin-table-wrap">
        <h2>Produits</h2>
        <table className="admin-table">
          <tbody>{order.items.map((item) => (
            <tr key={item.id}>
              <td><div className="admin-thumb">{item.product_image && <img src={resolveImageUrl(item.product_image)} alt="" />}</div></td>
              <td><strong>{item.product_name}</strong><small>{item.product_reference}</small></td>
              <td>{formatPrice(item.unit_price)}</td>
              <td>x{item.quantity}</td>
              <td>{formatPrice(item.subtotal)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <div className="admin-grid two">
        <section className="admin-panel admin-details">
          <h2>Montants</h2>
          <dl><dt>Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd><dt>Livraison</dt><dd>{formatPrice(order.delivery_fee)}</dd><dt>Frais paiement</dt><dd>{formatPrice(order.payment_fee)}</dd><dt>Total</dt><dd>{formatPrice(order.total_amount)}</dd></dl>
        </section>
        <section className="admin-panel admin-details">
          <h2>Suivi</h2>
          <dl><dt>Commande</dt><dd>{order.status_display || orderStatusLabel(order.status)}</dd><dt>Paiement</dt><dd>{order.payment_status_display || paymentStatusLabel(order.payment_status)}</dd><dt>Mode</dt><dd>{order.payment_method_display}</dd></dl>
        </section>
      </div>

      <div className="admin-grid two">
        <section className="admin-panel">
          <h2>Historique statuts</h2>
          <div className="admin-history">{order.status_history.map((item) => <p key={item.id}>{item.old_status_display || '-'} → {item.new_status_display} <small>{item.note}</small></p>)}</div>
        </section>
        <section className="admin-panel">
          <h2>Historique paiement</h2>
          <div className="admin-history">{order.payment_history.map((item) => <p key={item.id}>{item.old_status_display || '-'} → {item.new_status_display} <small>{item.note}</small></p>)}</div>
        </section>
      </div>

      <AdminConfirmDialog title={confirm?.title} message={confirm?.message} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </div>
  )
}

export default AdminOrderDetailPage
