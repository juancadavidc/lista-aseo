import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fetchTaskHistory } from '../lib/tasks'

export default function HistoryModal({ task, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!task) return
    fetchTaskHistory(task.id, 15)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [task])

  if (!task) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[80dvh] overflow-y-auto fade-in"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
              Historial
            </h3>
            <p className="font-body text-[12px] font-medium" style={{ color: 'var(--bark-300)' }}>{task.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(196,184,166,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bark-400)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,184,166,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bark-300)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
              </svg>
            </div>
            <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Sin historial</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {history.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl fade-in"
                style={{
                  background: i === 0 ? 'rgba(106,153,96,0.06)' : 'var(--surface-elevated)',
                  border: '1px solid',
                  borderColor: i === 0 ? 'rgba(106,153,96,0.15)' : 'rgba(196,184,166,0.15)',
                  animationDelay: `${i * 0.04}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: i === 0 ? 'var(--moss-400)' : 'rgba(196,184,166,0.12)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? 'white' : 'var(--bark-300)'} strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-body text-[13px] font-medium" style={{ color: 'var(--bark-700)' }}>
                    {new Date(item.completed_at).toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </p>
                  <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                    {new Date(item.completed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {item.completed_by && (
                      <span className="ml-1.5 font-semibold" style={{ color: 'var(--bark-500)' }}>
                        &middot; {item.completed_by}
                      </span>
                    )}
                    {i === 0 && <span className="ml-1.5 font-semibold" style={{ color: 'var(--moss-500)' }}>reciente</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
