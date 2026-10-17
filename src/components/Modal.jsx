import { useEffect } from 'react'
import { X as XIcon } from 'lucide-react'

export default function Modal({ onClose, width = 440, children, label }) {
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
