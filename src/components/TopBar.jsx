import { ChevronDown, FolderOpen, Grid3x3, Plus, Save } from 'lucide-react'

const btn =
  'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink hover:bg-surface-2'

function hhmm(d) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function SaveStatus({ file, savedAt, dirty, onFile }) {
  const pill = 'flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-[5px]'
  const label = 'font-num text-[11px]'
  const act = `${pill} hover:bg-surface-2`

  switch (file.status) {
    case 'ready':
      return (
        <div className={`hidden w-[158px] md:flex ${pill}`} title={file.name}>
          <span className={`size-1.5 shrink-0 rounded-full ${dirty ? 'bg-accent' : 'bg-success'}`} />
          <span className={`${label} truncate ${dirty ? 'text-accent' : 'text-ink-2'}`}>
            {dirty ? 'Sin guardar · Ctrl S' : `Guardado · ${hhmm(savedAt)}`}
          </span>
        </div>
      )
    case 'none':
      return (
        <button type="button" onClick={onFile} className={`hidden md:flex ${act}`}>
          <span className="size-1.5 rounded-full bg-accent" />
          <span className={`${label} text-accent`}>Vincular mapas.json</span>
        </button>
      )
    case 'needs-permission':
      return (
        <button type="button" onClick={onFile} className={`hidden md:flex ${act}`} title="El navegador pide permiso otra vez">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className={`${label} text-accent`}>Reconectar {file.name || 'mapas.json'}</span>
        </button>
      )
    case 'invalid':
      return (
        <button type="button" onClick={onFile} className={`hidden md:flex ${act}`} title={file.message}>
          <span className="size-1.5 rounded-full bg-danger" />
          <span className={`${label} text-danger`}>{file.name} no es válido · elegir otro</span>
        </button>
      )
    case 'error':
      return (
        <button type="button" onClick={onFile} className={`hidden md:flex ${act}`} title={file.message}>
          <span className="size-1.5 rounded-full bg-danger" />
          <span className={`${label} text-danger`}>No se pudo guardar · reintentar</span>
        </button>
      )
    case 'unsupported':
      return (
        <div
          className={`hidden w-[158px] md:flex ${pill}`}
          title="Este navegador no permite guardar en un archivo; se guarda dentro del navegador"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${dirty ? 'bg-accent' : 'bg-ink-3'}`} />
          <span className={`${label} truncate ${dirty ? 'text-accent' : 'text-ink-2'}`}>
            {dirty ? 'Sin guardar · Ctrl S' : 'Solo en el navegador'}
          </span>
        </div>
      )
    default:
      return (
        <div className={`hidden md:flex ${pill}`}>
          <span className="size-1.5 rounded-full bg-ink-3" />
          <span className={`${label} text-ink-2`}>Cargando…</span>
        </div>
      )
  }
}

export default function TopBar({ map, savedAt, dirty, file, onFile, onSave, onMaps, onNew }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-7">
      <div className="flex min-w-0 shrink items-center gap-3">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-accent-soft">
          <Grid3x3 size={16} className="text-accent" />
        </div>
        <span className="hidden text-sm font-semibold md:inline">Auditoría</span>
        <span className="hidden text-sm text-ink-3 md:inline">/</span>
        <button
          type="button"
          onClick={onMaps}
          className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-surface"
        >
          <span className="truncate whitespace-nowrap text-sm font-medium">{map.name}</span>
          <span className="hidden whitespace-nowrap text-xs text-ink-3 md:inline">
            {map.cols}×{map.rows} · {map.mines} minas
          </span>
          <ChevronDown size={14} className="text-ink-2" />
        </button>
        <SaveStatus file={file} savedAt={savedAt} dirty={dirty} onFile={onFile} />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={onMaps}>
          <FolderOpen size={15} />
          <span className="hidden md:inline">Mis mapas</span>
        </button>
        <button type="button" className={btn} onClick={onSave}>
          <Save size={15} />
          <span className="hidden md:inline">Guardar</span>
          <span className="hidden font-num text-[11px] font-normal text-ink-3 lg:inline">Ctrl S</span>
        </button>
        <button type="button" className={btn} onClick={onNew}>
          <Plus size={15} />
          <span className="hidden md:inline">Nuevo mapa</span>
        </button>
      </div>
    </header>
  )
}
