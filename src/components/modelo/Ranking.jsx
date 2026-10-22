import { Bomb, Crosshair, Info } from 'lucide-react'
import { Cta, Empty, card, rcText } from './ui'

const pct = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`)

/** Pestaña «Ranking»: las mejores ventanas con su SP esperado (≈ = extrapolado fuera del rango de tus datos). */
export default function Ranking({ rank, focus, onFocus, onTab, pagoSlot, modelo }) {
  if (!rank) {
    return (
      <>
        <Empty icon={Crosshair} title="Todavía no hay ranking" text="Se genera al calcular el plan.">
          <button type="button" onClick={() => onTab('Plan')} className="mt-1 flex h-10 items-center rounded-[10px] border border-line bg-surface-2 px-4 text-[13px] font-medium hover:brightness-125">
            Ir a Plan
          </button>
        </Empty>
        {pagoSlot}
      </>
    )
  }
  const top = rank.top || []
  const out = top.some((w) => w.fuera_de_rango)
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold">Mejores ventanas</span>
          <span className="text-xs text-ink-3">top {top.length}</span>
        </div>
        <span className="text-[11px] text-ink-3">Toca una fila para verla en el mapa</span>
      </div>
      <div className="flex flex-col">
        <div className="grid grid-cols-[22px_1fr_70px_36px_40px_40px_44px] items-center gap-x-2 border-b border-line px-3 pb-1.5 text-[10px] text-ink-3">
          <span />
          <span>Clic</span>
          <span className="text-right">SP esp</span>
          <span className="text-right">P≥70</span>
          <span className="text-right">P≥100</span>
          <span className="text-right">Minas</span>
          <span className="text-right">S esp</span>
        </div>
        {top.map((w, i) => {
          const on = focus?.r === w.fila - 1 && focus?.c === w.col - 1
          return (
            <button
              key={`${w.fila},${w.col}`}
              type="button"
              onClick={() => onFocus(w, null)}
              aria-pressed={on}
              className={`grid grid-cols-[22px_1fr_70px_36px_40px_40px_44px] items-center gap-x-2 rounded-xl border px-3 py-2 text-left ${on ? 'border-model bg-model-soft' : 'border-transparent hover:bg-surface-2/60'}`}
            >
              <span className={`flex size-[18px] items-center justify-center rounded-full font-num text-[10px] ${on ? 'bg-model text-model-ink' : 'text-ink-3'}`}>{i + 1}</span>
              <span className="truncate text-[13px]">{rcText(w.fila, w.col)}</span>
              <span className="text-right font-num text-[13px] font-semibold">
                {w.fuera_de_rango ? '≈' : ''}{Number(w.sp_esperado).toFixed(1)}
                <span className="pl-0.5 text-[9px] font-normal text-ink-3">±{Number(w.margen95).toFixed(1)}</span>
              </span>
              <span className="text-right font-num text-xs text-ink-2">{pct(w.p70)}</span>
              <span className="text-right font-num text-xs text-ink-2">{pct(w.p100)}</span>
              <span className="text-right font-num text-xs text-ink-2">{Number(w.minas_esperadas).toFixed(2)}</span>
              <span className="text-right font-num text-xs text-ink-2">{Number(w.s_esperado).toFixed(1)}</span>
            </button>
          )
        })}
      </div>
      {out && modelo?.s_min != null && (
        <div className={`${card} flex items-start gap-2 px-3.5 py-3 text-xs leading-relaxed text-ink-3`}>
          <Info size={13} className="mt-[2px] shrink-0" />
          <span>
            S esperado fuera del rango de tus datos ({modelo.s_min}–{modelo.s_max}): SP extrapolado en las filas marcadas con ≈.
          </span>
        </div>
      )}
      {pagoSlot}
      <div className="pointer-events-none sticky -bottom-5 -mx-1 mt-auto bg-gradient-to-t from-surface from-70% to-transparent px-1 pb-5 pt-4 [&>*]:pointer-events-auto">
        <Cta icon={Bomb} onClick={() => onTab('Registrar')}>Ya disparé · registrar resultados</Cta>
      </div>
    </>
  )
}
