import { useState, useRef } from 'react'
import { getImageUrl } from '../lib/api'

const FREQ_ICONS = {
  daily: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  weekly: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  biweekly: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h8" strokeWidth="2"/>
    </svg>
  ),
  monthly: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
}

function getUrgencyColor(task) {
  if (!task.lastCompletedAt) return 'var(--urgency-high)'
  const label = task.overdueLabel
  if (label.includes('días') || label === 'desde ayer') return 'var(--urgency-high)'
  return 'var(--urgency-low)'
}

export default function TaskCard({ task, onComplete }) {
  const [checking, setChecking] = useState(false)
  const [done, setDone] = useState(false)
  const cardRef = useRef(null)
  const [ripple, setRipple] = useState(null)

  async function handleCheck(e) {
    if (checking || done) return
    setChecking(true)

    // Ripple from click position
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX || rect.left + rect.width / 2) - rect.left
    const y = (e.clientY || rect.top + rect.height / 2) - rect.top
    const size = Math.max(rect.width, rect.height)
    setRipple({ x: x - size / 2, y: y - size / 2, size })

    await new Promise(r => setTimeout(r, 150))
    setDone(true)
    await new Promise(r => setTimeout(r, 400))
    await onComplete(task.id)
  }

  const urgencyColor = getUrgencyColor(task)

  return (
    <div
      ref={cardRef}
      className={`task-card task-enter rounded-2xl pl-6 pr-4 py-4 flex items-center gap-4 cursor-pointer select-none ripple-container ${done ? 'task-exit' : ''}`}
      style={{
        background: done ? 'var(--moss-100)' : 'var(--surface-card)',
        boxShadow: done ? 'none' : '0 1px 3px rgba(26,22,20,0.06), 0 6px 16px rgba(26,22,20,0.04)',
        border: '1px solid',
        borderColor: done ? 'rgba(106,153,96,0.3)' : 'rgba(196,184,166,0.25)',
        opacity: done ? 0.7 : 1,
      }}
      onClick={handleCheck}
    >
      {/* Urgency stripe */}
      <div className="urgency-stripe" style={{ background: done ? 'var(--moss-400)' : urgencyColor }} />

      {/* Ripple */}
      {ripple && (
        <div
          className="ripple-circle"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            background: done ? 'rgba(106,153,96,0.15)' : 'rgba(106,153,96,0.1)',
          }}
        />
      )}

      {/* Checkbox */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-300"
        style={{
          width: 44,
          height: 44,
          background: done
            ? 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)'
            : 'transparent',
          border: done ? 'none' : '2px solid rgba(196,184,166,0.5)',
          boxShadow: done ? '0 0 16px rgba(106,153,96,0.25)' : 'none',
        }}
      >
        {done ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              className="checkmark-draw"
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="24"
              strokeDashoffset="24"
            />
          </svg>
        ) : (
          <div
            className="rounded-lg transition-all duration-200"
            style={{
              width: 16,
              height: 16,
              background: checking ? 'rgba(106,153,96,0.3)' : 'transparent',
              transform: checking ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        )}
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p
          className="font-body font-semibold text-[15px] leading-tight"
          style={{
            color: done ? 'var(--moss-500)' : 'var(--bark-700)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.name}
        </p>
        {task.description && (
          <p className="font-body text-[13px] mt-0.5 truncate" style={{ color: 'var(--bark-300)' }}>
            {task.description}
          </p>
        )}
        {task.product_name && (
          <div className="flex items-center gap-2 mt-1.5">
            {task.product_image && (
              <img
                src={getImageUrl(task.product_image)}
                alt={task.product_name}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                style={{ border: '1px solid rgba(196,184,166,0.3)' }}
              />
            )}
            <span className="font-body text-[12px] font-medium" style={{ color: 'var(--bark-400)' }}>
              🧴 {task.product_name}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="freq-badge"
            style={{
              background: 'rgba(106,153,96,0.1)',
              color: 'var(--moss-500)',
            }}
          >
            {FREQ_ICONS[task.frequency_type] || FREQ_ICONS.weekly}
            {task.frequencyLabel}
          </span>
          <span className="text-[11px] font-body font-medium" style={{ color: urgencyColor }}>
            {task.overdueLabel}
          </span>
        </div>
      </div>

      {/* Chevron */}
      {!done && (
        <div className="flex-shrink-0" style={{ color: 'var(--bark-300)', opacity: 0.4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      )}
    </div>
  )
}
