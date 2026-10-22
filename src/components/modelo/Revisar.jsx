import { ArrowRight, Check, CircleDashed, Crosshair, Info, Lock, MousePointerClick, X } from 'lucide-react'
import CellGlyph from '../CellGlyph'
import { Cta, Note, card, rcText } from './ui'

function Mini({ cell, n, label }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {cell ? (
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md border border-cell-hidden-line bg-cell-hidden">
            <CellGlyph cell={cell} fs={12} />
          </span>
        ) : (
          <span className="size-[22px] shrink-0 rounded-md border border-cell-hidden-line bg-cell-hidden" />
        )}
        <span className="font-num text-[17px] font-medium">{n}</span>
      </div>
      <span className="truncate text-[11px] text-ink-3">{label}</span>
    </div>
  )
}

function Found({ c }) {
  const denom = Math.max(c.total, 1)
  return (
    <div className={`${card} flex flex-col gap-4 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-2">Minas encontradas</span>
          <div className="flex items-end gap-1">
            <span className="font-num text-[32px] font-medium leading-none" style={{ letterSpacing: '-1px' }}>{c.encontradas}</span>
            <span className="pb-1 font-num text-sm text-ink-3">/{c.total}</span>
          </div>
        </div>
        <span className="rounded-md bg-surface-2 px-3 py-1.5 font-num text-xs font-semibold">
          {c.faltan > 0 ? `Faltan ${c.faltan}` : c.faltan === 0 ? 'Completo' : `Sobran ${-c.faltan}`}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-surface-2">
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, (c.reveladas / denom) * 100)}%` }} />
        <div className="h-full bg-accent-mid" style={{ width: `${Math.min(100, (c.identificadas / denom) * 100)}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className="flex size-[22px] items-center justify-center rounded-md border border-cell-hidden-line bg-cell-hidden font-num text-[11px] font-bold text-accent">x</span>
          <span className="text-ink-2">Identificadas</span>
          <span className="font-num font-semibold">{c.identificadas}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="flex size-[22px] items-center justify-center rounded-md border border-cell-open-line bg-cell-open font-num text-[11px] font-bold text-accent">X</span>
          <span className="text-ink-2">Reveladas</span>
          <span className="font-num font-semibold">{c.reveladas}</span>
        </span>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-3.5">
        <span className="text-xs text-ink-2">Casillas sin revelar</span>
        <div className="grid grid-cols-5 gap-2">
          <Mini n={c.sin_explorar} label="Sin explorar" />
          <Mini cell={{ t: 'O' }} n={c.posible_mina} label="Posible mina" />
          <Mini cell={{ t: 'hash' }} n={c.numero_seguro} label="Nº seguro" />
          <Mini cell={{ t: 'red' }} n={c.sin_certeza} label="Sin certeza" />
          <Mini cell={{ t: 'dash' }} n={c.posible_numero} label="Posible nº" />
        </div>
      </div>
    </div>
  )
}

function Inconsistencias({ list, onGo }) {
  if (!list.length) {
    return (
      <div className={`${card} flex items-center gap-3.5 p-4`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft">
          <Check size={16} className="text-success" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Sin inconsistencias</span>
          <span className="text-[13px] text-ink-2">Todos los números cuadran con las minas marcadas.</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-danger/40 bg-danger/[0.07] p-4">
      <div className="flex items-center gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/15">
          <X size={16} className="text-danger" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{list.length} {list.length === 1 ? 'inconsistencia' : 'inconsistencias'}</span>
          <span className="text-[13px] text-ink-2">Corrígelas en el tablero antes de calcular el plan.</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 pl-0 sm:pl-[50px]">
        {list.map((it, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-num text-xs font-semibold text-danger">{rcText(it.fila, it.col)}</span>
              <button type="button" onClick={() => onGo({ r: it.fila - 1, c: it.col - 1 })} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                Ir a la casilla <ArrowRight size={12} />
              </button>
            </div>
            <span className="text-[13px] leading-snug">{it.texto}</span>
            {it.explicacion && <span className="text-xs leading-snug text-ink-3">{it.explicacion}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Factible({ d, blocked }) {
  const c = d.conteos
  if (blocked) {
    return (
      <div className={`${card} flex items-center gap-3.5 p-4`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <CircleDashed size={16} className="text-ink-3" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink-2">Sin comprobar</span>
          <span className="text-[13px] text-ink-2">Se comprueba cuando no haya inconsistencias.</span>
        </div>
      </div>
    )
  }
  const tone = d.factible === true ? 'ok' : d.factible === false ? 'bad' : 'warn'
  const head = {
    ok: ['Factible', `Hay al menos una forma de ubicar ${c.faltan === 1 ? 'la mina que falta' : `las ${c.faltan} minas que faltan`}.`],
    bad: ['No factible', 'No hay forma de ubicar las minas que faltan con lo que hay en el tablero. Revisa los números.'],
    warn: ['Factibilidad sin decidir', 'El tablero está muy abierto para comprobarlo entero.'],
  }[tone]
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border p-4 ${tone === 'bad' ? 'border-danger/40 bg-danger/[0.07]' : tone === 'warn' ? 'border-accent-mid bg-accent-soft/30' : 'border-line bg-bg'}`}>
      <div className="flex items-center gap-3.5">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone === 'ok' ? 'bg-success-soft' : tone === 'bad' ? 'bg-danger/15' : 'bg-accent-soft'}`}>
          {tone === 'ok' ? <Check size={16} className="text-success" /> : tone === 'bad' ? <X size={16} className="text-danger" /> : <Info size={16} className="text-accent" />}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{head[0]}</span>
          <span className="text-[13px] text-ink-2">{head[1]}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:pl-[50px]">
        {[
          [d.por_decidir, 'Por decidir'],
          [d.casillas_seguras?.length ?? 0, 'Clics gratis'],
          [c.faltan, 'Por ubicar'],
        ].map(([v, l]) => (
          <div key={l} className="flex flex-col gap-1">
            <span className="font-num text-[17px] font-medium">{v ?? '—'}</span>
            <span className="text-xs text-ink-3">{l}</span>
          </div>
        ))}
      </div>
      <div className="sm:pl-[50px]">
        <Note>En zonas grandes solo se marcan como seguras las casillas que se pueden demostrar.</Note>
      </div>
    </div>
  )
}

function Cells({ title, hint, cells, tone, onGo, icon: Icon }) {
  if (!cells?.length) return null
  const t = tone === 'ok' ? 'border-success text-success hover:bg-success-soft' : 'border-accent text-accent hover:bg-accent-soft'
  return (
    <div className={`${card} flex flex-col gap-3 p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}{hint && <span className="font-normal text-ink-2"> · {hint}</span>}</span>
        <span className={`font-num text-sm ${tone === 'ok' ? 'text-success' : 'text-accent'}`}>{cells.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {cells.map((c) => (
          <button
            key={`${c.fila},${c.col}`}
            type="button"
            onClick={() => onGo({ r: c.fila - 1, c: c.col - 1 })}
            className={`flex h-8 items-center gap-2 rounded-md border px-2.5 text-left font-num text-xs ${t}`}
          >
            <Icon size={13} />
            {rcText(c.fila, c.col)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Pestaña «Revisar». `onPlan` calcula el plan; se bloquea con inconsistencias. */
export default function Revisar({ d, onGo, onPlan, planning }) {
  if (!d) return null
  const bad = d.inconsistencias || []
  const blocked = bad.length > 0
  const noFeas = d.factible === false
  return (
    <>
      <Found c={d.conteos} />
      <Inconsistencias list={bad} onGo={onGo} />
      <Factible d={d} blocked={blocked} />
      <Cells title="Casillas seguras" hint="clic gratis" cells={d.casillas_seguras} tone="ok" onGo={onGo} icon={MousePointerClick} />
      <Cells title="Minas deducidas" hint="ponles x" cells={d.minas_seguras} tone="accent" onGo={onGo} icon={Crosshair} />
      {d.blancos_no_cero?.length > 0 && (
        <div className={`${card} flex flex-col gap-3 p-4`}>
          <span className="text-sm font-semibold">Blancos que no pueden ser cero <span className="font-num text-ink-2">{d.blancos_no_cero.length}</span></span>
          <div className="flex flex-wrap gap-1.5">
            {d.blancos_no_cero.map((c) => (
              <button
                key={`${c.fila},${c.col}`}
                type="button"
                onClick={() => onGo({ r: c.fila - 1, c: c.col - 1 })}
                className="rounded-md border border-line bg-surface-2 px-2 py-1 font-num text-[11px] hover:brightness-125"
              >
                {rcText(c.fila, c.col)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="pointer-events-none sticky -bottom-5 -mx-1 mt-auto bg-gradient-to-t from-surface from-70% to-transparent px-1 pb-5 pt-4 [&>*]:pointer-events-auto">
        {blocked || noFeas ? (
          <Cta icon={Lock} disabled>
            {blocked ? `Corrige ${bad.length} ${bad.length === 1 ? 'inconsistencia' : 'inconsistencias'} para calcular el plan` : 'El tablero no es factible: no se puede calcular'}
          </Cta>
        ) : (
          <Cta icon={Crosshair} onClick={onPlan} busy={planning}>
            Todo en orden · calcular plan
          </Cta>
        )}
      </div>
    </>
  )
}
