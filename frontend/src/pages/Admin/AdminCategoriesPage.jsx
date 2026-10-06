import { useEffect, useState } from 'react'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest } from '../../services/adminApi.js'

const emptyCategory = { name: '', description: '', is_active: true }
const emptyUsage = { name: '' }

function AdminCategoriesPage() {
  const { accessToken } = useAdminAuth()
  const [categories, setCategories] = useState([])
  const [usages, setUsages] = useState([])
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [usageForm, setUsageForm] = useState(emptyUsage)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingUsage, setEditingUsage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        setStatus('loading')
        const [categoryData, usageData] = await Promise.all([
          adminRequest('/admin/categories/', accessToken),
          adminRequest('/admin/usages/', accessToken),
        ])
        if (!ignore) {
          setCategories(categoryData)
          setUsages(usageData)
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
  }, [accessToken, reloadKey])

  async function saveCategory(event) {
    event.preventDefault()
    try {
      await adminRequest(
        editingCategory ? `/admin/categories/${editingCategory}/` : '/admin/categories/',
        accessToken,
        { method: editingCategory ? 'PATCH' : 'POST', body: categoryForm },
      )
      setCategoryForm(emptyCategory)
      setEditingCategory(null)
      setNotice({ type: 'success', message: 'Catégorie enregistrée.' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  async function saveUsage(event) {
    event.preventDefault()
    try {
      await adminRequest(
        editingUsage ? `/admin/usages/${editingUsage}/` : '/admin/usages/',
        accessToken,
        { method: editingUsage ? 'PATCH' : 'POST', body: usageForm },
      )
      setUsageForm(emptyUsage)
      setEditingUsage(null)
      setNotice({ type: 'success', message: 'Usage enregistré.' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  async function toggleCategory(category) {
    try {
      await adminRequest(`/admin/categories/${category.id}/toggle-active/`, accessToken, { method: 'POST' })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  if (status === 'loading') return <AdminPageState />
  if (status === 'error') return <AdminPageState type="error" message="Impossible de charger les catégories." />

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading">
        <p>Catalogue</p>
        <h1>Catégories & usages</h1>
      </div>

      <div className="admin-grid two">
        <section className="admin-panel">
          <h2>{editingCategory ? 'Modifier une catégorie' : 'Créer une catégorie'}</h2>
          <form className="admin-mini-form" onSubmit={saveCategory}>
            <input placeholder="Nom" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required />
            <textarea placeholder="Description" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
            <label className="admin-check"><input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
            <button className="button primary" type="submit">Enregistrer</button>
          </form>
        </section>
        <section className="admin-panel">
          <h2>{editingUsage ? 'Modifier un usage' : 'Créer un usage'}</h2>
          <form className="admin-mini-form" onSubmit={saveUsage}>
            <input placeholder="Nom" value={usageForm.name} onChange={(event) => setUsageForm({ name: event.target.value })} required />
            <button className="button primary" type="submit">Enregistrer</button>
          </form>
        </section>
      </div>

      <div className="admin-grid two">
        <section className="admin-panel admin-table-wrap">
          <h2>Catégories</h2>
          <table className="admin-table">
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong><small>{category.description}</small></td>
                  <td><span className={`admin-badge ${category.is_active ? 'success' : 'muted'}`}>{category.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="button secondary" type="button" onClick={() => { setEditingCategory(category.id); setCategoryForm({ name: category.name, description: category.description || '', is_active: category.is_active }) }}>Modifier</button></td>
                  <td><button className="button secondary" type="button" onClick={() => toggleCategory(category)}>{category.is_active ? 'Désactiver' : 'Activer'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="admin-panel admin-table-wrap">
          <h2>Usages</h2>
          <table className="admin-table">
            <tbody>
              {usages.map((usage) => (
                <tr key={usage.id}>
                  <td><strong>{usage.name}</strong></td>
                  <td><button className="button secondary" type="button" onClick={() => { setEditingUsage(usage.id); setUsageForm({ name: usage.name }) }}>Modifier</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

export default AdminCategoriesPage
