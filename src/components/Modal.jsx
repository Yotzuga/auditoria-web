import { useEffect } from 'react'
import { X as XIcon } from 'lucide-react'
import { useMedia } from '../lib/useMedia'

/**
 * Escritorio: diálogo centrado. Teléfono (< 768 px): hoja inferior con asa (diseños "Nuevo mapa") o,
 * con `full`, página completa (diseño "Mis mapas").
 */
export default function Modal({ onClose, width = 440, children, label, full = false }) {
  const mobile = useMedia('(max-width: 767px)')
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  if (mobile && full) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-modal
        className="fixed inset-0 z-50 flex flex-col gap-[22px] overflow-y-auto bg-bg px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-[max(env(safe-area-inset-top),8px)]"
      >
        {children}
      </div>
    )
  }

  if (mobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/70"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          data-modal
          className="flex max-h-[92dvh] w-full flex-col gap-[22px] overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-surface px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2.5"
        >
          <div className="flex shrink-0 justify-center">
            <span className="h-[5px] w-9 rounded-[3px] bg-[#2E323B]" />
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-modal
        style={{ width }}
        className="flex max-h-full max-w-full flex-col gap-[22px] overflow-y-auto rounded-[20px] border border-line bg-surface p-7 shadow-[0_24px_64px_#00000099]"
      >
        {children}
      </div>
    </div>
  )
}

export function CloseButton({ onClick, size = 36 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink"
    >
      <XIcon />
    </button>
  )
}
