import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { REWARDS } from '../lib/rewards'

const W = 356 // ancho del diseño «Recompensa flotante (⇧X)»
const GAP = 10 // aire entre la tarjeta y la casilla (ahí va la flechita)

/**
 * Tarjeta flotante para elegir la recompensa de una mina recién revelada (⇧X) sin salir del modo Modelo.
 * Se ancla a la casilla seleccionada: arriba si hay sitio (flechita hacia abajo) o debajo si no.
 * Teclas 1–5 y Esc las atiende App; aquí solo clic y cierre al hacer clic fuera.
 */
export default function RewardFloat({ cell, r, c, cx, top, bottom, boardW, zoneRef, onPick, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null) // { left, y, below } — hasta medirla no se ve

  useLayoutEffect(() => {
    const el = ref.current
    const zone = zoneRef.current
    if (!el) return
    const h = el.offsetHeight
    const w = el.offsetWidth
    // horizontal: centrada en la casilla, sin salirse del tablero (si el tablero es más angosto, centrada en él)
    const lo = 4
    const hi = boardW - w - 4
    const left = hi < lo ? (boardW - w) / 2 : Math.max(lo, Math.min(hi, cx - w / 2))
    // vertical: arriba si cabe a la vista; si no, debajo
    let below = false
    const cellEl = zone?.querySelector(`[data-rc="${r},${c}"]`)
    if (zone && cellEl) {
      const zr = zone.getBoundingClientRect()
      const cr = cellEl.getBoundingClientRect()
      const roomAbove = cr.top - zr.top
      const roomBelow = zr.bottom - cr.bottom
      below = roomAbove < h + GAP + 8 && roomBelow > roomAbove
    } else {
      below = top - h - GAP < 4
    }
    setPos({ left, y: below ? bottom + GAP : top - GAP - h, below, w })
  }, [r, c, cx, top, bottom, boardW, zoneRef])

  // que la tarjeta quede a la vista dentro de la zona con scroll
  useLayoutEffect(() => {
    const el = ref.current
    const zone = zoneRef.current
    if (!pos || !el || !zone) return
    const zr = zone.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    if (er.top < zr.top + 8) zone.scrollTop -= zr.top + 8 - er.top
    else if (er.bottom > zr.bottom - 8) zone.scrollTop += er.bottom - (zr.bottom - 8)
  }, [pos, zoneRef])

  // un clic fuera la cierra (elegir otra casilla también la cierra desde App)
  useEffect(() => {
    const down = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [onClose])

  const caretX = pos ? Math.max(18, Math.min((pos.w || W) - 18, cx - pos.left)) : 0

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Recompensa de la mina"
      data-reward-float
      style={{
        left: pos?.left ?? 0,
        top: pos?.y ?? 0,
        width: W,
        maxWidth: 'calc(100vw - 32px)',
        visibility: pos ? 'visible' : 'hidden',
        backgroundImage: 'linear-gradient(#F5B83D10, #F5B83D10)',
      }}
      className="absolute z-30 flex flex-col gap-3 rounded-[14px] border border-accent-mid bg-surface p-3.5 shadow-[0_16px_40px_#000000B3]"
    >
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[13px] font-semibold">¿Qué recompensa dio esta mina?</span>
        </div>
        <span className="font-num text-[11px] text-ink-2">
          Fila {r + 1} · Col {c + 1} · marcada con ⇧X
        </span>
      </div>
      <div className="flex gap-[7px]">
        {REWARDS.map((rw) => {
          const on = cell.reward === rw.id
          const Icon = rw.icon
          return (
            <button
              key={rw.id}
              type="button"
              onClick={() => onPick(rw.id)}
              aria-pressed={on}
              className="relative flex flex-1 flex-col items-center gap-[7px] rounded-[11px] border pb-[9px] pt-2.5 hover:brightness-125"
              style={{
                background: on ? rw.color + '24' : 'var(--color-surface-2)',
                borderColor: on ? rw.color : 'var(--color-line)',
              }}
            >
              <span className="flex size-[30px] items-center justify-center rounded-lg" style={{ background: rw.color + '1F' }}>
                <Icon size={15} style={{ color: rw.color }} />
              </span>
              <span className={`text-[11px] ${on ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>{rw.name}</span>
              <span className="absolute right-1 top-1 font-num text-[9px] text-ink-3">{rw.key}</span>
            </button>
          )
        })}
      </div>
      {pos && (
        <svg
          aria-hidden="true"
          width="16"
          height="9"
          viewBox="0 0 16 9"
          className="pointer-events-none absolute"
          style={{ left: caretX - 8, ...(pos.below ? { top: -8, transform: 'scaleY(-1)' } : { bottom: -8 }) }}
        >
          <path d="M0 0 L8 8 L16 0 Z" fill="var(--color-surface)" />
          <path d="M0 0 L8 8 L16 0 Z" fill="#F5B83D10" />
          <path d="M0 0 L8 8 L16 0" fill="none" stroke="var(--color-accent-mid)" strokeWidth="1" />
        </svg>
      )}
    </div>
  )
}
