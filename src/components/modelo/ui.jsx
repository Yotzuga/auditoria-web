import { Check, ChevronDown, Info, LoaderCircle, MousePointerClick } from 'lucide-react'

export const card = 'rounded-2xl border border-line bg-bg'

export function Spinner({ size = 15 }) {
  return <LoaderCircle size={size} className="animate-spin" />
}

/** Botón amarillo ancho del pie del panel. */
export function Cta({ icon: Icon, children, onClick, disabled, busy, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-accent text-[15px] font-semibold text-[#1A1305] hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3 disabled:hover:brightness-100"
    >
      {busy ? <Spinner size={17} /> : Icon && <Icon size={17} />}
      {children}
    </button>
  )
}

export function Chip({ tone = 'muted', icon: Icon, children, className = '' }) {
  const cls = {
    ok: 'bg-success-soft text-success',
    muted: 'bg-surface-2 text-ink-2',
    danger: 'bg-danger/15 text-danger',
    accent: 'bg-accent-soft text-accent',
    model: 'bg-model-strong text-model',
  }[tone]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[5px] text-[11px] font-semibold ${cls} ${className}`}>
      {Icon && <Icon size={11} strokeWidth={3} />}
      {children}
    </span>
  )
}

/** "Fila 6 · Col 8" */
export const rcText = (f, c) => `Fila ${f} · Col ${c}`

/** Pastillas verdes «Fila 2 · Col 18» que llevan a la casilla. */
export function SafeChips({ cells, onGo }) {
  if (!cells?.length) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-ink-2">Seguras · clic gratis</span>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {cells.map((c) => (
          <button
            key={`${c.fila},${c.col}`}
            type="button"
            onClick={() => onGo({ r: c.fila - 1, c: c.col - 1 })}
            title="Ir a la casilla"
            className="shrink-0 whitespace-nowrap rounded-md border border-success px-2 py-[3px] font-num text-[11px] text-success hover:bg-success-soft"
          >
            {rcText(c.fila, c.col)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Resumen común de las pestañas Plan / Ranking / Registrar. */
export function StatusStrip({ revisa, rank, onGo }) {
  const bad = revisa?.inconsistencias?.length || 0
  const porUbicar = rank?.motor?.minas_por_ubicar ?? revisa?.conteos?.faltan
  return (
    <div className={`${card} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap gap-1.5">
        {revisa ? (
          <>
            {bad ? <Chip tone="danger">{bad} {bad === 1 ? 'inconsistencia' : 'inconsistencias'}</Chip> : <Chip tone="ok" icon={Check}>Sin inconsistencias</Chip>}
            {revisa.factible === true && <Chip tone="ok" icon={Check}>Factible</Chip>}
            {revisa.factible === false && <Chip tone="danger">No factible</Chip>}
            {revisa.factible == null && <Chip tone="accent">Factibilidad sin decidir</Chip>}
          </>
        ) : (
          <Chip>Revisando…</Chip>
        )}
        {porUbicar != null && <Chip>{porUbicar} {porUbicar === 1 ? 'mina por ubicar' : 'minas por ubicar'}</Chip>}
      </div>
      <SafeChips cells={revisa?.casillas_seguras} onGo={onGo} />
    </div>
  )
}

export function Note({ children, icon: Icon = Info }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
      <Icon size={13} className="mt-[2px] shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Empty({ icon: Icon = MousePointerClick, title, text, children }) {
  return (
    <div className={`${card} flex flex-col items-center gap-3 px-6 py-8 text-center`}>
      <div className="flex size-11 items-center justify-center rounded-full bg-success-soft">
        <Icon size={18} className="text-success" />
      </div>
      <span className="text-[15px] font-semibold">{title}</span>
      {text && <p className="max-w-[320px] text-[13px] leading-relaxed text-ink-2">{text}</p>}
      {children}
    </div>
  )
}

export { ChevronDown }
