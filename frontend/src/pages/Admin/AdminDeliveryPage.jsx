import { useEffect, useState } from 'react'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest } from '../../services/adminApi.js'
import { formatPrice } from '../../utils/formatters.js'

const emptyZone = { name: '', delivery_fee: '', is_active: true }

function AdminDeliveryPage() {
  const { accessToken } = useAdminAuth()
  const [zones, setZones] = useState([])
  const [form, setForm] = useState(emptyZone)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function loadZones() {
      try {
        setStatus('loading')
        const data = await adminRequest('/admin/delivery-zones/', accessToken)
        if (!ignore) {
          setZones(data)
          setStatus('success')
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ type: 'error', message: error.message })
          setStatus('error')
        }
      }
    }
    loadZones()
    return () => {
      ignore = true
    }
  }, [accessToken, reloadKey])

  async function saveZone(event) {
    event.preventDefault()
    try {
      await adminRequest(
        editingId ? `/admin/delivery-zones/${editingId}/` : '/admin/delivery-zones/',
        accessToken,
        { method: editingId ? 'PATCH' : 'POST', body: form },
      )
      setForm(emptyZone)
      setEditingId(null)
      setNotice({ type: 'success', message: 'Zone enregistrée.' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  async function toggleZone(zone) {
    await adminRequest(`/admin/delivery-zones/${zone.id}/toggle-active/`, accessToken, { method: 'POST' })
    setReloadKey((current) => current + 1)
  }

  if (status === 'loading') return <AdminPageState />
  if (status === 'error') return <AdminPageState type="error" message="Impossible de charger la livraison." />

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading">
        <p>Configuration</p>
        <h1>Livraison</h1>
      </div>
      <section className="admin-panel">
        <h2>{editingId ? 'Modifier une zone' : 'Créer une zone'}</h2>
        <form className="admin-mini-form" onSubmit={saveZone}>
          <input placeholder="Nom zone" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <input type="number" step="0.001" min="0" placeholder="Frais livraison" value={form.delivery_fee} onChange={(event) => setForm((current) => ({ ...current, delivery_fee: event.target.value }))} required />
          <label className="admin-check"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
          <button className="button primary" type="submit">Enregistrer</button>
        </form>
      </section>
      <section className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Zone</th><th>Tarif</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>{zones.map((zone) => (
            <tr key={zone.id}>
              <td>{zone.name}</td>
              <td>{formatPrice(zone.delivery_fee)}</td>
              <td><span className={`admin-badge ${zone.is_active ? 'success' : 'muted'}`}>{zone.is_active ? 'Active' : 'Inactive'}</span></td>
              <td><div className="admin-actions">
                <button className="button secondary" type="button" onClick={() => { setEditingId(zone.id); setForm({ name: zone.name, delivery_fee: zone.delivery_fee, is_active: zone.is_active }) }}>Modifier</button>
                <button className="button secondary" type="button" onClick={() => toggleZone(zone)}>{zone.is_active ? 'Désactiver' : 'Activer'}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  )
}

export default AdminDeliveryPage
