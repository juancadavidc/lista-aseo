import { useState, useEffect } from 'react'

let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  window.dispatchEvent(new Event('pwa-installable'))
})

export default function InstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    if (deferredPrompt) {
      setShow(true)
      return
    }

    function onInstallable() {
      if (!sessionStorage.getItem('pwa-dismissed')) setShow(true)
    }
    window.addEventListener('pwa-installable', onInstallable)
    return () => window.removeEventListener('pwa-installable', onInstallable)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    deferredPrompt = null
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto rounded-2xl p-4 shadow-lg fade-in flex items-center gap-3"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid rgba(196,184,166,0.25)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] font-semibold" style={{ color: 'var(--bark-700)' }}>
          Instalar Casa Limpia
        </p>
        <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
          Acceso rapido desde tu pantalla de inicio
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="p-2 rounded-lg transition-all active:scale-95"
          style={{ color: 'var(--bark-300)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <button
          onClick={handleInstall}
          className="px-4 py-2 rounded-xl font-body text-[12px] font-semibold text-white transition-all active:scale-95"
          style={{ background: 'var(--moss-500)' }}
        >
          Instalar
        </button>
      </div>
    </div>
  )
}
