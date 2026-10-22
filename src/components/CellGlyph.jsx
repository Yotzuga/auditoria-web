import { NUM_COLORS } from '../lib/cells'

/** Fondo de una casilla según su tipo (clases Tailwind). */
export function cellBg(cell) {
  if (!cell) return 'bg-cell-hidden'
  if (cell.t === 'zero' || cell.t === 'num' || cell.t === 'X') return 'bg-cell-open'
  return 'bg-cell-hidden'
}

/** Color del borde de 1 px según el fondo (`bg-cell-open` / `bg-cell-hidden`). */
export const LINE = {
  'bg-cell-open': 'border-cell-open-line',
  'bg-cell-hidden': 'border-cell-hidden-line',
}

/** Borde de 1 px de una casilla según su tipo. */
export function cellLine(cell) {
  return LINE[cellBg(cell)]
}

/** Símbolo dibujado dentro de una casilla. `fs` = tamaño de fuente en px. */
export default function CellGlyph({ cell, fs = 15 }) {
  if (!cell) return null
  const base = 'font-num font-bold leading-none select-none'
  const style = (color) => ({ fontSize: fs, color })

  switch (cell.t) {
    case 'x':
      return <span className={base} style={style('var(--color-accent)')}>x</span>
    case 'X':
      return <span className={base} style={style('var(--color-accent)')}>X</span>
    case 'O': {
      const d = Math.round((fs * 13) / 15)
      return (
        <span
          className="rounded-full border-2 border-accent"
          style={{ width: d, height: d }}
        />
      )
    }
    case 'dash':
      return <span className={base} style={style('var(--color-dash-light)')}>–</span>
    case 'red':
      return <span className={base} style={style('var(--color-danger)')}>–</span>
    case 'zero':
      return <span className={base} style={style('var(--color-ink-3)')}>–</span>
    case 'hash':
      return <span className={base} style={style('var(--color-hash)')}>#</span>
    case 'num':
    case 'known':
      return <span className={base} style={style(NUM_COLORS[cell.v])}>{cell.v}</span>
    default:
      return null
  }
}
