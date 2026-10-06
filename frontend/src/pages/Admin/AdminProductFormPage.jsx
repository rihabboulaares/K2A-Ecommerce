import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminNotice from '../../components/admin/AdminNotice.jsx'
import AdminPageState from '../../components/admin/AdminPageState.jsx'
import { useAdminAuth } from '../../hooks/useAdminAuth.js'
import { adminRequest } from '../../services/adminApi.js'
import { resolveImageUrl } from '../../utils/formatters.js'

const emptyForm = {
  name: '',
  reference: '',
  category_id: '',
  description: '',
  price: '',
  old_price: '',
  stock_quantity: 0,
  volume_value: '',
  volume_unit: '',
  scent: '',
  usage_ids: [],
  is_active: true,
  is_featured: false,
}

function AdminProductFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { accessToken } = useAdminAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [usages, setUsages] = useState([])
  const [images, setImages] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        setStatus('loading')
        const [categoryData, usageData, productData] = await Promise.all([
          adminRequest('/admin/categories/', accessToken),
          adminRequest('/admin/usages/', accessToken),
          isEditing ? adminRequest(`/admin/products/${id}/`, accessToken) : Promise.resolve(null),
        ])

        if (!ignore) {
          setCategories(categoryData)
          setUsages(usageData)
          if (productData) {
            setForm({
              ...emptyForm,
              ...productData,
              category_id: productData.category?.id || '',
              usage_ids: productData.usages?.map((usage) => String(usage.id)) || [],
              old_price: productData.old_price || '',
              volume_value: productData.volume_value || '',
              volume_unit: productData.volume_unit || '',
            })
            setImages(productData.images || [])
          }
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
  }, [accessToken, id, isEditing])

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function updateUsages(event) {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setForm((current) => ({ ...current, usage_ids: values }))
  }

  async function saveProduct(event) {
    event.preventDefault()
    try {
      const payload = {
        ...form,
        old_price: form.old_price || null,
        volume_value: form.volume_value || null,
        usage_ids: form.usage_ids.map(Number),
      }
      const product = await adminRequest(
        isEditing ? `/admin/products/${id}/` : '/admin/products/',
        accessToken,
        { method: isEditing ? 'PATCH' : 'POST', body: payload },
      )

      if (imageFile) {
        const data = new FormData()
        data.append('image', imageFile)
        data.append('is_primary', images.length === 0 ? 'true' : 'false')
        await adminRequest(`/admin/products/${product.id}/images/`, accessToken, {
          method: 'POST',
          body: data,
        })
      }

      setNotice({ type: 'success', message: 'Produit enregistré.' })
      navigate('/admin/products')
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    }
  }

  async function setPrimaryImage(imageId) {
    await adminRequest(`/admin/product-images/${imageId}/`, accessToken, {
      method: 'PATCH',
      body: { is_primary: true },
    })
    setNotice({ type: 'success', message: 'Image principale modifiée.' })
    const product = await adminRequest(`/admin/products/${id}/`, accessToken)
    setImages(product.images || [])
  }

  async function deleteImage(imageId) {
    await adminRequest(`/admin/product-images/${imageId}/`, accessToken, { method: 'DELETE' })
    setNotice({ type: 'success', message: 'Image supprimée.' })
    setImages((current) => current.filter((image) => image.id !== imageId))
  }

  if (status === 'loading') {
    return <AdminPageState />
  }

  if (status === 'error') {
    return <AdminPageState type="error" message="Impossible de charger le formulaire produit." />
  }

  return (
    <div className="admin-page">
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
      <div className="admin-page-heading row">
        <div>
          <p>Produits</p>
          <h1>{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        </div>
        <Link className="button secondary" to="/admin/products">Retour</Link>
      </div>

      <form className="admin-panel admin-form" onSubmit={saveProduct}>
        <label>Nom<input name="name" value={form.name} onChange={updateField} required /></label>
        <label>Référence<input name="reference" value={form.reference} onChange={updateField} required /></label>
        <label>Catégorie<select name="category_id" value={form.category_id} onChange={updateField} required>
          <option value="">Choisir</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select></label>
        <label>Description<textarea name="description" value={form.description} onChange={updateField} rows="4" /></label>
        <label>Prix<input name="price" type="number" step="0.001" min="0" value={form.price} onChange={updateField} required /></label>
        <label>Ancien prix<input name="old_price" type="number" step="0.001" min="0" value={form.old_price} onChange={updateField} /></label>
        <label>Stock<input name="stock_quantity" type="number" min="0" value={form.stock_quantity} onChange={updateField} required /></label>
        <label>Volume<input name="volume_value" type="number" step="0.01" min="0" value={form.volume_value} onChange={updateField} /></label>
        <label>Unité<select name="volume_unit" value={form.volume_unit} onChange={updateField}>
          <option value="">Aucune</option>
          <option value="ML">ml</option>
          <option value="L">L</option>
        </select></label>
        <label>Senteur<input name="scent" value={form.scent} onChange={updateField} /></label>
        <label>Usages<select multiple value={form.usage_ids} onChange={updateUsages}>
          {usages.map((usage) => <option key={usage.id} value={usage.id}>{usage.name}</option>)}
        </select></label>
        <label className="admin-check"><input name="is_active" type="checkbox" checked={form.is_active} onChange={updateField} /> Actif</label>
        <label className="admin-check"><input name="is_featured" type="checkbox" checked={form.is_featured} onChange={updateField} /> Mis en avant</label>
        <label>Ajouter une image<input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>
        <button className="button primary" type="submit">Enregistrer</button>
      </form>

      {isEditing && images.length > 0 && (
        <section className="admin-panel">
          <h2>Images</h2>
          <div className="admin-image-grid">
            {images.map((image) => (
              <article key={image.id}>
                <img src={resolveImageUrl(image.image)} alt="" />
                <span>{image.is_primary ? 'Principale' : 'Secondaire'}</span>
                {!image.is_primary && <button className="button secondary" type="button" onClick={() => setPrimaryImage(image.id)}>Définir principale</button>}
                <button className="button secondary" type="button" onClick={() => deleteImage(image.id)}>Supprimer</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default AdminProductFormPage
