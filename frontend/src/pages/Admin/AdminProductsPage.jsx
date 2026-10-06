import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog.jsx'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest, toQueryString } from '../../services/adminApi.js'
import { formatPrice, resolveImageUrl } from '../../utils/formatters.js'
import { stockState } from '../../utils/adminLabels.js'

function AdminProductsPage() {
  const { accessToken } = useAdminAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ search: '', category: '', is_active: '', stock: '' })
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        setStatus('loading')
        const [productData, categoryData] = await Promise.all([
          adminRequest(`/admin/products/${toQueryString(filters)}`, accessToken),
          adminRequest('/admin/categories/', accessToken),
        ])
        if (!ignore) {
          setProducts(productData)
          setCategories(categoryData)
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

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  async function toggleProduct(product) {
    try {
      await adminRequest(`/admin/products/${product.id}/toggle-active/`, accessToken, {
        method: 'POST',
      })
      setNotice({ type: 'success', message: 'Produit modifié.' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading row">
        <div>
          <p>Catalogue</p>
          <h1>Produits</h1>
        </div>
        <Link className="button primary" to="/admin/products/new">
          Ajouter un produit
        </Link>
      </div>

      <section className="admin-panel admin-filters">
        <input name="search" placeholder="Rechercher un produit..." value={filters.search} onChange={updateFilter} />
        <select name="category" value={filters.category} onChange={updateFilter}>
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select name="is_active" value={filters.is_active} onChange={updateFilter}>
          <option value="">Actifs et inactifs</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
        <select name="stock" value={filters.stock} onChange={updateFilter}>
          <option value="">Tous les stocks</option>
          <option value="in">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
      </section>

      {status === 'loading' && <AdminPageState />}
      {status === 'error' && <AdminPageState type="error" message="Impossible de charger les produits." />}
      {status === 'success' && products.length === 0 && <AdminPageState type="empty" message="Aucun produit trouvé." />}
      {status === 'success' && products.length > 0 && (
        <section className="admin-panel admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Nom</th>
                <th>Référence</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const state = stockState(product)
                const image = product.images?.[0]?.image
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-thumb">
                        {image ? <img src={resolveImageUrl(image)} alt="" /> : <span />}
                      </div>
                    </td>
                    <td>
                      <strong>{product.name}</strong>
                      {product.is_featured && <small>Mis en avant</small>}
                    </td>
                    <td>{product.reference}</td>
                    <td>{product.category?.name}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td><span className={`admin-badge ${state.className}`}>{state.label} · {product.stock_quantity}</span></td>
                    <td><span className={`admin-badge ${product.is_active ? 'success' : 'muted'}`}>{product.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div className="admin-actions">
                        <Link className="button secondary" to={`/products/${product.id}`}>Voir</Link>
                        <Link className="button secondary" to={`/admin/products/${product.id}/edit`}>Modifier</Link>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() =>
                            setConfirm({
                              title: product.is_active ? 'Désactiver le produit' : 'Activer le produit',
                              message: `Confirmer la modification de ${product.name} ?`,
                              onConfirm: () => toggleProduct(product),
                            })
                          }
                        >
                          {product.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      <AdminConfirmDialog
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Confirmer"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

export default AdminProductsPage
