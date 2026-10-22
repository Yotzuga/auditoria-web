import { useState } from 'react'
import { Check, Copy, Info, KeyRound, Lock, PlugZap, RefreshCw } from 'lucide-react'
import { hhmmss, portOf } from '../../lib/modelo'
import { Note, Spinner } from './ui'

function Command({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* sin portapapeles: el texto se puede seleccionar a mano */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-bg px-3.5 py-3">
      <span className="min-w-0 break-all font-num text-[13px]">
        <span className="text-ink-3">$ </span>
        {text}
      </span>
      <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
        {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

/** Diseño «Modelo · Motor apagado». */
export function MotorApagado({ server, lastTry, message, checking, onRetry, onServer }) {
  const [edit, setEdit] = useState(false)
  const [text, setText] = useState(server)
  const port = portOf(server)
  const published = typeof location !== 'undefined' && location.protocol === 'https:'
  const cmd = ['python bm2.py servir', port !== '8787' ? `--puerto ${port}` : '', published ? `--origen ${location.origin}` : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-danger/40 bg-danger/[0.06] p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-danger/15">
            <PlugZap size={18} className="text-danger" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Motor local apagado</span>
            <span className="text-[13px] text-ink-2">El análisis corre en tu PC. Enciéndelo y vuelve a intentar.</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-ink-3">Ejecuta en la carpeta del motor:</span>
          <Command text={cmd} />
          {edit ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onServer(text)
                setEdit(false)
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                autoFocus
                aria-label="Dirección del motor"
                className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-3 font-num text-xs outline-none focus:border-accent-mid"
              />
              <button type="submit" className="h-9 rounded-[10px] border border-line bg-surface-2 px-3 text-xs font-medium hover:brightness-125">
                Usar
              </button>
            </form>
          ) : (
            <span className="font-num text-xs text-ink-3">
              Escucha en {server} ·{' '}
              <button type="button" onClick={() => setEdit(true)} className="text-ink-2 underline-offset-2 hover:underline">
                cambiar
              </button>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={onRetry}
            disabled={checking}
            className="flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[#1A1305] hover:brightness-110 disabled:opacity-60"
          >
            {checking ? <Spinner /> : <RefreshCw size={15} />}
            Reintentar
          </button>
          {lastTry && <span className="text-xs text-ink-3">Último intento: {hhmmss(lastTry)} · sin respuesta</span>}
        </div>
        {message && message !== 'No se pudo conectar con el motor local' && <p className="text-xs text-danger">{message}</p>}
      </div>
      <Note>
        Puedes seguir editando el tablero en Auditoría. Cuando el motor responda, el análisis se hace con el tablero que ves en pantalla.
        La primera vez, Chrome puede preguntar si esta página puede conectarse a dispositivos de tu red local: permítelo.
      </Note>
    </div>
  )
}

/** El motor está encendido pero pide el token (se crea en data/.token al arrancarlo la primera vez). */
export function PideToken({ message, hadToken, checking, onToken, onForget }) {
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-4 rounded-2xl border border-accent-mid bg-accent-soft/40 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          const ok = onToken(text)
          setBad(!ok)
          if (ok) setText('')
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Lock size={18} className="text-accent" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">El motor pide un token</span>
            <span className="text-[13px] text-ink-2">Solo quien tenga el token puede usar el motor desde el navegador.</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-ink-3">Está en el archivo data/.token de la carpeta del motor:</span>
          <Command text="type data\.token" />
          <div className="flex gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-bg px-3.5 focus-within:border-accent-mid">
              <KeyRound size={15} className="shrink-0 text-ink-3" />
              <input
                type="password"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setBad(false)
                }}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                placeholder="Pega el token"
                aria-label="Token del motor"
                className="w-full bg-transparent font-num text-[13px] outline-none placeholder:text-ink-3"
              />
            </label>
            <button
              type="submit"
              disabled={!text.trim() || checking}
              className="flex h-11 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-[#1A1305] hover:brightness-110 disabled:opacity-45"
            >
              {checking && <Spinner />}
              Conectar
            </button>
          </div>
          {(bad || message) && (
            <p className="text-xs text-danger">{bad ? 'Eso no parece un token (43 caracteres, letras, números, - y _).' : message}</p>
          )}
        </div>
        {hadToken && (
          <button type="button" onClick={onForget} className="w-fit text-xs text-ink-2 underline-offset-2 hover:underline">
            Olvidar el token guardado en este navegador
          </button>
        )}
      </form>
      <Note icon={Info}>
        El token se guarda solo en este navegador y solo se envía al motor de esta PC. Si lo pierdes o crees que se filtró, arranca el
        motor con <span className="font-num">python bm2.py servir --nuevo-token</span> para crear otro. No lo compartas ni lo subas a Git.
      </Note>
    </div>
  )
}
