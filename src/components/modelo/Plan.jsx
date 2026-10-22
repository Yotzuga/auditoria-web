import { useState } from 'react'
import { Bomb, Crosshair, ListChecks, Minus, MousePointerClick, Plus, RefreshCw } from 'lucide-react'
import { windowText } from '../../lib/modelo'
import { Cta, Empty, Note, Spinner, card, rcText } from './ui'

const pct = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`)
const sp = (w) => `${w.fuera_de_rango ? '≈' : ''}${Number(w.sp_esperado).toFixed(1)}`

function Stale({ onRecalc, busy }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-mid bg-accent-soft/40 px-3.5 py-2.5">
      <span className="text-xs leading-snug text-accent">El tablero cambió desde que se calculó este plan. Recalcula para que cuente lo nuevo.</span>
      <button type="button" onClick={onRecalc} disabled={busy} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-[#1A1305] disabled:opacity-60">
        {busy ? <Spinner size={13} /> : <RefreshCw size={13} />}
        Recalcular
      </button>
    </div>
  )
}

function Umbral({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-[10px] border border-line bg-bg p-1">
      <button type="button" aria-label="Bajar el mínimo" onClick={() => onChange(Math.max(50, value - 1))} className="flex size-7 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
        <Minus size={13} />
      </button>
      <span className="min-w-[58px] text-center font-num text-xs font-medium">SP ≥ {value}</span>
      <button type="button" aria-label="Subir el mínimo" onClick={() => onChange(Math.min(100, value + 1))} className="flex size-7 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
        <Plus size={13} />
      </button>
    </div>
  )
}

/** Pestaña «Plan»: los disparos sin solapes que valen la dinamita. */
export default function Plan({ rank, stale, umbral, onUmbral, onCalc, calc, canCalc, focus, onFocus, onTab, pagoSlot }) {
  if (!rank) {
    return (
      <>
        <Empty
          icon={Crosshair}
          title="Todavía no hay plan"
          text={canCalc ? 'Calcula el plan para ver qué ventanas de 3×3 valen la dinamita.' : 'Primero corrige lo que marca Revisar; con el tablero en orden se puede calcular el plan.'}
        >
          {canCalc ? (
            <button type="button" onClick={onCalc} disabled={calc} className="mt-1 flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[#1A1305] disabled:opacity-60">
              {calc ? <Spinner /> : <Crosshair size={15} />}
              Calcular plan
            </button>
          ) : (
            <button type="button" onClick={() => onTab('Revisar')} className="mt-1 flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-4 text-[13px] font-medium hover:brightness-125">
              <ListChecks size={15} />
              Ir a Revisar
            </button>
          )}
        </Empty>
        {pagoSlot}
      </>
    )
  }
  const plan = rank.plan || []
  const porUbicar = rank.motor?.minas_por_ubicar
  const sig = rank.siguiente_fuera_del_plan
  const neto = rank.neto_plan
  const changed = umbral !== rank.umbral

  return (
    <>
      {stale && <Stale onRecalc={onCalc} busy={calc} />}
      {plan.length === 0 && porUbicar === 0 ? (
        <Empty icon={MousePointerClick} title="No quedan minas por ubicar: solo clics gratis" text="Todas las minas del mapa ya están identificadas. Abre las casillas seguras sin gastar dinamita.">
          <button type="button" onClick={() => onTab('Revisar')} className="mt-1 flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-4 text-[13px] font-medium hover:brightness-125">
            <ListChecks size={15} />
            Ver clics gratis en Revisar
          </button>
        </Empty>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold">Plan sin solapes</span>
              <span className="text-xs text-ink-3">{plan.length} {plan.length === 1 ? 'disparo' : 'disparos'}</span>
            </div>
            <Umbral value={umbral} onChange={onUmbral} />
          </div>
          {changed && (
            <button type="button" onClick={onCalc} disabled={calc} className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface-2 text-xs font-medium hover:brightness-125 disabled:opacity-60">
              {calc ? <Spinner size={13} /> : <RefreshCw size={13} />}
              Recalcular con SP ≥ {umbral}
            </button>
          )}
          {plan.length === 0 ? (
            <div className={`${card} px-4 py-6 text-center text-[13px] text-ink-2`}>Ninguna ventana alcanza SP ≥ {rank.umbral}.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_44px_44px_52px] items-center gap-x-2 px-3 text-[10px] text-ink-3">
                <span className="pl-[38px]">Disparo</span>
                <span className="text-right">SP esp</span>
                <span className="text-right">P≥70</span>
                <span className="text-right">≥3 minas</span>
              </div>
              {plan.map((w, i) => {
                const on = focus?.r === w.fila - 1 && focus?.c === w.col - 1
                return (
                  <button
                    key={`${w.fila},${w.col}`}
                    type="button"
                    onClick={() => onFocus(w, i + 1)}
                    aria-pressed={on}
                    className={`grid grid-cols-[1fr_44px_44px_52px] items-center gap-x-2 rounded-xl border px-3 py-1.5 text-left ${on ? 'border-model bg-model-soft' : 'border-transparent hover:bg-surface-2/60'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full font-num text-[11px] font-semibold ${on ? 'bg-model text-model-ink' : 'bg-model-strong text-model'}`}>{i + 1}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium">{rcText(w.fila, w.col)}</span>
                        <span className="truncate text-[11px] text-ink-3">{windowText(w.ventana)}</span>
                      </span>
                    </span>
                    <span className="text-right font-num text-base font-semibold">{Math.round(w.sp_esperado)}</span>
                    <span className="text-right font-num text-xs text-ink-2">{pct(w.p70)}</span>
                    <span className="text-right font-num text-xs text-ink-2">{pct(w.p_tres_o_mas_minas)}</span>
                  </button>
                )
              })}
            </div>
          )}
          {plan.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line pt-3.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-2">Neto esperado del plan</span>
                <span className="flex items-baseline gap-3">
                  <span className="text-xs text-ink-3">{plan.length} × 100 SP de dinamita</span>
                  <span className={`font-num text-[15px] font-semibold ${neto >= 0 ? 'text-success' : 'text-danger'}`}>{neto >= 0 ? '+' : '−'}{Math.abs(neto)} SP</span>
                </span>
              </div>
              {sig && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-2">Siguiente mejor fuera del plan</span>
                  <span className="font-num text-[13px] font-semibold">{rcText(sig.fila, sig.col)} · ~{Math.round(sig.sp_esperado)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {rank.motor?.convergio === false && (
        <Note>El muestreo no convergió del todo (R-hat {rank.motor.rhat_max}, ESS {Math.round(rank.motor.ess_min)}): trata las probabilidades con cuidado o repite el cálculo.</Note>
      )}
      {pagoSlot}
      <div className="pointer-events-none sticky -bottom-5 -mx-1 mt-auto bg-gradient-to-t from-surface from-70% to-transparent px-1 pb-5 pt-4 [&>*]:pointer-events-auto">
        <Cta icon={Bomb} onClick={() => onTab('Registrar')}>Ya disparé · registrar resultados</Cta>
      </div>
    </>
  )
}
