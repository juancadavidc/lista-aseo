export default function ProgressRing({ completed, total }) {
  const size = 56
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = total > 0 ? completed / total : 0
  const dashOffset = circumference - progress * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(196,184,166,0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          className="progress-ring-circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progress >= 1 ? 'var(--moss-400)' : 'var(--moss-300)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            '--circumference': circumference,
            '--dash-offset': dashOffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[15px] leading-none" style={{ color: progress >= 1 ? 'var(--moss-500)' : 'var(--bark-700)' }}>
          {completed}
        </span>
        <span className="font-body text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>
          /{total}
        </span>
      </div>
    </div>
  )
}
