import { useState } from 'react'
import { Cloud, CloudOff, FolderOpen, LogOut } from 'lucide-react'
import Modal, { CloseButton } from './Modal'

const primary =
  'flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-bg hover:brightness-110 disabled:opacity-50'
const secondary =
  'flex h-10 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface-2 px-4 text-[13px] font-medium text-ink hover:brightness-125 disabled:opacity-50'

export default function CloudDialog({ cloud, onSignIn, onSignOut, onSave, onUseRemote, onKeepLocal, onFile, onClose }) {
  const [busy, setBusy] = useState(false)
  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const conflict = cloud.status === 'conflict'
  const Icon = cloud.status === 'ready' ? Cloud : CloudOff

  return (
    <Modal onClose={onClose} label="Nube" width={440}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
            <Icon size={18} className="text-accent" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Nube</h2>
            <p className="text-[13px] text-ink-2">
              {cloud.status === 'ready' && <>Conectado como <span className="font-num">{cloud.email}</span></>}
              {cloud.status === 'checking' && 'Conectando…'}
              {cloud.status === 'signed-out' && 'Guarda tus mapas en tu cuenta de Google.'}
              {cloud.status === 'conflict' && 'La nube tiene una versión distinta.'}
              {cloud.status === 'error' && 'No se pudo usar la nube.'}
            </p>
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {cloud.message && (
        <p className="rounded-xl bg-danger/10 px-3.5 py-3 text-xs text-danger">{cloud.message}</p>
      )}

      {cloud.status === 'signed-out' && (
        <div className="flex flex-col gap-2.5">
          <button type="button" disabled={busy} className={primary} onClick={() => run(onSignIn)}>
            Iniciar sesión con Google
          </button>
          <p className="text-[11px] text-ink-3">
            Al entrar, si la nube está vacía se suben los mapas de este navegador; si ya tiene datos se cargan aquí.
          </p>
        </div>
      )}

      {conflict && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] text-ink-2">
            Se guardó otra versión desde otro dispositivo o navegador. Elige cuál conservar; la otra se pierde.
          </p>
          <button type="button" disabled={busy} className={primary} onClick={() => run(async () => { await onKeepLocal(); onClose() })}>
            Subir la de este navegador
          </button>
          <button type="button" disabled={busy} className={secondary} onClick={() => run(async () => { await onUseRemote(); onClose() })}>
            Usar la de la nube
          </button>
        </div>
      )}

      {cloud.status === 'error' && (
        <button type="button" disabled={busy} className={primary} onClick={() => run(onSave)}>
          Reintentar guardado
        </button>
      )}

      {cloud.status === 'ready' && (
        <p className="text-[13px] text-ink-2">
          Tus mapas se guardan en la nube cada vez que pulsas Guardar (<span className="font-num">Ctrl S</span>).
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {(cloud.status === 'ready' || cloud.status === 'signed-out') && (
          <button type="button" className={secondary} onClick={onFile}>
            <FolderOpen size={15} />
            {cloud.status === 'ready' ? 'Además, guardar copia en un mapas.json' : 'Usar un archivo local'}
          </button>
        )}
        {cloud.status === 'ready' && (
          <button type="button" disabled={busy} className={secondary} onClick={() => run(onSignOut)}>
            <LogOut size={15} />
            Cerrar sesión
          </button>
        )}
      </div>
    </Modal>
  )
}
