import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchShoppingHistory, fetchShoppingCategories } from '../lib/api'
import SearchInput from '../components/SearchInput'

export default function ShoppingHistory() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [hist, cats] = await Promise.all([
          fetchShoppingHistory(200),
          fetchShoppingCategories(),
        ])
        if (cancelled) return
        setItems(hist)
        setCategories(cats)
      } catch {
        if (!cancelled) setError('No se pudo cargar el historial.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(item => {
      if (categoryFilter && item.category_id !== categoryFilter) return false
      if (!q) return true
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.note || '').toLowerCase().includes(q) ||
        (item.category_name || '').toLowerCase().includes(q)
      )
    })
  }, [items, query, categoryFilter])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(184,90,58,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando historial...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
            Compras archivadas
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Historial
          </h2>
        </div>
        <Link
          to="/shopping"
          className="px-3 py-2 rounded-xl font-body text-[12px] font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-500)' }}
        >
          Volver
        </Link>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-4 font-body text-[13px]" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(106,153,96,0.08)' }}>
            📦
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Sin historial aun</p>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            Las compras marcadas se archivan a los 7 dias y apareceran aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-2 mb-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar en el historial..."
            />
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl font-body text-[13px] outline-none transition-all appearance-none cursor-pointer"
                style={{
                  background: 'var(--surface-card)',
                  border: '1.5px solid rgba(196,184,166,0.3)',
                  color: categoryFilter ? 'var(--bark-700)' : 'var(--bark-300)',
                }}
              >
                <option value="">Todas las categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 fade-in">
              <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-400)' }}>
                Sin resultados
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map(group => (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="font-body text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-400)' }}>
                      {group.label}
                    </span>
                    <span className="font-body text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-300)' }}>
                      {group.items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 stagger">
                    {group.items.map((item, i) => (
                      <HistoryRow key={item.id} item={item} delay={i * 0.03} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function HistoryRow({ item, delay }) {
  const purchasedDate = item.purchased_at ? new Date(item.purchased_at) : null
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl fade-in"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid rgba(196,184,166,0.2)',
        animationDelay: `${delay}s`,
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(106,153,96,0.1)' }}
      >
        <span style={{ fontSize: 14 }}>{item.category_emoji || '🛒'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-[13px] leading-tight truncate" style={{ color: 'var(--bark-700)' }}>
          {item.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.category_name && (
            <span className="font-body text-[10px] font-medium" style={{ color: 'var(--moss-500)' }}>
              {item.category_name}
            </span>
          )}
          {item.note && (
            <span className="font-body text-[10px]" style={{ color: 'var(--bark-300)' }}>
              {item.note}
            </span>
          )}
          {item.added_by && (
            <span className="font-body text-[10px]" style={{ color: 'var(--bark-300)' }}>
              · {item.added_by}
            </span>
          )}
        </div>
      </div>
      {purchasedDate && (
        <div className="text-right flex-shrink-0">
          <p className="font-body text-[11px] font-semibold" style={{ color: 'var(--bark-500)' }}>
            {purchasedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </p>
          <p className="font-body text-[10px]" style={{ color: 'var(--bark-300)' }}>
            {purchasedDate.toLocaleDateString('es-ES', { year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  )
}

function groupByMonth(items) {
  const map = new Map()
  for (const item of items) {
    const ref = item.purchased_at || item.archived_at || item.created_at
    if (!ref) continue
    const d = new Date(ref)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        items: [],
      })
    }
    map.get(key).items.push(item)
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}
