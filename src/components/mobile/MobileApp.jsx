import { useEffect, useState } from 'react'
import { AlertTriangle, FolderOpen, Plus, Save } from 'lucide-react'
import MobileBoard from './MobileBoard'
import MobileEditor from './MobileEditor'
import { RewardsSheet, RewardsSummary } from './MobileRewards'

const hhmm = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

/** Texto y color del estado de guardado (arriba del título). */
function statusOf({ dirty, savedAt, file, cloud }) {
  if (cloud.status === 'conflict') return { text: 'NUBE: CONFLICTO', tone: 'danger', go: 'cloud' }
  if (cloud.status === 'error') return { text: 'NUBE: ERROR', tone: 'danger', go: 'cloud' }
  if (dirty) return { text: 'SIN GUARDAR', tone: 'accent' }
  if (cloud.status === 'checking') return { text: 'CONECTANDO…', tone: 'muted' }
  if (cloud.status === 'signed-out') return { text: 'INICIAR SESIÓN · NUBE', tone: 'accent', go: 'cloud' }
  if (cloud.status === 'ready' || file.status === 'ready') return { text: `GUARDADO · ${hhmm(savedAt)}`, tone: 'ok' }
  if (file.status === 'needs-permission' || file.status === 'invalid' || file.status === 'error')
    return { text: 'ARCHIVO: REVISAR', tone: 'danger', go: 'file' }
  return { text: 'SOLO LOCAL', tone: 'muted' }
}

const TONE = {
  accent: ['bg-accent', 'text-accent'],
  ok: ['bg-success', 'text-ink-2'],
  danger: ['bg-danger', 'text-danger'],
  muted: ['bg-ink-3', 'text-ink-3'],
}

function Stat({ label, glyph, value, suffix }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {glyph}
        <span className="text-xs text-ink-2">{label}</span>
      </div>
      <div className="flex items-end gap-0.5">
        <span className="font-num text-[28px] font-medium leading-none short:text-2xl" style={{ letterSpacing: '-1px' }}>
          {value}
        </span>
        {suffix && <span className="pb-[5px] font-num text-sm text-ink-3">{suffix}</span>}
      </div>
    </div>
  )
}

const round = 'relative flex size-[34px] shrink-0 items-center justify-center rounded-full border border-line bg-surface'

/** Pantalla vertical (< 768 px): diseños "Mapa", "Editando casilla" y "Mina revelada (recompensa)". */
export default function MobileApp({
  map, sel, onSelect, cell, onSet, stat, savedAt, dirty, file, cloud,
  onSave, onExport, avisos, cerca, onAvisos, onFix, onCloud, onFile, onMaps, onNew,
}) {
  const [editing, setEditing] = useState(false) // false: vista del mapa con recompensas; true: hoja de edición
  const [rewardsOpen, setRewardsOpen] = useState(false)
  useEffect(() => setEditing(false), [map.id])
  const s = statusOf({ dirty, savedAt, file, cloud })
  const [dot, txt] = TONE[s.tone]
  const denom = Math.max(map.mines, 1)
  const pct = (n) => `${Math.min(100, (n / denom) * 100)}%`

  const move = (d) => {
    const i = Math.max(0, Math.min(map.rows * map.cols - 1, sel.r * map.cols + sel.c + d))
    onSelect({ r: Math.floor(i / map.cols), c: i % map.cols })
  }

  const Label = s.go ? 'button' : 'div'
  return (
    <div className="flex h-full flex-col overflow-y-auto pt-[max(env(safe-area-inset-top),8px)]">
      <div className="flex shrink-0 flex-col gap-4 px-4 pb-4 pt-1 short:gap-2.5 short:pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Label
              type={s.go ? 'button' : undefined}
              onClick={s.go ? (s.go === 'cloud' ? onCloud : onFile) : undefined}
              className="flex items-center gap-1.5 self-start"
            >
              <span className={`size-1.5 rounded-full ${dot}`} />
              <span className={`whitespace-nowrap font-num text-[11px] ${txt}`} style={{ letterSpacing: '1.2px' }}>
                {s.text.endsWith(' · NUBE') ? (
                  <>
                    {s.text.slice(0, -7)}
                    <span className="max-[379px]:hidden"> · NUBE</span>
                  </>
                ) : (
                  s.text
                )}
              </span>
            </Label>
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[28px] font-semibold leading-tight short:text-2xl" style={{ letterSpacing: '-0.6px' }}>
                {map.name}
              </h1>
              {avisos.count > 0 && (
                <button
                  type="button"
                  onClick={onAvisos}
                  aria-label={`${avisos.count} ${avisos.count === 1 ? 'aviso' : 'avisos'} de reglas`}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-danger/15 px-2 py-[3px]"
                >
                  <AlertTriangle size={12} className="text-danger" />
                  <span className="font-num text-xs font-medium text-danger">{avisos.count}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" className={round} onClick={onMaps} aria-label="Mis mapas">
              <FolderOpen size={16} />
            </button>
            <button type="button" className={round} onClick={onSave} aria-label="Guardar">
              <Save size={16} className={dirty ? 'text-accent' : 'text-ink'} />
              {dirty && <span className="absolute right-0 top-0 size-2 rounded-full border border-bg bg-accent" />}
            </button>
            <button
              type="button"
              onClick={onNew}
              aria-label="Nuevo mapa"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-[9px] text-[13px] font-medium max-[359px]:size-[34px] max-[359px]:justify-center max-[359px]:p-0"
            >
              <Plus size={15} />
              <span className="max-[359px]:hidden">Nuevo mapa</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 short:gap-2">
          <div className="flex gap-3">
            <Stat
              label="Marcadas"
              glyph={
                <span className="flex size-4 items-center justify-center rounded border border-cell-hidden-line bg-cell-hidden font-num text-[10px] font-bold text-accent">
                  x
                </span>
              }
              value={stat.x}
            />
            <Stat
              label="Reveladas"
              glyph={
                <span className="flex size-4 items-center justify-center rounded border border-cell-open-line bg-cell-open font-num text-[10px] font-bold text-accent">
                  X
                </span>
              }
              value={stat.X}
            />
            <Stat label="Total" value={stat.total} suffix={`/${map.mines}`} />
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-surface-2">
            <div className="h-full bg-accent" style={{ width: pct(stat.X) }} />
            <div className="h-full bg-accent-mid" style={{ width: pct(stat.x) }} />
          </div>
        </div>
      </div>

      <div className="flex min-h-[210px] flex-1 flex-col px-4 pb-4">
        <MobileBoard
          map={map}
          sel={sel}
          onSelect={(rc) => {
            onSelect(rc)
            setEditing(true)
          }}
          bad={avisos.cells}
          active={editing}
          onFull={() => setEditing(false)}
        />
      </div>

      {editing ? (
        <MobileEditor
          sel={sel}
          cell={cell}
          onSet={onSet}
          onErase={() => onSet(null)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          avisos={cerca}
          onGo={onSelect}
          onFix={onFix}
          onAll={onAvisos}
        />
      ) : (
        <RewardsSummary stat={stat} empty={Object.keys(map.cells).length === 0} onOpen={() => setRewardsOpen(true)} />
      )}
      {rewardsOpen && <RewardsSheet stat={stat} mapName={map.name} onClose={() => setRewardsOpen(false)} />}
    </div>
  )
}
