import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import Modal, { CloseButton } from './Modal'
import { nombre } from '../lib/reglas'

export default function AvisosDialog({ rev, onGo, onFix, onClose }) {
  const { issues } = rev
  return (
    <Modal onClose={onClose} label="Revisión del tablero" width={520}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Revisión del tablero</h2>
          <p className="text-[13px] text-ink-2">
            {issues.length
              ? `${issues.length} ${issues.length === 1 ? 'aviso' : 'avisos'}. Son las mismas reglas de issues.py; solo avisan, no bloquean nada.`
              : 'Todo coherente con las reglas.'}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-success/10 px-3.5 py-3 text-sm text-success">
          <CheckCircle2 size={16} /> Sin avisos
        </div>
      ) : (
        <div className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto">
          {issues.map((it) => (
            <div key={it.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 p-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-snug">{it.title}</span>
                {it.r != null && <span className="font-num text-[11px] text-ink-3">{nombre(it.r, it.c)}</span>}
                <span className="text-xs leading-snug text-ink-2">{it.detail}</span>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {it.r != null && (
                  <button
                    type="button"
                    onClick={() => onGo({ r: it.r, c: it.c })}
                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium"
                  >
                    Ir
                  </button>
                )}
                {it.fix && (
                  <button
                    type="button"
                    onClick={() => onFix(it)}
                    className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-[#1A1305]"
                  >
                    Poner #
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
