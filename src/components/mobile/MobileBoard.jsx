import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Minimize2 } from 'lucide-react'
import CellGlyph, { cellBg } from '../CellGlyph'

// Márgenes dentro del área desplazable. Arriba/izquierda se reserva la banda de las reglas y abajo la de
// los controles (zoom y minimapa), así las casillas de los bordes pueden quedar libres y tocables.
const PAD_T = 22
const PAD_L = 26
const PAD_R = 10
const PAD_B = 72
const RULER_IDLE = 1400 // ms sin tocar ni desplazar para que las reglas reaparezcan
const ZOOM_STEPS = [100, 150, 200, 300]
const MAX_ZOOM = 400

// Una casilla solo se redibuja si cambia ella misma, su tamaño o si se (de)selecciona.
const Cell = memo(function Cell({ cell, r, c, size, on }) {
  return (
    <div
      data-rc={`${r},${c}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(3, size * 0.21),
        ...(on ? { boxShadow: '0 0 10px #F5B83DAA' } : null),
      }}
      className={`flex shrink-0 items-center justify-center ${cellBg(cell)} ${on ? 'border-2 border-accent' : ''}`}
    >
      <CellGlyph cell={cell} fs={size * 0.7} />
    </div>
  )
})

const pill = 'pointer-events-none absolute flex h-[15px] min-w-[22px] items-center justify-center rounded px-1 font-num text-[10px] leading-none'

/**
 * Pantalla vertical: tablero dentro de un visor con zoom (botón y pellizco),
 * números de fila/columna en los bordes, minimapa y desplazamiento táctil.
 * 100 % = el mapa completo cabe a lo ancho (como en el diseño "Mapa").
 */
export default function MobileBoard({ map, sel, onSelect }) {
  const hostRef = useRef(null)
  const scrollRef = useRef(null)
  const [box, setBox] = useState({ w: 358, h: 338 })
  const [zoom, setZoom] = useState(100)
  const [scroll, setScroll] = useState({ x: 0, y: 0 })
  const pending = useRef(null) // punto a conservar al cambiar el zoom
  const zoomRef = useRef(100)
  zoomRef.current = zoom

  const calc = useCallback(
    (z) => {
      const unit = Math.max(10, Math.floor((box.w - PAD_L - PAD_R - (map.cols - 1) * 2) / map.cols))
      const size = Math.max(6, Math.round((unit * z) / 100))
      const gap = z >= 130 ? 3 : 2
      const contentW = map.cols * size + (map.cols - 1) * gap + PAD_L + PAD_R
      const contentH = map.rows * size + (map.rows - 1) * gap + PAD_T + PAD_B
      const innerW = Math.max(contentW, box.w)
      const innerH = Math.max(contentH, box.h)
      return { size, gap, contentW, contentH, innerW, innerH, offX: (innerW - contentW) / 2, offY: (innerH - contentH) / 2 }
    },
    [box.w, box.h, map.cols, map.rows],
  )
  const L = calc(zoom)

  useEffect(() => {
    const el = hostRef.current
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setBox({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // cambiar el zoom conservando el punto (fx, fy del visor) que estaba bajo el dedo / en el centro
  const setZoomAt = useCallback(
    (next, fx = box.w / 2, fy = box.h / 2) => {
      next = Math.round(Math.max(100, Math.min(MAX_ZOOM, next)))
      const cur = zoomRef.current
      if (next === cur) return
      const el = scrollRef.current
      const a = calc(cur)
      pending.current = {
        fx,
        fy,
        px: (el.scrollLeft + fx - a.offX) / a.contentW,
        py: (el.scrollTop + fy - a.offY) / a.contentH,
        z: next,
      }
      setZoom(next)
    },
    [box.w, box.h, calc],
  )

  useLayoutEffect(() => {
    const p = pending.current
    const el = scrollRef.current
    if (!p || !el || p.z !== zoom) return
    pending.current = null
    const b = calc(zoom)
    el.scrollLeft = b.offX + p.px * b.contentW - p.fx
    el.scrollTop = b.offY + p.py * b.contentH - p.fy
  }, [zoom, calc])

  // volver a 100 % cuando se abre otro mapa
  useEffect(() => {
    setZoom(100)
    pending.current = null
    const el = scrollRef.current
    if (el) {
      el.scrollLeft = 0
      el.scrollTop = 0
    }
  }, [map.id])

  const onScroll = useRef(null)
  onScroll.current = () => {
    const el = scrollRef.current
    setScroll({ x: el.scrollLeft, y: el.scrollTop })
  }
  // Reglas visibles solo en reposo: desaparecen al tocar o desplazar y vuelven tras RULER_IDLE ms.
  const [rulers, setRulers] = useState(true)
  const touching = useRef(false)
  const rulerTimer = useRef(0)
  const hush = useCallback(() => {
    setRulers(false)
    clearTimeout(rulerTimer.current)
    rulerTimer.current = setTimeout(() => {
      if (!touching.current) setRulers(true)
    }, RULER_IDLE)
  }, [])
  useEffect(() => () => clearTimeout(rulerTimer.current), [])
  const raf = useRef(0)
  const handleScroll = () => {
    hush()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => onScroll.current())
  }

  // pellizco con dos dedos
  useEffect(() => {
    const host = hostRef.current
    let start = null
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const mid = (t) => {
      const r = host.getBoundingClientRect()
      return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top]
    }
    const ts = (e) => {
      if (e.touches.length === 2) start = { d: dist(e.touches), z: zoomRef.current }
      else start = null
    }
    const tm = (e) => {
      if (e.touches.length !== 2 || !start) return
      const [fx, fy] = mid(e.touches)
      setZoomAt((start.z * dist(e.touches)) / start.d, fx, fy)
    }
    const te = () => (start = null)
    host.addEventListener('touchstart', ts, { passive: true })
    host.addEventListener('touchmove', tm, { passive: true })
    host.addEventListener('touchend', te, { passive: true })
    return () => {
      host.removeEventListener('touchstart', ts)
      host.removeEventListener('touchmove', tm)
      host.removeEventListener('touchend', te)
    }
  }, [setZoomAt])

  // mantener visible la casilla seleccionada (solo mueve el scroll del visor)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const b = calc(zoomRef.current)
    const x0 = b.offX + PAD_L + sel.c * (b.size + b.gap)
    const y0 = b.offY + PAD_T + sel.r * (b.size + b.gap)
    const m = 30
    if (x0 - m < el.scrollLeft) el.scrollLeft = x0 - m
    else if (x0 + b.size + m > el.scrollLeft + box.w) el.scrollLeft = x0 + b.size + m - box.w
    const mb = 76 // deja libre la zona del zoom y el minimapa
    if (y0 - m < el.scrollTop) el.scrollTop = y0 - m
    else if (y0 + b.size + mb > el.scrollTop + box.h) el.scrollTop = y0 + b.size + mb - box.h
  }, [sel.r, sel.c, box.w, box.h]) // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (e) => {
    const t = e.target.closest('[data-rc]')
    if (!t) return
    const [r, c] = t.dataset.rc.split(',').map(Number)
    onSelect({ r, c })
  }

  // ---- números en los bordes: múltiplos de 5 y la fila/columna seleccionada ----
  const colX = (c) => L.offX + PAD_L + c * (L.size + L.gap) + L.size / 2 - scroll.x
  const rowY = (r) => L.offY + PAD_T + r * (L.size + L.gap) + L.size / 2 - scroll.y
  const selX = colX(sel.c)
  const selY = rowY(sel.r)
  const colPills = []
  const rowPills = []
  for (let k = 5; k <= map.cols; k += 5) {
    const x = colX(k - 1)
    if (k - 1 !== sel.c && Math.abs(x - selX) >= 24 && x > 14 && x < box.w - 14) colPills.push([k, x])
  }
  for (let k = 5; k <= map.rows; k += 5) {
    const y = rowY(k - 1)
    if (k - 1 !== sel.r && Math.abs(y - selY) >= 19 && y > 10 && y < box.h - 10) rowPills.push([k, y])
  }

  // ---- minimapa ----
  const scale = 48 / Math.max(L.innerW, L.innerH)
  const mw = L.innerW * scale
  const mh = L.innerH * scale
  const canPan = L.innerW > box.w + 1 || L.innerH > box.h + 1
  const jump = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - r.left - (60 - mw) / 2) / mw
    const fy = (e.clientY - r.top - (60 - mh) / 2) / mh
    const el = scrollRef.current
    el.scrollLeft = fx * L.innerW - box.w / 2
    el.scrollTop = fy * L.innerH - box.h / 2
  }

  const nextZoom = () => {
    const n = ZOOM_STEPS.find((v) => v > zoomRef.current + 1)
    setZoomAt(n ?? 100)
  }

  const rows = []
  for (let r = 0; r < map.rows; r++) {
    const cells = []
    for (let c = 0; c < map.cols; c++) {
      cells.push(
        <Cell key={c} cell={map.cells[`${r},${c}`]} r={r} c={c} size={L.size} on={sel.r === r && sel.c === c} />,
      )
    }
    rows.push(
      <div key={r} className="flex" style={{ gap: L.gap }}>
        {cells}
      </div>,
    )
  }

  return (
    <div
      ref={hostRef}
      onPointerDown={() => {
        touching.current = true
        hush()
      }}
      onPointerUp={() => {
        touching.current = false
        hush()
      }}
      onPointerCancel={() => {
        touching.current = false
        hush()
      }}
      className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={tap}
        className="no-scrollbar absolute inset-0 overflow-auto overscroll-contain"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div style={{ width: L.innerW, height: L.innerH }} className="flex items-center justify-center">
          <div className="flex flex-col" style={{ gap: L.gap, padding: `${PAD_T}px ${PAD_R}px ${PAD_B}px ${PAD_L}px` }} data-grid>
            {rows}
          </div>
        </div>
      </div>

      {/* números de columna y fila */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${rulers ? 'opacity-100' : 'opacity-0'}`}>
        {colPills.map(([k, x]) => (
          <span key={'c' + k} className={`${pill} bg-[#0A0B0EDD] font-medium text-ink-2`} style={{ left: x - 11, top: 4 }}>
            {k}
          </span>
        ))}
        {rowPills.map(([k, y]) => (
          <span key={'r' + k} className={`${pill} bg-[#0A0B0EDD] font-medium text-ink-2`} style={{ left: 4, top: y - 7.5 }}>
            {k}
          </span>
        ))}
        <span
          className={`${pill} bg-accent font-bold text-[#1A1305]`}
          style={{ left: Math.max(4, Math.min(box.w - 26, selX - 11)), top: 4 }}
        >
          {sel.c + 1}
        </span>
        <span
          className={`${pill} bg-accent font-bold text-[#1A1305]`}
          style={{ left: 4, top: Math.max(4, Math.min(box.h - 19, selY - 7.5)) }}
        >
          {sel.r + 1}
        </span>
      </div>

      {/* zoom */}
      <div className="absolute bottom-2.5 left-2 flex items-center gap-0.5 rounded-full border border-line bg-[#0A0B0EE6] p-1">
        <button type="button" onClick={nextZoom} aria-label="Cambiar zoom" className="px-2 font-num text-xs font-semibold">
          {zoom} %
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(100)
            const el = scrollRef.current
            el.scrollLeft = 0
            el.scrollTop = 0
          }}
          aria-label="Ver mapa completo"
          className="flex size-7 items-center justify-center rounded-full bg-surface-2"
        >
          <Minimize2 size={14} />
        </button>
      </div>

      {/* minimapa */}
      {canPan && (
        <div
          className="absolute bottom-2 right-2 size-[60px] touch-none rounded-[9px] border border-line bg-[#0A0B0EE6]"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            jump(e)
          }}
          onPointerMove={(e) => e.buttons && jump(e)}
          aria-label="Minimapa"
        >
          <div
            className="absolute rounded-[3px] bg-cell-hidden"
            style={{ left: (60 - mw) / 2, top: (60 - mh) / 2, width: mw, height: mh }}
          />
          <div
            className="absolute rounded-sm border border-accent bg-[#F5B83D26]"
            style={{
              left: (60 - mw) / 2 + scroll.x * scale,
              top: (60 - mh) / 2 + scroll.y * scale,
              width: Math.min(mw, box.w * scale),
              height: Math.min(mh, box.h * scale),
            }}
          />
        </div>
      )}
    </div>
  )
}
