import { useEffect, useState } from 'react'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest, toQueryString } from '../../services/adminApi.js'
import { stockState } from '../../utils/adminLabels.js'

function AdminStockPage() {
  const { accessToken } = useAdminAuth()
  const [products, setProducts] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [filters, setFilters] = useState({ search: '', stock: '' })
  const [adjusting, setAdjusting] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        setStatus('loading')
        const [productData, adjustmentData] = await Promise.all([
          adminRequest(`/admin/stock/${toQueryString(filters)}`, accessToken),
          adminRequest('/admin/stock/adjustments/', accessToken),
        ])
        if (!ignore) {
          setProducts(productData)
          setAdjustments(adjustmentData)
          setStatus('success')
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ type: 'error', message: error.message })
          setStatus('error')
        }
      }
    }
    loadData()
    return () => {
      ignore = true
    }
  }, [accessToken, filters, reloadKey])

  async function submitAdjustment(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      await adminRequest(`/admin/stock/${adjusting.id}/adjust/`, accessToken, {
        method: 'POST',
        body: {
          new_quantity: formData.get('new_quantity'),
          reason: formData.get('reason'),
        },
      })
      setNotice({ type: 'success', message: 'Stock mis à jour.' })
      setAdjusting(null)
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading">
        <p>Inventaire</p>
        <h1>Stock</h1>
      </div>
      <section className="admin-panel admin-filters">
        <input placeholder="Rechercher..." value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        <select value={filters.stock} onChange={(event) => setFilters((current) => ({ ...current, stock: event.target.value }))}>
          <option value="">Tous</option>
          <option value="in">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
      </section>
      {status === 'loading' && <AdminPageState />}
      {status === 'error' && <AdminPageState type="error" message="Impossible de charger le stock." />}
      {status === 'success' && (
        <section className="admin-panel admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Produit</th><th>Référence</th><th>Catégorie</th><th>Stock</th><th>État</th><th>Action</th></tr></thead>
            <tbody>
              {products.map((product) => {
                const state = stockState(product)
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.reference}</td>
                    <td>{product.category?.name}</td>
                    <td>{product.stock_quantity}</td>
                    <td><span className={`admin-badge ${state.className}`}>{state.label}</span></td>
                    <td><button className="button secondary" type="button" onClick={() => setAdjusting(product)}>Ajuster</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
      <section className="admin-panel admin-table-wrap">
        <h2>Derniers ajustements</h2>
        {adjustments.length === 0 ? <p>Aucun ajustement manuel.</p> : (
          <table className="admin-table">
            <tbody>{adjustments.map((item) => (
              <tr key={item.id}><td>{item.product_reference}</td><td>{item.old_quantity} → {item.new_quantity}</td><td>{item.reason}</td><td>{item.created_by_username}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {adjusting && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={submitAdjustment}>
            <h2>Ajuster {adjusting.name}</h2>
            <label>Nouveau stock<input name="new_quantity" type="number" min="0" defaultValue={adjusting.stock_quantity} required /></label>
            <label>Raison<input name="reason" required placeholder="Correction inventaire..." /></label>
            <div className="admin-modal-actions">
              <button className="button secondary" type="button" onClick={() => setAdjusting(null)}>Annuler</button>
              <button className="button primary" type="submit">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminStockPage
