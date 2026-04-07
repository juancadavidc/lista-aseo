import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchShoppingCategories, createShoppingCategory,
  updateShoppingCategory, deleteShoppingCategory,
} from '../lib/api'

const EMOJI_OPTIONS = ['📦', '🏪', '🥩', '🥬', '🧹', '💊', '🍞', '🧀', '🐟', '🍷', '🧴', '🛒', '🏠', '🐾', '👶']

export default function ShoppingAdmin() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadCategories = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchShoppingCategories()
      setCategories(data)
    } catch {
      setError('No se pudieron cargar las categorias.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createShoppingCategory({ name: newName.trim(), emoji: newEmoji })
      setNewName('')
      setNewEmoji('📦')
      showToast('Categoria creada')
      loadCategories()
    } catch {
      showToast('Error al crear', 'error')
    }
  }

  async function handleUpdate(cat) {
    if (!editName.trim()) return
    try {
      await updateShoppingCategory(cat.id, { name: editName.trim(), emoji: editEmoji })
      setEditingId(null)
      showToast('Categoria actualizada')
      loadCategories()
    } catch {
      showToast('Error al actualizar', 'error')
    }
  }

  async function handleDelete(cat) {
    if (deletingId === cat.id) {
      try {
        await deleteShoppingCategory(cat.id)
        showToast('Categoria eliminada', 'warning')
        loadCategories()
      } catch { showToast('Error al eliminar', 'error') }
      finally { setDeletingId(null) }
    } else {
      setDeletingId(cat.id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditEmoji(cat.emoji)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(184,90,58,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando...</p>
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
      <div className="mb-6">
        <Link
          to="/shopping"
          className="inline-flex items-center gap-1 font-body text-[12px] font-medium mb-2 transition-all"
          style={{ color: 'var(--bark-300)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver a compras
        </Link>
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Administracion
        </p>
        <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
          Categorias de Compras
        </h2>
        <p className="font-body text-[13px] mt-2" style={{ color: 'var(--bark-300)' }}>
          Crea categorias para organizar tu lista de compras por tienda o tipo.
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-4 font-body text-[13px]" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-6">
        <div className="flex gap-2">
          <EmojiPicker value={newEmoji} onChange={setNewEmoji} />
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de categoria (ej: Almacen, Carniceria...)"
            className="flex-1 px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
            style={{
              background: 'var(--surface-card)',
              border: '1.5px solid rgba(196,184,166,0.3)',
              color: 'var(--bark-700)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
            onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
          />
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
      </form>

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(184,90,58,0.08)' }}>
            🏷️
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Sin categorias</p>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Crea tu primera categoria para organizar las compras</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 stagger">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="rounded-xl overflow-hidden task-enter"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid rgba(196,184,166,0.25)',
                boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
              }}
            >
              {editingId === cat.id ? (
                <div className="px-3.5 py-3 flex items-center gap-2">
                  <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg font-body text-[14px] outline-none"
                    style={{
                      background: 'var(--surface-base)',
                      border: '1.5px solid var(--moss-400)',
                      color: 'var(--bark-700)',
                    }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate(cat)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    onClick={() => handleUpdate(cat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{ color: 'var(--moss-500)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{ color: 'var(--bark-300)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                  <span className="flex-1 font-body font-semibold text-[14px]" style={{ color: 'var(--bark-700)' }}>
                    {cat.name}
                  </span>
                  <button
                    onClick={() => startEdit(cat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{ color: 'var(--bark-300)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{
                      color: deletingId === cat.id ? 'var(--clay-500)' : 'var(--bark-300)',
                      background: deletingId === cat.id ? 'rgba(184,90,58,0.06)' : 'transparent',
                    }}
                  >
                    {deletingId === cat.id ? (
                      <span className="font-body font-bold text-[9px]">Seguro?</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all active:scale-95"
        style={{
          background: 'var(--surface-card)',
          border: '1.5px solid rgba(196,184,166,0.3)',
        }}
      >
        {value}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 p-2 rounded-xl shadow-lg z-20 grid grid-cols-5 gap-1 fade-in"
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)', minWidth: 180 }}
        >
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-90"
              style={{ background: value === emoji ? 'rgba(106,153,96,0.15)' : 'transparent' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
