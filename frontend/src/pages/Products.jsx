import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchProducts, createProduct, updateProduct, deleteProduct, purchaseProduct,
} from '../lib/api'

// Si al marcar agotado el producto duró menos de este porcentaje de su frecuencia
// configurada, abrimos el modal de ajuste. Subir = mas sensible, bajar = mas laxo.
const EARLY_OUT_OF_STOCK_RATIO = 0.6

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'bano', label: 'Bano' },
  { value: 'lavanderia', label: 'Lavanderia' },
  { value: 'general', label: 'General' },
]

const CATEGORY_ICONS = {
  limpieza: '🧹',
  bano: '🚿',
  lavanderia: '👕',
  general: '📦',
}

function reminderLabel(product) {
  if (product.is_out_of_stock) return 'Agotado'
  if (!product.last_purchased_at) return 'Sin comprar'

  const lastPurchase = new Date(product.last_purchased_at).getTime()
  const nextDue = lastPurchase + product.reminder_frequency_days * 24 * 3600 * 1000
  const diff = nextDue - Date.now()
  const days = Math.ceil(diff / (24 * 3600 * 1000))

  if (days < 0) {
    const overdue = Math.abs(days)
    return overdue === 1 ? 'Vencido hace 1 dia' : `Vencido hace ${overdue} dias`
  }
  if (days === 0) return 'Comprar hoy'
  if (days === 1) return 'Comprar manana'
  if (days <= 7) return `Faltan ${days} dias`
  return `Faltan ${days} dias`
}

function reminderUrgency(product) {
  if (product.is_out_of_stock) return 'critical'
  if (!product.last_purchased_at) return 'high'

  const lastPurchase = new Date(product.last_purchased_at).getTime()
  const nextDue = lastPurchase + product.reminder_frequency_days * 24 * 3600 * 1000
  const diff = nextDue - Date.now()
  const days = Math.ceil(diff / (24 * 3600 * 1000))

  if (days <= 0) return 'high'
  if (days <= 3) return 'medium'
  return 'low'
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [earlyOutModal, setEarlyOutModal] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadProducts = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchProducts(filter === 'all' ? undefined : filter)
      setProducts(data)
    } catch {
      setError('No se pudo cargar la lista de productos.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadProducts() }, [loadProducts])

  async function handleSave(payload) {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        showToast('Producto actualizado')
      } else {
        await createProduct(payload)
        showToast('Producto agregado')
      }
      setShowForm(false)
      setEditingProduct(null)
      loadProducts()
    } catch {
      showToast('Error al guardar', 'error')
    }
  }

  async function handleDelete(product) {
    if (deletingId === product.id) {
      try {
        await deleteProduct(product.id)
        showToast('Producto eliminado', 'warning')
        loadProducts()
      } catch { showToast('Error al eliminar', 'error') }
      finally { setDeletingId(null) }
    } else {
      setDeletingId(product.id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  async function handleToggleOutOfStock(product) {
    try {
      const next = !product.is_out_of_stock
      const updated = await updateProduct(product.id, { is_out_of_stock: next })
      loadProducts()
      showToast(next ? 'Marcado como agotado' : 'Producto disponible', next ? 'warning' : 'success')

      // Si acabamos de marcar agotado y duró mucho menos de lo esperado,
      // ofrecemos ajustar unidades o frecuencia.
      if (next && updated?.last_purchased_at && updated?.reminder_frequency_days > 0) {
        const lastPurchase = new Date(updated.last_purchased_at).getTime()
        const actualDays = Math.max(1, Math.round((Date.now() - lastPurchase) / (24 * 3600 * 1000)))
        const threshold = updated.reminder_frequency_days * EARLY_OUT_OF_STOCK_RATIO
        if (actualDays < threshold) {
          setEarlyOutModal({ product: updated, actualDays })
        }
      }
    } catch { showToast('Error al actualizar', 'error') }
  }

  async function handleAdjustUnits(productId, newUnits) {
    try {
      await updateProduct(productId, { units: newUnits })
      setEarlyOutModal(null)
      loadProducts()
      showToast('Unidades actualizadas')
    } catch { showToast('Error al actualizar', 'error') }
  }

  async function handleAdjustFrequency(productId, newFrequency) {
    try {
      await updateProduct(productId, { reminder_frequency_days: newFrequency })
      setEarlyOutModal(null)
      loadProducts()
      showToast('Frecuencia actualizada')
    } catch { showToast('Error al actualizar', 'error') }
  }

  async function handlePurchase(product) {
    try {
      await purchaseProduct(product.id)
      showToast(`"${product.name}" comprado`)
      loadProducts()
    } catch { showToast('Error al registrar compra', 'error') }
  }

  function openEdit(product) { setEditingProduct(product); setShowForm(true) }
  function openCreate() { setEditingProduct(null); setShowForm(true) }

  const outOfStockCount = products.filter(p => p.is_out_of_stock).length
  const needsBuyingCount = products.filter(p => {
    if (p.is_out_of_stock) return true
    if (!p.last_purchased_at) return true
    const nextDue = new Date(p.last_purchased_at).getTime() + p.reminder_frequency_days * 24 * 3600 * 1000
    return Date.now() >= nextDue
  }).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(184,90,58,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando productos...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 z-50 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] toast-enter"
          style={{
            background: toast.type === 'success' ? 'var(--moss-500)' : toast.type === 'warning' ? 'var(--clay-500)' : '#9e4a2e',
            color: 'white',
            minWidth: 180,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transform: 'translateX(-50%)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
            Inventario
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Productos
          </h2>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95"
          style={{ background: 'var(--clay-500)', boxShadow: '0 2px 8px rgba(184,90,58,0.25)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nuevo
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-4 font-body text-[13px]" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Total', value: products.length, color: 'var(--bark-700)', bg: 'var(--surface-card)', border: 'rgba(196,184,166,0.25)' },
          { label: 'Por comprar', value: needsBuyingCount, color: 'var(--clay-500)', bg: 'rgba(184,90,58,0.06)', border: 'rgba(184,90,58,0.15)' },
          { label: 'Agotados', value: outOfStockCount, color: '#9e4a2e', bg: 'rgba(158,74,46,0.06)', border: 'rgba(158,74,46,0.15)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl px-3 py-3 text-center" style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
            <div className="font-display text-xl leading-none mb-0.5" style={{ color: stat.color }}>{stat.value}</div>
            <div className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-body font-semibold whitespace-nowrap transition-all"
            style={{
              background: filter === cat.value ? 'var(--moss-400)' : 'var(--surface-card)',
              color: filter === cat.value ? 'white' : 'var(--bark-400)',
              border: filter === cat.value ? 'none' : '1px solid rgba(196,184,166,0.25)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(184,90,58,0.08)' }}>
            🛒
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Sin productos</p>
          <p className="font-body text-sm mb-5" style={{ color: 'var(--bark-300)' }}>Agrega productos para controlar tu inventario</p>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white" style={{ background: 'var(--clay-500)' }}>
            Agregar primer producto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 stagger">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              deletingId={deletingId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleOutOfStock={handleToggleOutOfStock}
              onPurchase={handlePurchase}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop"
          onClick={() => { setShowForm(false); setEditingProduct(null) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92dvh] overflow-y-auto fade-in"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </h3>
            <ProductForm
              product={editingProduct}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingProduct(null) }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Early out-of-stock modal */}
      {earlyOutModal && createPortal(
        <EarlyOutOfStockModal
          product={earlyOutModal.product}
          actualDays={earlyOutModal.actualDays}
          onAdjustUnits={handleAdjustUnits}
          onAdjustFrequency={handleAdjustFrequency}
          onClose={() => setEarlyOutModal(null)}
        />,
        document.body
      )}
    </div>
  )
}

function ProductCard({ product, deletingId, onEdit, onDelete, onToggleOutOfStock, onPurchase }) {
  const isDeleting = deletingId === product.id
  const urgency = reminderUrgency(product)
  const label = reminderLabel(product)

  const stripeColors = {
    critical: '#9e4a2e',
    high: 'var(--clay-500)',
    medium: '#d4944c',
    low: 'var(--moss-400)',
  }

  const badgeStyles = {
    critical: { bg: 'rgba(158,74,46,0.1)', color: '#9e4a2e' },
    high: { bg: 'rgba(184,90,58,0.1)', color: 'var(--clay-500)' },
    medium: { bg: 'rgba(212,148,76,0.1)', color: '#b87d3a' },
    low: { bg: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' },
  }

  return (
    <div
      className="rounded-xl overflow-hidden task-enter relative"
      style={{
        background: product.is_out_of_stock ? 'rgba(158,74,46,0.03)' : 'var(--surface-card)',
        border: '1px solid',
        borderColor: product.is_out_of_stock ? 'rgba(158,74,46,0.15)' : 'rgba(196,184,166,0.25)',
        boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: stripeColors[urgency],
          borderRadius: '3px 0 0 3px',
        }}
      />

      <div className="pl-5 pr-3 pt-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          {/* Category icon */}
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(196,184,166,0.12)' }}>
            {CATEGORY_ICONS[product.category] || '📦'}
          </div>

          <div className="flex-1 min-w-0">
            <h4
              className="font-body font-semibold text-[14px] leading-tight"
              style={{ color: 'var(--bark-700)' }}
            >
              {product.name}
              {product.is_out_of_stock && (
                <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(158,74,46,0.12)', color: '#9e4a2e', verticalAlign: 'middle' }}>
                  Agotado
                </span>
              )}
            </h4>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Reminder badge */}
              <span
                className="freq-badge"
                style={{
                  background: badgeStyles[urgency].bg,
                  color: badgeStyles[urgency].color,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {label}
              </span>

              {/* Frequency badge */}
              <span
                className="freq-badge"
                style={{
                  background: 'rgba(106,153,96,0.1)',
                  color: 'var(--moss-500)',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Cada {product.reminder_frequency_days}d
              </span>

              {/* Units badge */}
              {product.units > 1 && (
                <span
                  className="freq-badge"
                  style={{
                    background: 'rgba(196,184,166,0.15)',
                    color: 'var(--bark-400)',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
                  </svg>
                  {product.units}u
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-0.5 px-2 pb-2 pt-0.5"
        style={{ borderTop: '1px solid rgba(196,184,166,0.12)' }}
      >
        {/* Purchase button */}
        <ActionBtn onClick={() => onPurchase(product)} title="Marcar comprado">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </ActionBtn>

        {/* Toggle out of stock */}
        <ActionBtn
          onClick={() => onToggleOutOfStock(product)}
          title={product.is_out_of_stock ? 'Marcar disponible' : 'Marcar agotado'}
          danger={!product.is_out_of_stock}
        >
          {product.is_out_of_stock ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--moss-500)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          )}
        </ActionBtn>

        {/* Edit */}
        <ActionBtn onClick={() => onEdit(product)} title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </ActionBtn>

        {/* Delete */}
        <ActionBtn
          onClick={() => onDelete(product)}
          title={isDeleting ? 'Confirmar' : 'Eliminar'}
          danger={isDeleting}
        >
          {isDeleting ? (
            <span className="font-body font-bold text-[10px]" style={{ color: 'var(--clay-500)' }}>Seguro?</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          )}
        </ActionBtn>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, title, disabled, danger, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-w-[36px] h-8 px-2 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
      style={{
        color: danger ? 'var(--clay-500)' : 'var(--bark-300)',
        background: danger ? 'rgba(184,90,58,0.06)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!danger) e.currentTarget.style.background = 'rgba(196,184,166,0.15)'
      }}
      onMouseLeave={e => {
        if (!danger) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function ProductForm({ product, onSave, onCancel }) {
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || 'general')
  const [frequencyDays, setFrequencyDays] = useState(product?.reminder_frequency_days || 30)
  const [units, setUnits] = useState(product?.units || 1)
  const [isOutOfStock, setIsOutOfStock] = useState(product?.is_out_of_stock || false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      category,
      reminder_frequency_days: parseInt(frequencyDays) || 30,
      units: Math.max(1, parseInt(units) || 1),
      is_out_of_stock: isOutOfStock,
    })
  }

  const freqPresets = [
    { label: 'Semanal', value: 7 },
    { label: 'Quincenal', value: 14 },
    { label: 'Mensual', value: 30 },
    { label: 'Bimestral', value: 60 },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Jabon lavavajillas"
          required
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
          style={{
            background: 'var(--surface-elevated)',
            border: '1.5px solid rgba(196,184,166,0.3)',
            color: 'var(--bark-700)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
          onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Categoria
        </label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className="px-3 py-2 rounded-xl font-body text-[13px] font-medium transition-all"
              style={{
                background: category === cat.value ? 'var(--moss-400)' : 'var(--surface-elevated)',
                color: category === cat.value ? 'white' : 'var(--bark-400)',
                border: category === cat.value ? 'none' : '1.5px solid rgba(196,184,166,0.3)',
              }}
            >
              {CATEGORY_ICONS[cat.value]} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder frequency */}
      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Recordatorio de compra
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          {freqPresets.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setFrequencyDays(preset.value)}
              className="px-3 py-2 rounded-xl font-body text-[13px] font-medium transition-all"
              style={{
                background: frequencyDays === preset.value ? 'var(--moss-400)' : 'var(--surface-elevated)',
                color: frequencyDays === preset.value ? 'white' : 'var(--bark-400)',
                border: frequencyDays === preset.value ? 'none' : '1.5px solid rgba(196,184,166,0.3)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="365"
            value={frequencyDays}
            onChange={e => setFrequencyDays(e.target.value)}
            className="w-20 px-3 py-2 rounded-xl font-body text-[14px] text-center outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1.5px solid rgba(196,184,166,0.3)',
              color: 'var(--bark-700)',
            }}
          />
          <span className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>dias</span>
        </div>
      </div>

      {/* Units per purchase */}
      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Unidades por compra
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="99"
            value={units}
            onChange={e => setUnits(e.target.value)}
            className="w-20 px-3 py-2 rounded-xl font-body text-[14px] text-center outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1.5px solid rgba(196,184,166,0.3)',
              color: 'var(--bark-700)',
            }}
          />
          <span className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>Ej: 4 rollos, 2 frascos</span>
        </div>
      </div>

      {/* Out of stock toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)' }}>
        <div>
          <span className="font-body font-semibold text-[13px]" style={{ color: 'var(--bark-700)' }}>Agotado</span>
          <p className="font-body text-[11px] mt-0.5" style={{ color: 'var(--bark-300)' }}>Marcar si el producto se ha acabado</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOutOfStock(!isOutOfStock)}
          className="w-11 h-6 rounded-full transition-all relative"
          style={{ background: isOutOfStock ? 'var(--clay-500)' : 'rgba(196,184,166,0.3)' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
            style={{ left: isOutOfStock ? '22px' : '2px' }}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all"
          style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-[0.98]"
          style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
        >
          {product ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}

function EarlyOutOfStockModal({ product, actualDays, onAdjustUnits, onAdjustFrequency, onClose }) {
  const [newUnits, setNewUnits] = useState(Math.max(1, (product.units || 1) - 1))
  const [newFrequency, setNewFrequency] = useState(actualDays)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92dvh] overflow-y-auto fade-in"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(184,90,58,0.1)' }}>
            ⚡
          </div>
          <div>
            <h3 className="font-display text-[20px] leading-tight" style={{ color: 'var(--bark-700)' }}>
              Se agoto antes de tiempo
            </h3>
            <p className="font-body text-[13px] mt-1" style={{ color: 'var(--bark-400)' }}>
              <strong style={{ color: 'var(--bark-700)' }}>{product.name}</strong> duro {actualDays} {actualDays === 1 ? 'dia' : 'dias'}, pero lo tenias configurado cada {product.reminder_frequency_days} dias.
            </p>
          </div>
        </div>

        <p className="font-body text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--bark-300)' }}>
          Que paso?
        </p>

        {/* Option 1: update units */}
        <div className="rounded-xl p-4 mb-2.5" style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)' }}>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-lg leading-none mt-0.5">📦</span>
            <div>
              <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-700)' }}>Use menos unidades</p>
              <p className="font-body text-[12px] mt-0.5" style={{ color: 'var(--bark-400)' }}>
                Tenias {product.units} {product.units === 1 ? 'unidad' : 'unidades'} configuradas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="99"
              value={newUnits}
              onChange={e => setNewUnits(e.target.value)}
              className="w-20 px-3 py-2 rounded-xl font-body text-[14px] text-center outline-none"
              style={{ background: 'var(--surface-card)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
            />
            <span className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>unidades</span>
            <button
              type="button"
              onClick={() => onAdjustUnits(product.id, Math.max(1, parseInt(newUnits) || 1))}
              className="ml-auto px-3.5 py-2 rounded-xl font-body font-semibold text-[13px] text-white active:scale-95 transition-all"
              style={{ background: 'var(--moss-500)' }}
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Option 2: update frequency */}
        <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)' }}>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-lg leading-none mt-0.5">🔄</span>
            <div>
              <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-700)' }}>Dura menos en mi casa</p>
              <p className="font-body text-[12px] mt-0.5" style={{ color: 'var(--bark-400)' }}>
                Ajustar recordatorio de {product.reminder_frequency_days} a lo que realmente dura
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={newFrequency}
              onChange={e => setNewFrequency(e.target.value)}
              className="w-20 px-3 py-2 rounded-xl font-body text-[14px] text-center outline-none"
              style={{ background: 'var(--surface-card)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
            />
            <span className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>dias</span>
            <button
              type="button"
              onClick={() => onAdjustFrequency(product.id, Math.max(1, parseInt(newFrequency) || 1))}
              className="ml-auto px-3.5 py-2 rounded-xl font-body font-semibold text-[13px] text-white active:scale-95 transition-all"
              style={{ background: 'var(--moss-500)' }}
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all"
          style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        >
          Solo agotarlo
        </button>
      </div>
    </div>
  )
}
