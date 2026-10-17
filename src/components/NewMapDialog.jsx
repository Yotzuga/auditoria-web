import { useState } from 'react'
import { Minus, Pencil, Plus, Save } from 'lucide-react'
import Modal, { CloseButton } from './Modal'

const MIN_SIDE = 5
const MAX_SIDE = 60

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

function Stepper({ value, onChange, min, max }) {
  return (
    <div className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-surface-2 p-1">
      <button
        type="button"
        aria-label="Menos"
        onClick={() => onChange(clamp(value - 1, min, max))}
        className="flex size-10 items-center justify-center rounded-[9px] bg-surface text-ink hover:brightness-125"
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) onChange(clamp(n, min, max))
        }}
        className="w-full min-w-0 bg-transparent text-center font-num text-[17px] font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Más"
        onClick={() => onChange(clamp(value + 1, min, max))}
        className="flex size-10 items-center justify-center rounded-[9px] bg-surface text-ink hover:brightness-125"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

export default function NewMapDialog({ defaults, currentName, onCreate, onClose }) {
  const [name, setName] = useState(defaults.name)
  const [cols, setCols] = useState(clamp(defaults.cols, MIN_SIDE, MAX_SIDE))
  const [rows, setRows] = useState(clamp(defaults.rows, MIN_SIDE, MAX_SIDE))
  const [mines, setMines] = useState(defaults.mines)
  const [touched, setTouched] = useState(false)

  const cells = cols * rows
  const maxMines = cells - 1
  const density = Math.round((mines / cells) * 100)

  // si no tocaste las minas, se mantiene la densidad al cambiar el tamaño
  const resize = (nc, nr) => {
    if (!touched) setMines(clamp(Math.round((mines / cells) * nc * nr), 1, nc * nr - 1))
    else setMines((m) => clamp(m, 1, nc * nr - 1))
    setCols(nc)
    setRows(nr)
  }

  const submit = (e) => {
    e.preventDefault()
    onCreate({
      name: name.trim() || defaults.name,
      cols,
      rows,
      mines: clamp(mines, 1, maxMines),
    })
  }

  return (
    <Modal onClose={onClose} label="Nuevo mapa" width={440}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-[22px]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Nuevo mapa</h2>
            <p className="text-[13px] text-ink-2">Elige el tamaño y cuántas minas tiene</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-ink-2">Nombre</span>
          <span className="flex h-12 items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 focus-within:border-accent-mid">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none"
              autoFocus
              spellCheck={false}
              onFocus={(e) => e.target.select()}
            />
            <Pencil size={15} className="text-ink-3" />
          </span>
        </label>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">Tamaño</span>
            <span className="font-num text-xs text-ink-3">{cells} casillas</span>
          </div>
          <div className="flex items-end gap-2.5">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-[11px] text-ink-3">Columnas</span>
              <Stepper value={cols} min={MIN_SIDE} max={MAX_SIDE} onChange={(v) => resize(v, rows)} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-[11px] text-ink-3">Filas</span>
              <Stepper value={rows} min={MIN_SIDE} max={MAX_SIDE} onChange={(v) => resize(cols, v)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">Minas</span>
            <span className="font-num text-xs text-ink-3">{density} % del mapa</span>
          </div>
          <Stepper
            value={mines}
            min={1}
            max={maxMines}
            onChange={(v) => {
              setTouched(true)
              setMines(v)
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-success-soft px-3.5 py-3">
          <Save size={16} className="shrink-0 text-success" />
          <p className="text-xs text-ink-2">
            {currentName} se guardará antes de crear el nuevo. Podrás retomarlo desde Mis mapas.
          </p>
        </div>

        <button
          type="submit"
          className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-accent text-[15px] font-semibold text-[#1A1305] hover:brightness-110"
        >
          <Plus size={17} />
          Crear mapa
        </button>
      </form>
    </Modal>
  )
}
