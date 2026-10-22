import { useState } from 'react'
import { ChevronLeft, CloudCheck, Download, Grid3x3, Plus, Trash2 } from 'lucide-react'
import Modal, { CloseButton } from './Modal'
import { useMedia } from '../lib/useMedia'
import { mapStatus, stats } from '../lib/cells'

const STATUS = {
  running: { label: 'En curso', cls: 'bg-accent-soft text-accent' },
  done: { label: 'Completo', cls: 'bg-success-soft text-success' },
  empty: { label: 'Sin empezar', cls: 'bg-surface-2 text-ink-2' },
}

function when(ts) {
  const d = new Date(ts)
  const now = new Date()
  const hm = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86400000)
  if (diff === 0) return `Hoy, ${hm}`
  if (diff === 1) return `Ayer, ${hm}`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}

function Row({ m, current, last, onOpen, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const st = STATUS[mapStatus(m)]
  const { total } = stats(m)
  const done = mapStatus(m) === 'done'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(m.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(m.id)}
      className={`group flex cursor-pointer items-center gap-3.5 p-4 hover:bg-surface/60 ${
        last ? '' : 'border-b border-line'
      } ${current ? 'bg-[#F5B83D0A]' : ''}`}
    >
      <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-surface-2">
        <Grid3x3 size={18} className={current ? 'text-accent' : 'text-ink-2'} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{m.name}</span>
            {current && <span className="text-[11px] text-ink-3">abierto</span>}
          </div>
          <span className={`rounded-full px-2 py-[3px] text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <span className="text-xs text-ink-2">
          {m.cols}×{m.rows} · {m.mines} minas · {when(m.updatedAt)}
        </span>
        <div className="flex items-center gap-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-sm bg-surface-2">
            <div
              className={`h-full rounded-sm ${done ? 'bg-success' : 'bg-accent'}`}
              style={{ width: `${Math.min(100, (total / m.mines) * 100)}%` }}
            />
          </div>
          <span className={`font-num text-xs ${total ? 'text-ink' : 'text-ink-3'}`}>
            {total}/{m.mines}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label={confirm ? 'Confirmar borrado' : 'Borrar mapa'}
        title={confirm ? 'Pulsa otra vez para borrar' : 'Borrar mapa'}
        onClick={(e) => {
          e.stopPropagation()
          if (confirm) onDelete(m.id)
          else {
            setConfirm(true)
            setTimeout(() => setConfirm(false), 2500)
          }
        }}
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
          confirm
            ? 'bg-danger/15 text-danger'
            : 'text-ink-3 opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100'
        }`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function MapsDialog({ maps, currentId, onOpen, onDelete, onNew, onClose, onExport }) {
  const sorted = [...maps].sort((a, b) => b.updatedAt - a.updatedAt)
  const mobile = useMedia('(max-width: 767px)')
  const list = sorted.map((m, i) => (
    <Row key={m.id} m={m} current={m.id === currentId} last={i === sorted.length - 1} onOpen={onOpen} onDelete={onDelete} />
  ))

  // teléfono: página completa (diseño "Auditoría — Mis mapas")
  if (mobile) {
    return (
      <Modal onClose={onClose} label="Mis mapas" full>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Volver"
            className="flex size-[34px] items-center justify-center rounded-full border border-line bg-surface"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-[9px] text-[13px] font-medium"
          >
            <Plus size={15} />
            Nuevo mapa
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-num text-[11px] uppercase text-ink-3" style={{ letterSpacing: '1.2px' }}>
            {maps.length} {maps.length === 1 ? 'mapa guardado' : 'mapas guardados'}
          </span>
          <h2 className="text-[28px] font-semibold" style={{ letterSpacing: '-0.6px' }}>
            Mis mapas
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">{list}</div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[13px] font-medium"
          >
            <Download size={15} />
            Descargar mapas.json
          </button>
        )}
        <div className="flex items-center justify-center gap-2 pb-2 pt-1">
          <CloudCheck size={14} className="text-ink-3" />
          <span className="text-xs text-ink-3">Los cambios se guardan solos en este dispositivo</span>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} label="Mis mapas" width={560}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Mis mapas</h2>
          <p className="text-xs text-ink-2">
            {maps.length} {maps.length === 1 ? 'mapa guardado' : 'mapas guardados'} · los cambios se guardan solos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNew}
            className="flex h-[34px] items-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-3 text-[13px] font-medium hover:brightness-125"
          >
            <Plus size={14} />
            Nuevo mapa
          </button>
          <CloseButton onClick={onClose} size={34} />
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-bg">
        {list}
      </div>
    </Modal>
  )
}
