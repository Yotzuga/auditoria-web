import { useState } from 'react'
import { FilePlus2, FolderOpen } from 'lucide-react'
import Modal, { CloseButton } from './Modal'

export default function FileDialog({ file, hasData, onNew, onExisting, onClose }) {
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try {
      if (await fn()) onClose()
    } finally {
      setBusy(false)
    }
  }

  const card =
    'flex w-full items-center gap-3.5 rounded-[14px] border border-line bg-surface-2 p-4 text-left hover:brightness-125 disabled:opacity-50'

  return (
    <Modal onClose={onClose} label="Archivo de datos" width={440}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Archivo de datos</h2>
          <p className="text-[13px] text-ink-2">
            Tus mapas se guardan en un archivo <span className="font-num">.json</span> de tu computadora
            cuando pulsas Guardar (<span className="font-num">Ctrl S</span>).
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {file.status === 'invalid' && (
        <p className="rounded-xl bg-danger/10 px-3.5 py-3 text-xs text-danger">
          {file.name} no se pudo leer: {file.message}. No lo toqué.
        </p>
      )}
      {file.status === 'error' && file.message && (
        <p className="rounded-xl bg-danger/10 px-3.5 py-3 text-xs text-danger">{file.message}</p>
      )}

      <div className="flex flex-col gap-2.5">
        <button type="button" disabled={busy} className={card} onClick={() => run(onNew)}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
            <FilePlus2 size={18} className="text-accent" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Crear mapas.json nuevo</span>
            <span className="text-xs text-ink-2">
              {hasData ? 'Guarda ahí los mapas que ya tienes.' : 'Empieza con un archivo vacío.'}
            </span>
          </span>
        </button>
        <button type="button" disabled={busy} className={card} onClick={() => run(onExisting)}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-surface">
            <FolderOpen size={18} className="text-ink" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Abrir mapas.json existente</span>
            <span className="text-xs text-ink-2">
              {hasData ? 'Reemplaza los mapas de este navegador por los del archivo.' : 'Carga los mapas del archivo.'}
            </span>
          </span>
        </button>
      </div>
      <p className="text-[11px] text-ink-3">
        Se recomienda guardarlo dentro de la carpeta del proyecto, por ejemplo <span className="font-num">data/mapas.json</span>.
      </p>
    </Modal>
  )
}
