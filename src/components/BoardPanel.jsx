import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import CellGlyph, { cellBg, cellLine } from './CellGlyph'
import { stats } from '../lib/cells'

const BASE = 30
const GAP = 3
const PAD = 20
const ZOOMS = [40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200]

const zbtn = 'flex size-7 items-center justify-center rounded-[7px] text-ink-2 hover:bg-surface-2 hover:text-ink'

// Una casilla solo se vuelve a dibujar si cambia ella misma, su tamaño o si se (de)selecciona.
const RING = {
  safe: 'border-2 border-success',
  bad: 'border-2 border-danger',
  mine: 'border-2 border-dashed border-accent',
  win: 'border-2 border-model/80',
}

const Cell = memo(function Cell({ cell, r, c, size, zoom, on, warn, ring, badge, onSelect }) {
  return (
    <button
      type="button"
      data-rc={`${r},${c}`}
      tabIndex={-1}
      aria-label={`Fila ${r + 1} columna ${c + 1}`}
      onClick={() => onSelect({ r, c })}
      style={{
        width: size,
        height: size,
        ...(on ? { boxShadow: '0 0 12px #F5B83DAA' } : null),
      }}
      // outline-none: el botón conserva el foco tras un clic y el anillo de foco hacía ver dos casillas seleccionadas
      className={`relative flex shrink-0 items-center justify-center rounded-md outline-none focus:outline-none focus-visible:outline-none ${cellBg(cell)} ${
        on ? 'border-2 border-accent' : ring ? `${RING[ring]} hover:brightness-125` : `border ${cellLine(cell)} hover:brightness-125`
      }`}
    >
      <CellGlyph cell={cell} fs={(15 * zoom) / 100} />
      {warn && <span className="pointer-events-none absolute right-[2px] top-[2px] size-[6px] rounded-full bg-danger" />}
      {badge != null && (
        <span className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-model px-[3px] font-num text-[9px] font-bold leading-none text-model-ink">
          {badge}
        </span>
      )}
    </button>
  )
})

function Stat({ label, glyph, value, suffix }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {glyph}
        <span className="text-xs text-ink-2">{label}</span>
      </div>
      <div className="flex items-end gap-0.5">
        <span className="font-num text-[26px] font-medium leading-none" style={{ letterSpacing: '-1px' }}>
          {value}
        </span>
        {suffix && <span className="pb-1 font-num text-sm text-ink-3">{suffix}</span>}
      </div>
    </div>
  )
}

export default function BoardPanel({ map, sel, onSelect, bad, overlay, fitKey, history }) {
  const { x, X, total } = useMemo(() => stats(map), [map])
  const [zoom, setZoom] = useState(100)
  const zoneRef = useRef(null)
  const boardRef = useRef(null)

  const size = Math.round((BASE * zoom) / 100)
  const boardW = map.cols * size + (map.cols - 1) * GAP + PAD * 2
  const boardH = map.rows * size + (map.rows - 1) * GAP + PAD * 2

  const fit = useCallback(() => {
    const el = zoneRef.current
    if (!el) return
    const availW = el.clientWidth - 80
    const availH = el.clientHeight - 152
    const natW = map.cols * (BASE + GAP) - GAP + PAD * 2
    const natH = map.rows * (BASE + GAP) - GAP + PAD * 2
    const z = Math.floor(Math.min(availW / natW, availH / natH) * 100)
    const best = [...ZOOMS].reverse().find((v) => v <= z) ?? ZOOMS[0]
    setZoom(best)
  }, [map.cols, map.rows])

  // al abrir un mapa grande, ajustar al espacio disponible (sin pasar de 100 %)
  useLayoutEffect(() => {
    const el = zoneRef.current
    if (!el) return
    const natW = map.cols * (BASE + GAP) - GAP + PAD * 2
    const natH = map.rows * (BASE + GAP) - GAP + PAD * 2
    if (natW > el.clientWidth - 80 || natH > (el.clientHeight - 152) * 1.1) fit()
    else setZoom(100)
  }, [map.id, fit, map.cols, map.rows, fitKey])

  const step = (dir) => {
    const i = ZOOMS.findIndex((v) => v >= zoom)
    const cur = ZOOMS[i === -1 ? ZOOMS.length - 1 : i]
    const idx = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(cur) + dir))
    setZoom(ZOOMS[idx])
  }

  // Mantener visible la casilla seleccionada moviendo SOLO el scroll de esta zona.
  // (scrollIntoView podía desplazar también la página entera.)
  useEffect(() => {
    const zone = zoneRef.current
    const el = boardRef.current?.querySelector(`[data-rc="${sel.r},${sel.c}"]`)
    if (!zone || !el) return
    const z = zone.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const m = 28
    if (r.top < z.top + m) zone.scrollTop -= z.top + m - r.top
    else if (r.bottom > z.bottom - m) zone.scrollTop += r.bottom - (z.bottom - m)
    if (r.left < z.left + m) zone.scrollLeft -= z.left + m - r.left
    else if (r.right > z.right - m) zone.scrollLeft += r.right - (z.right - m)
  }, [sel.r, sel.c])

  const denom = Math.max(map.mines, 1)
  const pct = (n) => `${Math.min(100, (n / denom) * 100)}%`

  // posición del centro de la columna/fila k (0-index) dentro del tablero
  const center = (k) => PAD + k * (size + GAP) + size / 2

  const marks = []
  for (const k of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
    if (k <= map.cols) {
      const cx = center(k - 1)
      marks.push(['t' + k, cx, PAD / 2], ['b' + k, cx, boardH - PAD / 2])
    }
    if (k <= map.rows) {
      const cy = center(k - 1)
      marks.push(['l' + k, PAD / 2, cy], ['r' + k, boardW - PAD / 2, cy])
    }
  }
  const selX = center(sel.c)
  const selY = center(sel.r)

  // lo que resalta el panel Modelo: anillos (seguras, minas deducidas, inconsistencias), números del plan y la ventana elegida
  const win = useMemo(() => new Set(overlay?.win || []), [overlay])

  const rows = []
  for (let r = 0; r < map.rows; r++) {
    const cells = []
    for (let c = 0; c < map.cols; c++) {
      cells.push(
        <Cell
          key={c}
          cell={map.cells[`${r},${c}`]}
          r={r}
          c={c}
          size={size}
          zoom={zoom}
          on={sel.r === r && sel.c === c}
          warn={bad ? bad.has(`${r},${c}`) : false}
          ring={overlay?.rings?.[`${r},${c}`] || (win.has(`${r},${c}`) ? 'win' : undefined)}
          badge={overlay?.badges?.[`${r},${c}`]}
          onSelect={onSelect}
        />,
      )
    }
    rows.push(
      <div key={r} className="flex" style={{ gap: GAP }}>
        {cells}
      </div>,
    )
  }

  return (
    <div
      ref={zoneRef}
      className="flex min-h-0 flex-1 justify-center overflow-auto px-10 pb-9 pt-7 max-lg:flex-none max-lg:justify-start max-lg:overflow-x-auto max-lg:overflow-y-visible max-lg:px-4 max-lg:pb-6 max-lg:pt-5"
    >
      <div className="flex flex-col gap-4" style={{ width: Math.max(boardW + 2, 520), minWidth: 'min-content' }}>
        <div className="flex items-end justify-between">
          <div className="flex gap-9">
            <Stat
              label="Marcadas"
              glyph={
                <span className="flex size-4 items-center justify-center rounded-[4px] border border-cell-hidden-line bg-cell-hidden font-num text-[10px] font-bold text-accent">
                  x
                </span>
              }
              value={x}
            />
            <Stat
              label="Reveladas"
              glyph={
                <span className="flex size-4 items-center justify-center rounded-[4px] border border-cell-open-line bg-cell-open font-num text-[10px] font-bold text-accent">
                  X
                </span>
              }
              value={X}
            />
            <Stat label="Total" value={total} suffix={`/${map.mines}`} />
          </div>
          <div className="flex items-center gap-2">
          {history && (
            <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]">
              <button
                type="button"
                className={`${zbtn} disabled:pointer-events-none disabled:opacity-35`}
                aria-label="Deshacer"
                title="Deshacer (Ctrl Z)"
                disabled={!history.canUndo}
                onClick={history.onUndo}
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                className={`${zbtn} disabled:pointer-events-none disabled:opacity-35`}
                aria-label="Rehacer"
                title="Rehacer (Ctrl Y)"
                disabled={!history.canRedo}
                onClick={history.onRedo}
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]">
            <button type="button" className={zbtn} aria-label="Alejar" onClick={() => step(-1)}>
              <Minus size={14} />
            </button>
            <span className="px-1.5 font-num text-xs font-medium">{zoom} %</span>
            <button type="button" className={zbtn} aria-label="Acercar" onClick={() => step(1)}>
              <Plus size={14} />
            </button>
            <button type="button" className={zbtn} aria-label="Ajustar" onClick={fit}>
              <Maximize size={14} />
            </button>
          </div>
          </div>
        </div>

        <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-surface-2">
          <div className="h-full bg-accent" style={{ width: pct(X) }} />
          <div className="h-full bg-accent-mid" style={{ width: pct(x) }} />
        </div>

        <div
          ref={boardRef}
          className="relative flex flex-col self-start rounded-[18px] border border-line bg-surface"
          style={{ gap: GAP, padding: PAD, width: boardW + 2, height: boardH + 2 }}
        >
          {rows}
          {marks.map(([k, mx, my]) => (
            <span
              key={k}
              className="pointer-events-none absolute size-1 rounded-full bg-ink-3"
              style={{ left: mx - 2, top: my - 2 }}
            />
          ))}
          {[
            [selX, PAD / 2, sel.c + 1],
            [selX, boardH - PAD / 2, sel.c + 1],
            [PAD / 2, selY, sel.r + 1],
            [boardW - PAD / 2, selY, sel.r + 1],
          ].map(([mx, my, n], i) => (
            <span
              key={i}
              className="pointer-events-none absolute flex h-3.5 min-w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded px-1 font-num text-[10px] font-bold leading-none text-[#1A1305] bg-accent"
              style={{ left: mx, top: my }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
