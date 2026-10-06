import { useEffect, useState } from 'react'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest } from '../../services/adminApi.js'
import { formatPrice } from '../../utils/formatters.js'

function AdminPaymentsPage() {
  const { accessToken } = useAdminAuth()
  const [methods, setMethods] = useState([])
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function loadMethods() {
      try {
        setStatus('loading')
        const data = await adminRequest('/admin/payment-methods/', accessToken)
        if (!ignore) {
          setMethods(data)
          setStatus('success')
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ type: 'error', message: error.message })
          setStatus('error')
        }
      }
    }
    loadMethods()
    return () => {
      ignore = true
    }
  }, [accessToken, reloadKey])

  async function saveMethod(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      await adminRequest(`/admin/payment-methods/${editing.id}/`, accessToken, {
        method: 'PATCH',
        body: {
          fee: formData.get('fee'),
          is_active: formData.get('is_active') === 'on',
        },
      })
      setEditing(null)
      setNotice({ type: 'success', message: 'Configuration paiement modifiée.' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  if (status === 'loading') return <AdminPageState />
  if (status === 'error') return <AdminPageState type="error" message="Impossible de charger les paiements." />

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading">
        <p>Configuration</p>
        <h1>Paiements</h1>
      </div>
      <section className="admin-panel admin-table-wrap">
        <h2>Modes de paiement</h2>
        <table className="admin-table">
          <tbody>{methods.map((method) => (
            <tr key={method.id}>
              <td><strong>{method.payment_method_display}</strong></td>
              <td>{formatPrice(method.fee)}</td>
              <td><span className={`admin-badge ${method.is_active ? 'success' : 'muted'}`}>{method.is_active ? 'Actif' : 'Inactif'}</span></td>
              <td><button className="button secondary" type="button" onClick={() => setEditing(method)}>Modifier</button></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section className="admin-panel">
        <h2>Synthèse</h2>
        <p>Les encaissements réels sont suivis via le statut paiement des commandes.</p>
      </section>
      {editing && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={saveMethod}>
            <h2>{editing.payment_method_display}</h2>
            <label>Frais<input name="fee" type="number" min="0" step="0.001" defaultValue={editing.fee} required /></label>
            <label className="admin-check"><input name="is_active" type="checkbox" defaultChecked={editing.is_active} /> Actif</label>
            <div className="admin-modal-actions">
              <button className="button secondary" type="button" onClick={() => setEditing(null)}>Annuler</button>
              <button className="button primary" type="submit">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminPaymentsPage
