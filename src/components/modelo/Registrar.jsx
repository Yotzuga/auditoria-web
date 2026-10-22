import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, Ban, Camera, CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleMinus, CircleX, CopyCheck, History, Info, Pencil,
  Plus, ScanSearch, Save, TriangleAlert, Undo2, X,
} from 'lucide-react'
import { hhmm } from '../../lib/modelo'
import { Cta, Spinner, card, rcText } from './ui'
import { formula } from './Pago'

export const emptyReg = () => ({ sp: {}, skip: {}, extra: [], seen: {}, results: {}, summary: null, error: null, nextId: 1 })

const keyP = (w) => `p${w.fila},${w.col}`
const keyD = (d) => `d${d.foto}|${d.fila},${d.col}`
const spNum = (s) => (/^\d{1,6}$/.test(String(s ?? '').trim()) ? Number(s) : null)

function SpBox({ value, onChange, disabled, ok, warn }) {
  return (
    <label
      className={`flex h-[42px] w-[78px] shrink-0 items-center justify-end gap-1.5 rounded-[10px] border bg-bg px-2.5 ${
        disabled ? 'border-line opacity-45' : warn ? 'border-accent' : 'border-line focus-within:border-accent-mid'
      }`}
    >
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={disabled}
        inputMode="numeric"
        placeholder="—"
        aria-label="SP real"
        className={`w-full min-w-0 bg-transparent text-right font-num text-[15px] font-semibold outline-none placeholder:text-ink-3 ${ok ? '' : ''}`}
      />
      <span className="font-num text-[10px] text-ink-3">SP</span>
    </label>
  )
}

function StateIcon({ kind }) {
  const p = { size: 20, strokeWidth: 1.75 }
  switch (kind) {
    case 'saved': return <CircleCheck {...p} className="text-success" />
    case 'dup': return <CopyCheck {...p} className="text-ink-2" />
    case 'warn': return <TriangleAlert {...p} className="text-accent" />
    case 'skip': return <CircleMinus {...p} className="text-ink-3" />
    case 'ready': return <CircleDot {...p} className="text-model" />
    case 'noS': return <CircleCheck {...p} className="text-ink-2" />
    case 'bad': return <CircleX {...p} className="text-danger" />
    default: return <CircleDashed {...p} className="text-ink-3" />
  }
}

const Tag = ({ children, tone = '' }) => (
  <span className={`rounded-md px-2 py-[3px] font-num text-[10px] ${tone || 'bg-surface-2 text-ink-2'}`}>{children}</span>
)

function Chips({ r }) {
  if (!r || r.sin_actualizar?.length) return null
  const diff = r.sp_esperado != null ? r.sp - r.sp_esperado : null
  return (
    <div className="flex flex-wrap gap-1.5 pt-1.5">
      <Tag>S {r.S}</Tag>
      <Tag>{r.casillas_nuevas} casillas nuevas</Tag>
      {r.minas_nuevas > 0 && <Tag>{r.minas_nuevas} {r.minas_nuevas === 1 ? 'mina' : 'minas'}</Tag>}
      {diff != null ? (
        <Tag tone={diff >= 0 ? 'bg-success-soft text-success' : 'bg-danger/15 text-danger'}>
          {diff >= 0 ? '+' : '−'}{Math.abs(Math.round(diff))} vs esperado
        </Tag>
      ) : (
        <Tag>sin plan guardado</Tag>
      )}
    </div>
  )
}

function Warn({ r, onGo }) {
  const list = r.sin_actualizar || []
  const names = list.map((c) => rcText(c.fila, c.col))
  const first = list[0]
  return (
    <div className="flex flex-col gap-1.5 pt-1.5 text-xs leading-snug text-accent">
      <span className="flex items-start gap-1.5">
        <TriangleAlert size={13} className="mt-px shrink-0" />
        <span>
          {list.length} {list.length === 1 ? 'casilla nueva sin número' : 'casillas nuevas sin número'}: {names.slice(0, 4).join(', ')}
          {names.length > 4 ? '…' : ''}. Actualízalas en el tablero y vuelve a registrar.
        </span>
      </span>
      {first && (
        <button type="button" onClick={() => onGo({ r: first.fila - 1, c: first.col - 1 })} className="flex w-fit items-center gap-1 pl-5 font-semibold hover:underline">
          Ir a {rcText(first.fila, first.col)} <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

function kindOf(res, sp, skipped) {
  if (skipped) return 'skip'
  if (res) {
    if (res.sin_actualizar?.length) return 'warn'
    if (res.duplicado) return 'dup'
    if (res.guardado) return res.sirve_para_modelo ? 'saved' : 'noS'
    return 'bad'
  }
  return sp != null ? 'ready' : 'idle'
}

function PlanRow({ w, i, reg, setReg, onGo }) {
  const k = keyP(w)
  const skipped = !!reg.skip[k]
  const res = reg.results[k]
  const kind = kindOf(res, spNum(reg.sp[k]), skipped)
  const locked = skipped || kind === 'saved' || kind === 'dup' || kind === 'noS'
  const num = kind === 'saved' ? 'bg-success text-[#052e16]' : kind === 'warn' ? 'bg-accent text-[#1A1305]' : skipped ? 'bg-model-strong text-ink-3' : 'bg-model text-model-ink'
  return (
    <div className={`flex flex-col rounded-xl px-3 py-2.5 ${kind === 'warn' ? 'border border-accent-mid bg-accent-soft/25' : 'border border-transparent'}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full font-num text-[11px] font-semibold ${num}`}>{i + 1}</span>
        <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${skipped ? 'opacity-50' : ''}`}>
          <span className="truncate text-sm font-medium">{rcText(w.fila, w.col)}</span>
          <span className="truncate text-xs text-ink-3">
            {skipped ? 'No disparada · se ignora' : res?.guardado ? `Guardado · esperado ${Math.round(w.sp_esperado)} SP` : res?.duplicado ? `Ya registrado · esperado ${Math.round(w.sp_esperado)} SP` : kind === 'warn' ? `No se guardó · esperado ${Math.round(w.sp_esperado)} SP` : `Esperado ${Math.round(w.sp_esperado)} SP`}
          </span>
        </div>
        {skipped ? (
          <button type="button" onClick={() => setReg((r) => ({ ...r, skip: { ...r.skip, [k]: false } }))} className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
            <Undo2 size={13} /> Deshacer
          </button>
        ) : !locked ? (
          <button type="button" onClick={() => setReg((r) => ({ ...r, skip: { ...r.skip, [k]: true } }))} className="flex shrink-0 items-center gap-1 text-xs text-ink-3 hover:text-ink-2">
            <Ban size={13} /> No disparé
          </button>
        ) : null}
        <SpBox value={reg.sp[k]} disabled={locked} warn={kind === 'warn'} onChange={(v) => setReg((r) => ({ ...r, sp: { ...r.sp, [k]: v }, results: { ...r.results, [k]: kind === 'warn' ? undefined : r.results[k] } }))} />
        <StateIcon kind={kind} />
      </div>
      {res && (kind === 'warn' ? <div className="pl-9"><Warn r={res} onGo={onGo} /></div> : <div className="pl-9"><Chips r={res} /></div>)}
    </div>
  )
}

function DetectedRow({ d, n, reg, setReg, onGo }) {
  const k = keyD(d)
  const res = reg.results[k]
  const sp = spNum(reg.sp[k])
  const kind = kindOf(res, sp, false)
  const locked = kind === 'saved' || kind === 'dup' || kind === 'noS'
  const sZero = d.S === 0
  return (
    <div className={`flex flex-col rounded-xl border px-3 py-2.5 ${kind === 'warn' ? 'border-accent-mid bg-accent-soft/25' : 'border-model/30 bg-model-soft'}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-model font-num text-[9px] font-semibold text-model">D{n}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="whitespace-nowrap text-sm font-medium">{rcText(d.fila, d.col)}</span>
            <span className="rounded-md bg-model-strong px-1.5 py-[2px] text-[10px] font-medium text-model">Detectado en el mapa</span>
          </div>
          <span className="text-xs text-ink-3">
            S {d.S} · {d.casillas_nuevas} casillas nuevas{d.minas_nuevas ? ` · ${d.minas_nuevas} ${d.minas_nuevas === 1 ? 'mina' : 'minas'}` : ''}
          </span>
        </div>
        <SpBox value={reg.sp[k]} disabled={locked} warn={kind === 'warn'} onChange={(v) => setReg((r) => ({ ...r, sp: { ...r.sp, [k]: v }, results: { ...r.results, [k]: kind === 'warn' ? undefined : r.results[k] } }))} />
        <StateIcon kind={kind} />
      </div>
      {res && (kind === 'warn' ? <div className="pl-9"><Warn r={res} onGo={onGo} /></div> : null)}
      {res?.solapado_con?.length > 0 && (
        <p className="flex items-start gap-1.5 pl-9 pt-1.5 text-xs text-ink-3">
          <Info size={13} className="mt-px shrink-0" />
          Ventana solapada con {res.solapado_con.map((c) => rcText(c.fila, c.col)).join(', ')}: se guarda, pero no ajusta el modelo.
        </p>
      )}
      {!res?.solapado_con?.length && (sZero || (res && !res.sirve_para_modelo && res.guardado)) && (
        <p className="flex items-start gap-1.5 pl-9 pt-1.5 text-xs text-ink-3">
          <Info size={13} className="mt-px shrink-0" />
          S = 0: se guarda, pero no ajusta el modelo.
        </p>
      )}
    </div>
  )
}

function ExtraRow({ x, reg, setReg }) {
  const k = `e${x.id}`
  const res = reg.results[k]
  const kind = kindOf(res, spNum(x.sp), false)
  const locked = kind === 'saved' || kind === 'dup' || kind === 'noS'
  const upd = (patch) => setReg((r) => ({ ...r, extra: r.extra.map((e) => (e.id === x.id ? { ...e, ...patch } : e)), results: { ...r.results, [k]: undefined } }))
  const field = 'h-[42px] w-0 min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-3 font-num text-[15px] font-semibold outline-none focus:border-accent-mid disabled:opacity-50'
  return (
    <div className="flex flex-col rounded-xl border border-line bg-bg p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2"><Pencil size={13} className="text-ink-2" /></span>
        <label className="flex min-w-0 flex-1 items-center gap-2"><span className="text-[11px] text-ink-3">Fila</span>
          <input className={field} value={x.fila} disabled={locked} inputMode="numeric" aria-label="Fila" onChange={(e) => upd({ fila: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2"><span className="text-[11px] text-ink-3">Col</span>
          <input className={field} value={x.col} disabled={locked} inputMode="numeric" aria-label="Columna" onChange={(e) => upd({ col: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
        </label>
        <SpBox value={x.sp} disabled={locked} onChange={(v) => upd({ sp: v })} />
        {locked ? <StateIcon kind={kind} /> : (
          <button type="button" aria-label="Quitar" onClick={() => setReg((r) => ({ ...r, extra: r.extra.filter((e) => e.id !== x.id) }))} className="flex size-7 shrink-0 items-center justify-center text-ink-3 hover:text-ink">
            <X size={16} />
          </button>
        )}
      </div>
      {res?.duplicado && <p className="flex items-center gap-1.5 px-1 pt-2 text-xs text-ink-3"><Info size={13} />{rcText(res.fila, res.col)}: ya registrado.</p>}
      {res && kind === 'warn' && <div className="px-1"><Warn r={res} onGo={() => {}} /></div>}
      {res?.guardado && <div className="px-1"><Chips r={res} /></div>}
    </div>
  )
}

/** Pestaña «Registrar»: apunta el SP real de lo que disparaste y deja que el motor reajuste el modelo. */
export default function Registrar({ plan, retro, reg, setReg, saveShots, afterSave, onGo, pagoSlot, board }) {
  const [saving, setSaving] = useState(false)
  const detected = retro?.retroalimentacion?.sin_registrar
  const fotos = retro?.retroalimentacion?.sin_registrar?.reduce((m, d) => ({ ...m, [d.foto]: d.foto_guardada }), {}) || {}

  // lo detectado se recuerda aunque deje de aparecer después de guardarlo (así se ve su resultado)
  useEffect(() => {
    if (!detected?.length) return
    setReg((r) => {
      const seen = { ...r.seen }
      let ch = false
      for (const d of detected) {
        const k = keyD(d)
        if (!seen[k] || seen[k].S !== d.S || seen[k].casillas_nuevas !== d.casillas_nuevas || seen[k].foto_guardada !== d.foto_guardada) {
          seen[k] = d
          ch = true
        }
      }
      return ch ? { ...r, seen } : r
    })
  }, [detected, setReg])

  const nowKeys = useMemo(() => new Set((detected || []).map(keyD)), [detected])
  const rowsD = Object.values(reg.seen).filter((d) => nowKeys.has(keyD(d)) || reg.results[keyD(d)])
  const groups = [...new Set(rowsD.map((d) => d.foto))].sort((a, b) => a - b)
  let dn = 0

  // lo que se enviaría
  const pending = []
  const problems = []
  const add = (key, fila, col, spText, foto, skip) => {
    if (skip) return
    const res = reg.results[key]
    if (res && (res.guardado || res.duplicado)) return
    if (spText == null || String(spText).trim() === '') return
    const sp = spNum(spText)
    if (sp == null) return problems.push(`${rcText(fila, col)}: el SP debe ser un número entero.`)
    pending.push({ key, fila, col, sp, foto })
  }
  plan.forEach((w) => add(keyP(w), w.fila, w.col, reg.sp[keyP(w)], 0, reg.skip[keyP(w)]))
  rowsD.forEach((d) => add(keyD(d), d.fila, d.col, reg.sp[keyD(d)], d.foto, false))
  reg.extra.forEach((x) => {
    const f = Number(x.fila)
    const c = Number(x.col)
    if (!x.fila || !x.col) return x.sp ? problems.push('Añadir disparo: escribe la fila y la columna.') : undefined
    if (!(f >= 1 && f <= board.rows && c >= 1 && c <= board.cols)) return problems.push(`Fila ${x.fila} · Col ${x.col} está fuera del tablero (${board.rows}×${board.cols}).`)
    add(`e${x.id}`, f, c, x.sp, 0, false)
  })


  const doSave = async () => {
    if (!pending.length || problems.length) return
    setSaving(true)
    setReg((r) => ({ ...r, error: null, summary: null }))
    const results = {}
    let last = null
    let error = null
    for (const [foto, items] of groupPending(pending)) {
      const d = await saveShots({
        disparos: items.map((p) => ({ fila: p.fila, col: p.col, sp: p.sp })),
        guardar: true,
        ...(foto > 0 ? { anterior: true, foto } : {}),
      })
      if (!d || d.ok === false) {
        error = d?.error || 'No se pudo hablar con el motor.'
        break
      }
      last = d
      for (const r of d.resultados || []) {
        const it = items.find((p) => p.fila === r.fila && p.col === r.col && p.sp === r.sp)
        if (it) results[it.key] = r
      }
    }
    const all = Object.values(results)
    setReg((r) => ({
      ...r,
      results: { ...r.results, ...results },
      error,
      summary: all.length
        ? {
            guardados: all.filter((x) => x.guardado).length,
            avisos: all.filter((x) => x.sin_actualizar?.length).length,
            dup: all.filter((x) => x.duplicado).length,
            modelo: last?.modelo || null,
          }
        : null,
    }))
    setSaving(false)
    if (all.some((x) => x.guardado)) afterSave?.()
  }

  const fotoLabel = (k) => (k === 0 ? `Desde el último cálculo${fotos[0] ? ` · ${hhmm(fotos[0])}` : ''}` : `Foto base de ${fotos[k] ? hhmm(fotos[k]) : `hace ${k} cálculo${k > 1 ? 's' : ''}`}`)
  const anyOld = pending.some((p) => p.foto > 0)
  const warnRows = Object.entries(reg.results).filter(([, r]) => r?.sin_actualizar?.length)
  const sum = reg.summary

  return (
    <>
      <div className="grid grid-cols-3 gap-3 text-[11px] leading-snug text-ink-2">
        {['Dispara en el juego', 'Pon las casillas nuevas en el tablero', 'Escribe el SP'].map((t, i) => (
          <div key={t} className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 font-num text-[10px] text-ink-2">{i + 1}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {sum && (
        <div className="flex items-start gap-3 rounded-xl border border-success/60 bg-success-soft px-3.5 py-3">
          <CircleCheck size={18} className="mt-0.5 shrink-0 text-success" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-semibold">
              {sum.guardados === 1 ? 'Guardado 1 disparo' : `Guardados ${sum.guardados} disparos`}
              {sum.avisos > 0 && ` · ${sum.avisos} con aviso`}
              {sum.dup > 0 && ` · ${sum.dup} ya estaba${sum.dup > 1 ? 'n' : ''}`}
            </span>
            {sum.modelo && <span className="font-num text-[11px] text-ink-2">Modelo actualizado: {formula(sum.modelo)}</span>}
          </div>
        </div>
      )}
      {reg.error && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/50 bg-danger/[0.07] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CircleX size={18} className="mt-0.5 shrink-0 text-danger" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">No se pudo guardar</span>
                <span className="text-xs text-ink-2">Lo que escribiste se conserva.</span>
              </div>
            </div>
            <button type="button" onClick={doSave} disabled={saving || !pending.length} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-3 text-xs font-medium hover:brightness-125 disabled:opacity-50">
              {saving ? <Spinner size={13} /> : null}Reintentar
            </button>
          </div>
          <div className="break-words rounded-lg border border-line bg-bg px-3 py-2.5 font-num text-xs text-danger">{reg.error}</div>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3 px-0.5 pb-1.5">
          <span className="text-[15px] font-semibold">Del plan</span>
          <span className="text-[11px] text-ink-3">Solo las que disparaste · el resto se ignora</span>
        </div>
        {plan.length ? (
          plan.map((w, i) => <PlanRow key={keyP(w)} w={w} i={i} reg={reg} setReg={setReg} onGo={onGo} />)
        ) : (
          <p className="px-1 pb-1 text-[13px] leading-relaxed text-ink-2">
            No hay un plan calculado en esta sesión. Si disparaste algo, el motor lo detecta en el mapa (abajo) o lo añades a mano.
          </p>
        )}
      </div>

      {rowsD.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[15px] font-semibold"><ScanSearch size={16} className="text-model" />Detectados en el mapa</span>
            <p className="text-xs leading-relaxed text-ink-3">Ventanas abiertas fuera del plan o antes del último cálculo. Su S ya está calculado: solo escribe el SP.</p>
          </div>
          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">{g === 0 ? <History size={13} /> : <Camera size={13} />}{fotoLabel(g)}</span>
              {rowsD.filter((d) => d.foto === g).map((d) => <DetectedRow key={keyD(d)} d={d} n={++dn} reg={reg} setReg={setReg} onGo={onGo} />)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <span className="text-[15px] font-semibold">Añadir disparo</span>
          <span className="text-[11px] text-ink-3">Lo que no está en el plan ni detectado</span>
        </div>
        {reg.extra.map((x) => <ExtraRow key={x.id} x={x} reg={reg} setReg={setReg} />)}
        <button type="button" onClick={() => setReg((r) => ({ ...r, extra: [...r.extra, { id: r.nextId, fila: '', col: '', sp: '' }], nextId: r.nextId + 1 }))} className="flex w-fit items-center gap-1.5 px-1 text-[13px] font-semibold text-accent hover:underline">
          <Plus size={14} /> Añadir disparo
        </button>
      </div>

      {pagoSlot}

      {problems.length > 0 && (
        <div className="flex flex-col gap-1">
          {problems.slice(0, 3).map((p) => <p key={p} className="flex items-start gap-1.5 text-xs text-danger"><CircleAlert size={13} className="mt-px shrink-0" />{p}</p>)}
        </div>
      )}

      <div className="pointer-events-none sticky -bottom-5 -mx-1 mt-auto flex flex-col gap-2.5 bg-gradient-to-t from-surface from-75% to-transparent px-1 pb-5 pt-4 [&>*]:pointer-events-auto">
        <Cta icon={Save} onClick={doSave} busy={saving} disabled={!pending.length || problems.length > 0}>
          {pending.length ? `Guardar ${pending.length} ${pending.length === 1 ? 'disparo' : 'disparos'} y actualizar modelo` : 'Escribe el SP de lo que disparaste'}
        </Cta>
        <p className="px-1 text-center text-[11px] leading-snug text-ink-3">
          {warnRows.length ? `${warnRows.map(([, r]) => rcText(r.fila, r.col)).join(', ')} no se guardó: ordena el tablero y vuelve a guardar. Lo que escribiste se conserva.` : `Las filas sin SP o marcadas como «No disparé» se ignoran.${anyOld ? ' Los de una foto base anterior se registran contra esa foto.' : ''}`}
        </p>
      </div>
    </>
  )
}

/** Lo que mandamos al motor, agrupado por foto base: foto 0 es la actual; 1..3 son las anteriores. */
export function groupPending(pending) {
  const m = new Map()
  for (const p of pending) {
    if (!m.has(p.foto)) m.set(p.foto, [])
    m.get(p.foto).push(p)
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0])
}
