import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchShoppingItems, createShoppingItem, updateShoppingItem,
  deleteShoppingItem, clearPurchasedItems, fetchShoppingCategories,
  fetchShoppingRecommendations,
} from '../lib/api'
import { suggestCategory } from '../lib/smartTags'
import SearchInput from '../components/SearchInput'

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [dismissedFor, setDismissedFor] = useState('')
  const [query, setQuery] = useState('')
  const [dismissedRecs, setDismissedRecs] = useState(() => new Set())
  const [recsCollapsed, setRecsCollapsed] = useState(false)
  const [addingRecName, setAddingRecName] = useState(null)
  const [adding, setAdding] = useState(false)

  // Permite agregar varios productos de una sola vez separandolos por coma.
  const parsedNames = useMemo(() => parseItemNames(newName), [newName])

  // Solo se sugiere categoria cuando todos los productos escritos apuntan
  // a la misma; si se mezclan categorias no hay una sugerencia util.
  const suggestion = useMemo(() => {
    if (parsedNames.length === 0 || newCategoryId) return null
    if (dismissedFor === newName) return null
    const matches = parsedNames.map(name => suggestCategory(name, categories))
    const first = matches.find(Boolean)
    if (!first) return null
    if (matches.some(m => m && m.id !== first.id)) return null
    return first
  }, [parsedNames, newName, categories, newCategoryId, dismissedFor])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [itemsData, catsData, recsData] = await Promise.all([
        fetchShoppingItems(),
        fetchShoppingCategories(),
        fetchShoppingRecommendations().catch(() => []),
      ])
      setItems(itemsData)
      setCategories(catsData)
      setRecommendations(recsData)
    } catch {
      setError('No se pudo cargar la lista de compras.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleAdd(e) {
    e.preventDefault()
    const names = parsedNames
    if (names.length === 0 || adding) return
    const note = newNote.trim() || null
    const categoryId = newCategoryId || null
    setAdding(true)
    try {
      const results = await Promise.allSettled(
        names.map(name => createShoppingItem({ name, note, category_id: categoryId }))
      )
      const failedNames = names.filter((_, i) => results[i].status === 'rejected')
      const addedCount = names.length - failedNames.length

      // Los que fallaron se conservan en el input para reintentar.
      setNewName(failedNames.join(', '))
      if (failedNames.length === 0) {
        setNewNote('')
        setNewCategoryId('')
        setShowNote(false)
        setDismissedFor('')
      }

      if (failedNames.length === 0) {
        showToast(addedCount === 1 ? 'Agregado a la lista' : `${addedCount} productos agregados`)
      } else if (addedCount > 0) {
        showToast(`${addedCount} agregados, ${failedNames.length} con error`, 'warning')
      } else {
        showToast('Error al agregar', 'error')
      }
      loadData()
    } finally {
      setAdding(false)
    }
  }

  async function handleTogglePurchased(item) {
    try {
      await updateShoppingItem(item.id, { is_purchased: !item.is_purchased })
      loadData()
    } catch {
      showToast('Error al actualizar', 'error')
    }
  }

  async function handleSaveEdit(id, updates) {
    try {
      await updateShoppingItem(id, updates)
      showToast('Cambios guardados')
      await loadData()
      return true
    } catch {
      showToast('Error al guardar', 'error')
      return false
    }
  }

  async function handleDelete(item) {
    if (deletingId === item.id) {
      try {
        await deleteShoppingItem(item.id)
        showToast('Eliminado', 'warning')
        loadData()
      } catch { showToast('Error al eliminar', 'error') }
      finally { setDeletingId(null) }
    } else {
      setDeletingId(item.id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  async function handleClearPurchased() {
    try {
      await clearPurchasedItems()
      showToast('Comprados archivados')
      loadData()
    } catch {
      showToast('Error al limpiar', 'error')
    }
  }

  async function handleAddRecommendation(rec) {
    try {
      setAddingRecName(rec.name)
      await createShoppingItem({
        name: rec.name,
        note: null,
        category_id: rec.category_id || null,
      })
      showToast(`${rec.name} agregado`)
      loadData()
    } catch {
      showToast('Error al agregar', 'error')
    } finally {
      setAddingRecName(null)
    }
  }

  function handleDismissRecommendation(rec) {
    setDismissedRecs(prev => {
      const next = new Set(prev)
      next.add(rec.name.toLowerCase())
      return next
    })
  }

  const visibleRecommendations = recommendations.filter(
    r => !dismissedRecs.has(r.name.toLowerCase())
  )

  const matchesQuery = useCallback((item) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.note || '').toLowerCase().includes(q) ||
      (item.category_name || '').toLowerCase().includes(q)
    )
  }, [query])

  const pending = items.filter(i => !i.is_purchased && matchesQuery(i))
  const purchased = items.filter(i => i.is_purchased && matchesQuery(i))
  const hasAnyItem = items.length > 0
  const hasVisibleItem = pending.length > 0 || purchased.length > 0

  // Group pending items by category
  const grouped = groupByCategory(pending, categories)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(184,90,58,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando lista...</p>
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
            Por comprar
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Lista de Compras
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shopping/history"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-400)' }}
            title="Historial de compras"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M12 7v5l3 2"/>
            </svg>
          </Link>
          <Link
            to="/shopping/admin"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-400)' }}
            title="Administrar categorias"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </Link>
          <div className="px-3 py-1.5 rounded-xl text-center" style={{ background: 'rgba(184,90,58,0.06)', border: '1px solid rgba(184,90,58,0.15)' }}>
            <span className="font-display text-lg leading-none" style={{ color: 'var(--clay-500)' }}>{pending.length}</span>
            <span className="font-body text-[10px] font-semibold uppercase tracking-wider ml-1.5" style={{ color: 'var(--bark-300)' }}>pendientes</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-4 font-body text-[13px]" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      {/* Recommendations from purchase history */}
      {visibleRecommendations.length > 0 && (
        <RecommendationsSection
          recommendations={visibleRecommendations}
          collapsed={recsCollapsed}
          onToggleCollapsed={() => setRecsCollapsed(c => !c)}
          onAdd={handleAddRecommendation}
          onDismiss={handleDismissRecommendation}
          addingRecName={addingRecName}
        />
      )}

      {/* Quick add form */}
      <form onSubmit={handleAdd} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Agregar productos (separa con comas)..."
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[16px] outline-none transition-all pr-10"
              style={{
                background: 'var(--surface-card)',
                border: '1.5px solid rgba(196,184,166,0.3)',
                color: 'var(--bark-700)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            />
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: showNote ? 'var(--moss-500)' : 'var(--bark-300)' }}
              title="Agregar nota"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={parsedNames.length === 0 || adding}
            className="px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        {/* Preview cuando se escriben varios productos separados por coma */}
        {parsedNames.length > 1 && (
          <p className="font-body text-[11px] mt-2 px-1" style={{ color: 'var(--bark-300)' }}>
            {parsedNames.length} productos: {parsedNames.join(' · ')}
          </p>
        )}

        {/* Smart tag suggestion */}
        {suggestion && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>Sugerencia:</span>
            <button
              type="button"
              onClick={() => {
                setNewCategoryId(suggestion.id)
                setDismissedFor('')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[12px] font-semibold transition-all active:scale-95"
              style={{
                background: 'rgba(106,153,96,0.12)',
                color: 'var(--moss-600)',
                border: '1px solid rgba(106,153,96,0.25)',
              }}
            >
              <span>{suggestion.emoji}</span>
              <span>{suggestion.name}</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedFor(newName)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ color: 'var(--bark-300)' }}
              title="Descartar sugerencia"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* Category selector + note */}
        <div className="flex gap-2 mt-2">
          {categories.length > 0 && (
            <select
              value={newCategoryId}
              onChange={e => setNewCategoryId(e.target.value)}
              className="px-3 py-2 rounded-xl font-body text-[16px] outline-none transition-all appearance-none cursor-pointer"
              style={{
                background: 'var(--surface-card)',
                border: '1.5px solid rgba(196,184,166,0.3)',
                color: newCategoryId ? 'var(--bark-700)' : 'var(--bark-300)',
                minWidth: 0,
                flex: showNote ? '0 0 auto' : '1',
              }}
            >
              <option value="">Sin categoria</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
              ))}
            </select>
          )}
          {showNote && (
            <input
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Nota (ej: marca, cantidad...)"
              className="flex-1 px-3.5 py-2 rounded-xl font-body text-[16px] outline-none transition-all"
              style={{
                background: 'var(--surface-card)',
                border: '1.5px solid rgba(196,184,166,0.3)',
                color: 'var(--bark-700)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            />
          )}
        </div>
      </form>

      {/* Search */}
      {items.length >= 5 && (
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar en la lista..."
          />
        </div>
      )}

      {/* Pending items - grouped by category */}
      {!hasAnyItem ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(106,153,96,0.08)' }}>
            🛒
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Lista vacia</p>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Agrega cosas que veas que se necesitan comprar</p>
        </div>
      ) : !hasVisibleItem ? (
        <div className="text-center py-10 fade-in">
          <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-400)' }}>
            Sin resultados para "{query}"
          </p>
          <p className="font-body text-[12px] mt-0.5" style={{ color: 'var(--bark-300)' }}>
            Probá con otro termino
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-6">
              {grouped.map(group => (
                <div key={group.key} className="mb-4 last:mb-0">
                  {/* Category header - only show if there are categories in use */}
                  {(grouped.length > 1 || group.key !== '__none__') && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-sm">{group.emoji}</span>
                      <span className="font-body text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-400)' }}>
                        {group.name}
                      </span>
                      <span className="font-body text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-300)' }}>
                        {group.items.length}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 stagger">
                    {group.items.map(item => (
                      <ShoppingItem
                        key={item.id}
                        item={item}
                        categories={categories}
                        deletingId={deletingId}
                        onToggle={handleTogglePurchased}
                        onDelete={handleDelete}
                        onSave={handleSaveEdit}
                        showCategoryBadge={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purchased items */}
          {purchased.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-body text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>
                  Comprados ({purchased.length})
                </p>
                <button
                  onClick={handleClearPurchased}
                  className="font-body text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                  style={{ color: 'var(--clay-500)', background: 'rgba(184,90,58,0.06)' }}
                  title="Archivar comprados (van al historial)"
                >
                  Archivar
                </button>
              </div>
              <div className="flex flex-col gap-2 stagger">
                {purchased.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    categories={categories}
                    deletingId={deletingId}
                    onToggle={handleTogglePurchased}
                    onDelete={handleDelete}
                    onSave={handleSaveEdit}
                    showCategoryBadge={true}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Divide el texto del input en varios nombres de producto separados por coma.
// Normaliza espacios y elimina duplicados (sin distinguir mayusculas).
export function parseItemNames(text) {
  const seen = new Set()
  const names = []
  for (const raw of String(text || '').split(',')) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

function groupByCategory(items, categories) {
  const groups = []
  const catMap = new Map()

  // Group items by category_id
  for (const item of items) {
    const key = item.category_id || '__none__'
    if (!catMap.has(key)) {
      catMap.set(key, [])
    }
    catMap.get(key).push(item)
  }

  // Build ordered groups: categories first (by sort_order), then uncategorized
  for (const cat of categories) {
    if (catMap.has(cat.id)) {
      groups.push({ key: cat.id, name: cat.name, emoji: cat.emoji, items: catMap.get(cat.id) })
    }
  }

  // Uncategorized at the end
  if (catMap.has('__none__')) {
    groups.push({ key: '__none__', name: 'Sin categoria', emoji: '📋', items: catMap.get('__none__') })
  }

  return groups
}

function ShoppingItem({ item, categories, deletingId, onToggle, onDelete, onSave, showCategoryBadge }) {
  const isDeleting = deletingId === item.id
  const timeAgo = formatTimeAgo(item.created_at)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editNote, setEditNote] = useState(item.note || '')
  const [editCategoryId, setEditCategoryId] = useState(item.category_id || '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setEditName(item.name)
    setEditNote(item.note || '')
    setEditCategoryId(item.category_id || '')
    setIsEditing(true)
  }

  async function saveEdit() {
    const name = editName.trim()
    if (!name || saving) return
    setSaving(true)
    const ok = await onSave(item.id, {
      name,
      note: editNote.trim() || null,
      category_id: editCategoryId || null,
    })
    setSaving(false)
    if (ok) setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div
        className="rounded-xl overflow-hidden task-enter"
        style={{
          background: 'var(--surface-card)',
          border: '1.5px solid var(--moss-400)',
          boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
        }}
      >
        <div className="px-3.5 py-3 flex flex-col gap-2">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Nombre del producto"
            className="w-full px-3 py-2 rounded-lg font-body text-[16px] outline-none"
            style={{
              background: 'var(--surface-base)',
              border: '1.5px solid rgba(196,184,166,0.4)',
              color: 'var(--bark-700)',
            }}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setIsEditing(false)
            }}
          />
          <select
            value={editCategoryId}
            onChange={e => setEditCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg font-body text-[16px] outline-none appearance-none cursor-pointer"
            style={{
              background: 'var(--surface-base)',
              border: '1.5px solid rgba(196,184,166,0.4)',
              color: editCategoryId ? 'var(--bark-700)' : 'var(--bark-300)',
            }}
          >
            <option value="">Sin categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            placeholder="Nota (ej: marca, cantidad...)"
            className="w-full px-3 py-2 rounded-lg font-body text-[16px] outline-none"
            style={{
              background: 'var(--surface-base)',
              border: '1.5px solid rgba(196,184,166,0.4)',
              color: 'var(--bark-700)',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setIsEditing(false)
            }}
          />
          <div className="flex items-center justify-end gap-2 mt-0.5">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] transition-all active:scale-95"
              style={{ color: 'var(--bark-400)', background: 'rgba(196,184,166,0.15)' }}
            >
              Cancelar
            </button>
            <button
              onClick={saveEdit}
              disabled={!editName.trim() || saving}
              className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--moss-500)' }}
            >
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden task-enter relative"
      style={{
        background: item.is_purchased ? 'rgba(106,153,96,0.04)' : 'var(--surface-card)',
        border: '1px solid',
        borderColor: item.is_purchased ? 'rgba(106,153,96,0.15)' : 'rgba(196,184,166,0.25)',
        boxShadow: item.is_purchased ? 'none' : '0 1px 3px rgba(26,22,20,0.04)',
        opacity: item.is_purchased ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item)}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90"
          style={{
            borderColor: item.is_purchased ? 'var(--moss-400)' : 'rgba(196,184,166,0.4)',
            background: item.is_purchased ? 'var(--moss-400)' : 'transparent',
          }}
        >
          {item.is_purchased && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="font-body font-semibold text-[14px] leading-tight"
            style={{
              color: item.is_purchased ? 'var(--bark-300)' : 'var(--bark-700)',
              textDecoration: item.is_purchased ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.note && (
              <span className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                {item.note}
              </span>
            )}
            {showCategoryBadge && item.category_name && (
              <span className="font-body text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' }}>
                {item.category_emoji} {item.category_name}
              </span>
            )}
            {item.added_by && (
              <span className="font-body text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-300)' }}>
                {item.added_by}
              </span>
            )}
            <span className="font-body text-[10px]" style={{ color: 'var(--bark-200)' }}>
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Edit */}
        <button
          onClick={startEdit}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ color: 'var(--bark-300)' }}
          title="Editar"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(item)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{
            color: isDeleting ? 'var(--clay-500)' : 'var(--bark-300)',
            background: isDeleting ? 'rgba(184,90,58,0.06)' : 'transparent',
          }}
        >
          {isDeleting ? (
            <span className="font-body font-bold text-[9px]">Seguro?</span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days}d`
}

function recommendationStatusLabel(rec) {
  const d = rec.days_until_next
  if (d < -1) return `Vencido hace ${Math.abs(d)} dias`
  if (d <= 0) return 'Toca recomprar'
  if (d === 1) return 'En 1 dia'
  return `En ${d} dias`
}

function RecommendationsSection({
  recommendations, collapsed, onToggleCollapsed, onAdd, onDismiss, addingRecName,
}) {
  return (
    <div
      className="mb-5 rounded-2xl overflow-hidden fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(106,153,96,0.06), rgba(196,184,166,0.04))',
        border: '1px solid rgba(106,153,96,0.18)',
      }}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 transition-colors active:scale-[0.995]"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(106,153,96,0.18)' }}
          >
            <span style={{ fontSize: 14 }}>✨</span>
          </div>
          <div className="text-left">
            <p className="font-body text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--moss-600)' }}>
              Sugeridos para volver a comprar
            </p>
            <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
              {recommendations.length} {recommendations.length === 1 ? 'sugerencia' : 'sugerencias'} segun tu historial
            </p>
          </div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--bark-400)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          {recommendations.map((rec, i) => {
            const isAdding = addingRecName === rec.name
            return (
              <div
                key={`${rec.name}-${i}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid rgba(196,184,166,0.25)',
                }}
              >
                {rec.category_emoji ? (
                  <span style={{ fontSize: 16 }}>{rec.category_emoji}</span>
                ) : (
                  <span style={{ fontSize: 16 }}>🛒</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-[13px] leading-tight truncate" style={{ color: 'var(--bark-700)' }}>
                    {rec.name}
                  </p>
                  <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                    {recommendationStatusLabel(rec)} · cada ~{rec.avg_interval_days}d · {rec.times_bought}x
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => onAdd(rec)}
                  className="px-2.5 py-1.5 rounded-lg font-body font-semibold text-[11px] text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--moss-500)' }}
                  title="Agregar a la lista"
                >
                  {isAdding ? '...' : '+ Agregar'}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(rec)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                  style={{ color: 'var(--bark-300)' }}
                  title="Descartar"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
