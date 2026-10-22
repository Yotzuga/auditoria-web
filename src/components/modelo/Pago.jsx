import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, CircleAlert, History, Upload } from 'lucide-react'
import { parseCsv } from '../../lib/modelo'
import { Chip, Spinner, card } from './ui'

const f1 = (v) => (v == null ? '—' : Number(v).toLocaleString('es', { maximumFractionDigits: 1 }))
const f2 = (v) => (v == null ? '—' : Number(v).toFixed(2))
const sg = (v, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`)

export const formula = (m) => (m ? `SP = ${f2(m.a)} ${m.b < 0 ? '−' : '+'} ${f2(Math.abs(m.b))}·S` : '')

function Stat({ v, label, tone }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`font-num text-[13px] font-semibold ${tone || ''}`}>{v}</span>
      <span className="text-[11px] text-ink-3">{label}</span>
    </div>
  )
}

const delta = (v) => (v == null ? 'text-ink-3' : v > 0 ? 'text-success' : v < 0 ? 'text-danger' : 'text-ink-2')

function PlanVsReal({ cal, ruido = 6 }) {
  if (!cal?.filas?.length) return null
  const last = cal.filas.slice(-6)
  const n = cal.n
  const sesgo = Math.abs(cal.dSP) > (2 * ruido) / Math.sqrt(n)
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">Plan vs real</span>
        <span className="text-[11px] text-ink-3">últimos {last.length} disparos</span>
      </div>
      <table className="w-full border-separate border-spacing-y-1 text-left">
        <thead>
          <tr className="text-[10px] text-ink-3">
            <th className="px-2 font-medium">Disparo</th>
            <th className="px-2 text-right font-medium">S real / esp.</th>
            <th className="px-2 text-right font-medium">SP real / esp.</th>
            <th className="px-2 text-right font-medium">Δ SP</th>
          </tr>
        </thead>
        <tbody className="font-num text-xs">
          {last.map((r, i) => {
            const d = r.SP - r.SP_esp
            return (
              <tr key={i} className="bg-surface-2/60">
                <td className="rounded-l-md px-2 py-1.5 font-ui">Fila {r.fila} · Col {r.col}</td>
                <td className="px-2 py-1.5 text-right text-ink-2">{r.S} / {f1(r.S_esp)}</td>
                <td className="px-2 py-1.5 text-right text-ink-2">{r.SP} / {Math.round(r.SP_esp)}</td>
                <td className={`rounded-r-md px-2 py-1.5 text-right font-semibold ${delta(d)}`}>{sg(Math.round(d), 0)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-num text-xs font-semibold">
          Promedio {sg(cal.dSP)} SP · {sg(cal.dS)} S
        </span>
        <Chip tone={sesgo ? 'accent' : 'ok'}>{sesgo ? (cal.dSP > 0 ? 'El modelo se queda corto' : 'El modelo se pasa') : 'Sin sesgo claro'}</Chip>
        {n < 10 && <Chip>Pocos datos: es ruido</Chip>}
      </div>
    </div>
  )
}

function Importar({ total, onImport }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null) // { ok, agregadas, duplicadas, rechazadas, total_rechazadas } | { error }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRes(null)
    if (file.size > 1_500_000) return setRes({ error: 'El archivo es demasiado grande (máximo 1,5 MB).' })
    let filas
    try {
      const text = await file.text()
      if (/\.json$/i.test(file.name)) {
        const j = JSON.parse(text)
        filas = Array.isArray(j) ? j : j?.filas || j?.disparos
      } else filas = parseCsv(text)
    } catch {
      return setRes({ error: 'No pude leer el archivo. Usa el disparos.csv del motor o un JSON con una lista de disparos.' })
    }
    if (!Array.isArray(filas) || !filas.length) return setRes({ error: 'No encontré disparos en ese archivo.' })
    if (filas.length > 5000) return setRes({ error: 'Máximo 5000 filas por archivo.' })
    setBusy(true)
    const d = await onImport(filas)
    setBusy(false)
    setRes(d?.ok === false ? { error: d.error } : d || { error: 'No se pudo importar. Revisa la conexión con el motor.' })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <History size={14} className="text-ink-2" />
        <span className="text-[13px] font-semibold">Historial de disparos</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-2">
        El motor tiene {total ?? '—'} disparos guardados. Si tienes disparos de antes (por ejemplo el disparos.csv de otra versión), súbelos
        una vez: desde ahí el motor es la fuente de verdad.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={pick} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3.5 text-[13px] font-medium hover:brightness-125 disabled:opacity-50"
        >
          {busy ? <Spinner /> : <Upload size={15} />}
          Importar historial al motor
        </button>
        <span className="text-xs text-ink-3">Repetirlo no duplica nada</span>
      </div>
      {res && !res.error && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="ok">Importados {res.agregadas}</Chip>
            <Chip>ya estaban {res.duplicadas}</Chip>
            {res.total_rechazadas > 0 && <Chip tone="danger">rechazados {res.total_rechazadas}</Chip>}
          </div>
          {res.rechazadas?.slice(0, 3).map((r, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-danger">
              <CircleAlert size={13} className="mt-px shrink-0" />
              <span>
                Fila {r.indice + 2} del archivo{r.mapa ? ` (mapa ${r.mapa}${r.fila ? ` · fila ${r.fila}` : ''}${r.col ? ` · col ${r.col}` : ''})` : ''}: {r.motivo}.
              </span>
            </p>
          ))}
        </div>
      )}
      {res?.error && (
        <p className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert size={13} className="mt-px shrink-0" />
          {res.error}
        </p>
      )}
    </div>
  )
}

/**
 * Tarjeta «Modelo de pago». `modelo` = objeto del motor (a, b, ruido, error_loo, s_min, s_max, disparos_usados, disparos…).
 */
export default function Pago({ modelo, calibracion, motor, actualizado, onImport, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [tec, setTec] = useState(false)
  if (!modelo) return null
  const dis = modelo.disparos || {}
  const err = modelo.error_loo ?? modelo.ruido
  return (
    <div className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] text-ink-3">Modelo de pago</span>
          {!open && (
            <span className="font-num text-[13px] font-semibold">
              {formula(modelo)} <span className="pl-2.5 font-medium text-ink-2">±{f1(modelo.ruido)}</span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {open && actualizado ? (
            <Chip tone="ok">Actualizado {actualizado}</Chip>
          ) : (
            <span className="text-xs text-ink-3">
              {modelo.disparos_usados} disparos · {modelo.error_loo != null ? `error al predecir ±${f1(modelo.error_loo)}` : `ruido ±${f1(modelo.ruido)}`}
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-ink-2" /> : <ChevronDown size={16} className="text-ink-2" />}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-5 px-4 pb-4">
          <span className="font-num text-[26px] font-semibold tracking-tight">{formula(modelo)}</span>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-num text-[15px] font-semibold">±{f1(modelo.ruido)} SP</span>
              <span className="text-xs text-ink-3">Error típico</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-num text-[15px] font-semibold">{modelo.disparos_usados} disparos</span>
              <span className="text-xs text-ink-3">Usados para ajustar</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-num text-[15px] font-semibold">
                {modelo.s_min != null ? `S entre ${f1(modelo.s_min)} y ${f1(modelo.s_max)}` : 'Sin rango'}
              </span>
              <span className="text-xs text-ink-3">Fiable en este rango</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-num text-[15px] font-semibold">{err != null ? `±${f1(err)} SP` : '—'}</span>
              <span className="text-xs text-ink-3">Error al predecir uno nuevo</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 rounded-xl bg-surface-2 px-3.5 py-3">
            <Stat v={dis.total ?? '—'} label="Registrados" />
            <Stat v={dis.usables ?? '—'} label="Usables" />
            <Stat v={dis.promedio_sp != null ? `${f1(dis.promedio_sp)} SP` : '—'} label="Promedio" />
            <Stat v={dis.minimo_sp != null ? `${f1(dis.minimo_sp)} SP` : '—'} label="Mínimo" />
            <Stat v={dis.neto_sp != null ? `${sg(dis.neto_sp, 0)} SP` : '—'} label="Neto" tone={dis.neto_sp >= 0 ? 'text-success' : 'text-danger'} />
          </div>

          <PlanVsReal cal={calibracion} ruido={modelo.ruido} />

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => setTec((t) => !t)} aria-expanded={tec} className="flex w-fit items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
              {tec ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Detalle técnico
            </button>
            {tec && (
              <div className="flex flex-col gap-1 font-num text-[11px] leading-relaxed text-ink-3">
                {motor && (
                  <>
                    <span>Motor {motor.modo} · {Number(motor.muestras).toLocaleString('es')} muestras en {f1(motor.segundos)} s</span>
                    {motor.componentes_mcmc > 0 && <span>R-hat máx. {Number(motor.rhat_max).toFixed(3)} · ESS mín. {Math.round(motor.ess_min)}</span>}
                    <span>
                      {motor.casillas_desconocidas} casillas por decidir en {motor.componentes} zonas
                      {motor.componentes_mcmc ? ` (${motor.componentes_mcmc} con MCMC)` : ''}
                    </span>
                  </>
                )}
                <span>
                  a ±{f1(modelo.error_a)} · b ±{f2(modelo.error_b)} · piso {f1(modelo.piso)} SP · {modelo.descartados ?? 0} descartados (S = 0)
                </span>
                {modelo.texto?.slice(1).map((l, i) => (
                  <span key={i} className="whitespace-pre-wrap">{l}</span>
                ))}
              </div>
            )}
            <Importar total={dis.total} onImport={onImport} />
          </div>
        </div>
      )}
    </div>
  )
}
