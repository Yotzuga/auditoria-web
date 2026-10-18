import { AlertTriangle } from 'lucide-react'
import { nombre } from '../lib/reglas'

/** Avisos de reglas que tocan la casilla seleccionada. Solo informan: no impiden editar. */
export default function Avisos({ items, sel, onGo, onFix, onAll }) {
  if (!items.length) return null
  const shown = items.slice(0, 2)
  const more = items.length - shown.length
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger/10 p-2.5">
      {shown.map((it) => {
        const here = it.r === sel.r && it.c === sel.c
        return (
          <div key={it.id} className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-[1px] shrink-0 text-danger" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-semibold leading-snug">
                {it.title}
                {!here && (
                  <button
                    type="button"
                    onClick={() => onGo({ r: it.r, c: it.c })}
                    className="ml-1.5 font-medium text-accent"
                  >
                    {nombre(it.r, it.c)}
                  </button>
                )}
              </span>
              <span className="text-[11px] leading-snug text-ink-2">{it.detail}</span>
            </div>
            {it.fix && (
              <button
                type="button"
                onClick={() => onFix(it)}
                className="shrink-0 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-[#1A1305] active:brightness-110"
              >
                Poner #
              </button>
            )}
          </div>
        )
      })}
      {more > 0 && (
        <button type="button" onClick={onAll} className="self-start text-[11px] font-medium text-accent">
          Ver todos ({items.length})
        </button>
      )}
    </div>
  )
}
