import { useEffect } from 'react'
import { ChevronRight, Pointer, Sparkles, X } from 'lucide-react'
import { REWARDS } from '../../lib/rewards'

/** Resumen de recompensas + ayuda (diseño "Web vertical — Teléfono · Mapa"). Se muestra mientras no se edita una casilla. */
export function RewardsSummary({ stat, empty, onOpen }) {
  const { rewards, rewardTotal } = stat
  return (
    <div className="flex shrink-0 flex-col gap-3.5 px-4 pb-3 short:gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">Recompensas</span>
        <button type="button" onClick={onOpen} className="flex items-center gap-1 text-[13px] text-ink-2 active:text-ink" aria-label="Ver recompensas">
          {rewardTotal} en total
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="flex h-1.5 gap-0.5">
        {rewardTotal === 0 ? (
          <div className="h-full flex-1 rounded-[3px] bg-surface-2" />
        ) : (
          REWARDS.filter((r) => rewards[r.id] > 0).map((r) => (
            <div key={r.id} className="h-full rounded-[3px]" style={{ flexGrow: rewards[r.id], flexBasis: 0, background: r.color }} />
          ))
        )}
      </div>
      <div className="flex gap-2">
        {REWARDS.map((r) => (
          <div key={r.id} className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-[5px]">
              <span className="size-1.5 rounded-full" style={{ background: r.color }} />
              <span className="text-[11px] text-ink-2">{r.name}</span>
            </div>
            <span className="font-num text-lg font-medium leading-none">{rewards[r.id]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 pb-1 pt-2 short:pt-0">
        <Pointer size={14} className="text-ink-3" />
        <span className="text-[13px] text-ink-3">{empty ? 'Toca una casilla para empezar a rellenar' : 'Toca el mapa para acercar y editar'}</span>
      </div>
    </div>
  )
}

/** Hoja inferior con el detalle de recompensas (diseño "Auditoría — Recompensas"). */
export function RewardsSheet({ stat, mapName, onClose }) {
  const { rewards, rewardTotal } = stat

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recompensas"
        className="flex max-h-[92dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-3xl border border-b-0 border-line bg-surface px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2.5"
      >
        <div className="flex justify-center">
          <span className="h-[5px] w-9 rounded-[3px] bg-[#2E323B]" />
        </div>
        <div className="flex items-end justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-num text-[11px] uppercase text-ink-3" style={{ letterSpacing: '1.5px' }}>
              {mapName}
            </span>
            <h2 className="text-[22px] font-semibold" style={{ letterSpacing: '-0.4px' }}>
              Recompensas
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink-2">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col">
          {REWARDS.map((r, i) => {
            const Icon = r.icon
            const n = rewards[r.id]
            return (
              <div key={r.id} className={`flex items-center gap-3.5 py-3 ${i < REWARDS.length - 1 ? 'border-b border-line' : ''}`}>
                <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px]" style={{ background: r.color + '1F' }}>
                  <Icon size={18} style={{ color: r.color }} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                  <span className="text-[15px] font-medium">{r.name}</span>
                  <div className="h-1 overflow-hidden rounded-sm bg-surface-2">
                    <div className="h-full rounded-sm" style={{ width: rewardTotal ? `${(n / rewardTotal) * 100}%` : 0, background: r.color }} />
                  </div>
                </div>
                <span className="font-num text-xl font-medium">{n}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between rounded-[14px] bg-accent-soft px-4 py-3.5">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-accent">
            <Sparkles size={16} />
            Total
          </span>
          <span className="font-num text-[22px] font-semibold text-accent">{rewardTotal}</span>
        </div>
      </div>
    </div>
  )
}
