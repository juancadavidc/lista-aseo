import { useState, useEffect, useCallback } from 'react'
import { fetchShoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem, clearPurchasedItems } from '../lib/api'
import { getActiveProfile } from '../lib/profiles'

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)

  const profile = getActiveProfile()

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadItems = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchShoppingItems()
      setItems(data)
    } catch {
      setError('No se pudo cargar la lista de compras.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createShoppingItem({
        name: newName.trim(),
        note: newNote.trim() || null,
        added_by: profile?.name || null,
      })
      setNewName('')
      setNewNote('')
      setShowNote(false)
      showToast('Agregado a la lista')
      loadItems()
    } catch {
      showToast('Error al agregar', 'error')
    }
  }

  async function handleTogglePurchased(item) {
    try {
      await updateShoppingItem(item.id, { is_purchased: !item.is_purchased })
      loadItems()
    } catch {
      showToast('Error al actualizar', 'error')
    }
  }

  async function handleDelete(item) {
    if (deletingId === item.id) {
      try {
        await deleteShoppingItem(item.id)
        showToast('Eliminado', 'warning')
        loadItems()
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
      showToast('Lista limpiada')
      loadItems()
    } catch {
      showToast('Error al limpiar', 'error')
    }
  }

  const pending = items.filter(i => !i.is_purchased)
  const purchased = items.filter(i => i.is_purchased)

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

      {/* Quick add form */}
      <form onSubmit={handleAdd} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Agregar producto..."
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all pr-10"
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
            disabled={!newName.trim()}
            className="px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        {showNote && (
          <input
            type="text"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Nota opcional (ej: marca, cantidad...)"
            className="w-full mt-2 px-3.5 py-2 rounded-xl font-body text-[13px] outline-none transition-all"
            style={{
              background: 'var(--surface-card)',
              border: '1.5px solid rgba(196,184,166,0.3)',
              color: 'var(--bark-700)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
            onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
          />
        )}
      </form>

      {/* Pending items */}
      {pending.length === 0 && purchased.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(106,153,96,0.08)' }}>
            🛒
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Lista vacia</p>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Agrega cosas que veas que se necesitan comprar</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2 mb-6 stagger">
              {pending.map(item => (
                <ShoppingItem
                  key={item.id}
                  item={item}
                  deletingId={deletingId}
                  onToggle={handleTogglePurchased}
                  onDelete={handleDelete}
                />
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
                >
                  Limpiar lista
                </button>
              </div>
              <div className="flex flex-col gap-2 stagger">
                {purchased.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    deletingId={deletingId}
                    onToggle={handleTogglePurchased}
                    onDelete={handleDelete}
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

function ShoppingItem({ item, deletingId, onToggle, onDelete }) {
  const isDeleting = deletingId === item.id
  const timeAgo = formatTimeAgo(item.created_at)

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
          <div className="flex items-center gap-2 mt-1">
            {item.note && (
              <span className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                {item.note}
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
