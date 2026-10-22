import { useEffect, useMemo, useState } from 'react'
import { Crosshair, RefreshCw, TriangleAlert } from 'lucide-react'
import { useModelo } from '../../lib/useModelo'
import { hhmm } from '../../lib/modelo'
import { MotorApagado, PideToken } from './Estado'
import Revisar from './Revisar'
import Plan from './Plan'
import Ranking from './Ranking'
import Registrar, { emptyReg } from './Registrar'
import Pago from './Pago'
import { Spinner, StatusStrip } from './ui'

const TABS = ['Revisar', 'Plan', 'Ranking', 'Registrar']
const k = (r, c) => `${r},${c}`

/**
 * Panel lateral «Modelo»: habla con el motor local (bm2.py servir) sobre el tablero tal como se ve en pantalla.
 * `onOverlay` recibe lo que el tablero debe resaltar (casillas seguras, plan numerado, ventana elegida).
 */
export default function ModeloPanel({ map, active = true, onGo, onOverlay }) {
  // Se queda montado (oculto) al volver a Auditoría: así no se pierde el plan, ni el SP que ya escribiste en Registrar.
  const m = useModelo(map, active)
  const [tab, setTab] = useState('Revisar')
  const [umbral, setUmbral] = useState(76)
  const [focus, setFocus] = useState(null) // { r, c, w: ventana de la API, n }
  const [reg, setReg] = useState(emptyReg)

  const { status, revisa, rank, lastRank, lastRetro, rankStale } = m
  const rev = revisa // fresco (mismo tablero)
  const planKey = lastRank?.analizado

  // un plan nuevo (o otro mapa) empieza una hoja de registro limpia
  useEffect(() => setReg(emptyReg()), [planKey, map.id])
  useEffect(() => setFocus(null), [tab, map.id])

  // ---- lo que el tablero resalta -------------------------------------------------------------------------------
  const overlay = useMemo(() => {
    const rings = {}
    const badges = {}
    const win = []
    if (active && status === 'ok') {
      for (const c of rev?.casillas_seguras || []) rings[k(c.fila - 1, c.col - 1)] = 'safe'
      for (const c of rev?.minas_seguras || []) rings[k(c.fila - 1, c.col - 1)] = 'mine'
      for (const i of rev?.inconsistencias || []) rings[k(i.fila - 1, i.col - 1)] = 'bad'
      if ((tab === 'Plan' || tab === 'Ranking') && lastRank) {
        const list = tab === 'Plan' ? lastRank.plan : lastRank.top
        list?.forEach((w, i) => {
          rings[k(w.fila - 1, w.col - 1)] = 'safe'
          badges[k(w.fila - 1, w.col - 1)] = i + 1
        })
      }
      if (focus?.w) {
        for (let r = focus.w.f0; r <= focus.w.f1; r++) for (let c = focus.w.c0; c <= focus.w.c1; c++) win.push(k(r - 1, c - 1))
      }
    }
    return { rings, badges, win }
  }, [active, status, rev, lastRank, tab, focus])
  useEffect(() => onOverlay?.(overlay), [overlay, onOverlay])
  useEffect(() => () => onOverlay?.(null), [onOverlay])

  const onFocus = (w) => {
    setFocus({ r: w.fila - 1, c: w.col - 1, w: w.ventana })
    onGo({ r: w.fila - 1, c: w.col - 1 })
  }

  const calc = async () => {
    const d = await m.calcPlan(umbral)
    if (d) setTab('Plan')
  }

  const modeloObj = lastRetro || lastRank?.modelo
  const pago = (
    <Pago
      modelo={modeloObj}
      calibracion={lastRetro?.retroalimentacion?.calibracion}
      motor={lastRank?.motor}
      actualizado={rev?.analizado ? hhmm(rev.analizado) : null}
      onImport={async (filas) => {
        const d = await m.importHistory(filas)
        if (d && d.ok !== false) m.doRetro()
        return d
      }}
    />
  )

  const canCalc = !!rev && !(rev.inconsistencias?.length) && rev.factible !== false
  const off = status === 'off'
  const auth = status === 'auth'

  const sub =
    off ? <span className="text-danger">Sin conexión con el motor local</span>
    : auth ? <span className="text-accent">El motor pide un token</span>
    : rev ? `Analizado a las ${hhmm(rev.analizado)} · precisión ${rev.precision}`
    : 'Conectando con el motor…'

  return (
    <aside className={`${active ? 'flex' : 'hidden'} w-[520px] shrink-0 flex-col border-l border-line bg-surface max-xl:w-[440px] max-lg:w-full max-lg:border-l-0 max-lg:border-t`}>
      <div className="flex shrink-0 flex-col gap-4 px-6 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Crosshair size={18} className="text-model" />
              <h2 className="text-lg font-semibold tracking-[-0.01em]">Modelo</h2>
            </div>
            <span className="truncate font-num text-[11px] text-ink-3">{sub}</span>
          </div>
          <button
            type="button"
            onClick={() => (off || auth ? m.connect() : (m.doRevisa(), m.doRetro()))}
            disabled={off || auth ? status === 'checking' : m.busy.revisa}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3.5 text-[13px] font-medium hover:brightness-125 disabled:opacity-60 ${off || auth ? 'text-ink-3' : ''}`}
          >
            {m.busy.revisa || status === 'checking' ? <Spinner size={14} /> : <RefreshCw size={14} />}
            Recalcular
          </button>
        </div>
        <div role="tablist" className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-bg p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t)
                m.setError(null)
              }}
              disabled={off || auth}
              className={`h-8 rounded-lg text-[13px] ${tab === t ? 'bg-surface-2 font-semibold text-ink' : 'font-medium text-ink-2 hover:text-ink'} ${off || auth ? 'opacity-45' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 pb-5 pt-4 [&>*]:shrink-0">
        {off && <MotorApagado server={m.server} lastTry={m.lastTry} message={m.offMsg} checking={false} onRetry={m.connect} onServer={m.setServer} />}
        {auth && <PideToken message={m.authMsg} hadToken={!!m.token} checking={false} onToken={m.setToken} onForget={m.forgetToken} />}

        {status === 'checking' && !rev && (
          <div className="flex items-center gap-2.5 py-6 text-[13px] text-ink-2">
            <Spinner /> Conectando con el motor…
          </div>
        )}

        {status === 'ok' && (
          <>
            {m.error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/[0.07] px-3.5 py-3 text-[13px] text-danger">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span>{m.error.text}</span>
                  {m.error.inconsistencias?.length > 0 && (
                    <span className="mt-1 block font-num text-xs">{m.error.inconsistencias.map((i) => `${i.tipo} ${i.fila},${i.col}`).join(' · ')}</span>
                  )}
                </div>
              </div>
            )}

            {tab === 'Revisar' && (rev ? <Revisar d={rev} onGo={onGo} onPlan={calc} planning={m.busy.rank} /> : m.lastRevisa && <Revisar d={m.lastRevisa} onGo={onGo} onPlan={calc} planning={m.busy.rank} />)}

            {tab !== 'Revisar' && tab !== 'Registrar' && <StatusStrip revisa={rev || m.lastRevisa} rank={lastRank} onGo={onGo} />}
            {tab === 'Registrar' && <StatusStrip revisa={rev || m.lastRevisa} rank={lastRank} onGo={onGo} />}

            {tab === 'Plan' && (
              <Plan
                rank={lastRank}
                stale={rankStale}
                umbral={umbral}
                onUmbral={setUmbral}
                onCalc={calc}
                calc={m.busy.rank}
                canCalc={canCalc}
                focus={focus}
                onFocus={onFocus}
                onTab={setTab}
                pagoSlot={pago}
              />
            )}
            {tab === 'Ranking' && <Ranking rank={lastRank} focus={focus} onFocus={onFocus} onTab={setTab} pagoSlot={pago} modelo={modeloObj} />}
            {tab === 'Registrar' && (
              <Registrar
                plan={lastRank?.plan || []}
                retro={lastRetro}
                reg={reg}
                setReg={setReg}
                saveShots={m.saveShots}
                afterSave={() => m.doRetro()}
                onGo={onGo}
                pagoSlot={pago}
                board={{ rows: map.rows, cols: map.cols }}
              />
            )}
          </>
        )}
      </div>
    </aside>
  )
}
