import { useCallback, useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import BoardPanel from './components/BoardPanel'
import Inspector from './components/Inspector'
import NewMapDialog from './components/NewMapDialog'
import MapsDialog from './components/MapsDialog'
import FileDialog from './components/FileDialog'
import CloudDialog from './components/CloudDialog'
import MobileApp from './components/mobile/MobileApp'
import { useMedia } from './lib/useMedia'
import { key, stats } from './lib/cells'
import { nextMapName, useStore } from './lib/store'

const DIGIT = /^Digit([0-8])$/
const NUMPAD = /^Numpad([1-8])$/

export default function App() {
  const {
    state, map, savedAt, dirty, file, cloud, hasData, flush, setCell, createMap, openMap, deleteMap,
    linkNew, linkExisting, reconnect, cloudSignIn, cloudSignOut, cloudUseRemote, cloudKeepLocal,
  } = useStore()
  const mobile = useMedia('(max-width: 767px)') // pantalla vertical: diseño móvil
  const [sel, setSel] = useState({ r: 0, c: 0 })
  const [dialog, setDialog] = useState(null) // 'new' | 'maps' | 'file' | 'cloud' | null

  // mantener la selección dentro del tablero al cambiar de mapa
  const safeSel = { r: Math.min(sel.r, map.rows - 1), c: Math.min(sel.c, map.cols - 1) }
  const cell = map.cells[key(safeSel.r, safeSel.c)]
  const st = useMemo(() => stats(map), [map])

  const set = useCallback(
    (next) => setCell(safeSel.r, safeSel.c, next),
    [setCell, safeSel.r, safeSel.c],
  )

  // acción de la pastilla de estado / Ctrl S
  const fileAction = useCallback(() => {
    if (file.status === 'needs-permission') reconnect()
    else if ((file.status === 'none' || file.status === 'invalid') && cloud.status !== 'ready') {
      flush() // al menos en el navegador
      setDialog(cloud.status === 'off' ? 'file' : 'cloud')
    } else flush()
  }, [file.status, cloud.status, reconnect, flush])

  // un conflicto con la nube se resuelve en cuanto aparece
  useEffect(() => {
    if (cloud.status === 'conflict') setDialog('cloud')
  }, [cloud.status])

  // la pastilla de la nube: errores se reintentan guardando; el resto abre el panel
  const cloudAction = useCallback(() => {
    if (cloud.status === 'error') flush()
    else setDialog('cloud')
  }, [cloud.status, flush])

  useEffect(() => {
    const onKey = (e) => {
      if (dialog) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.code === 'KeyS') {
        e.preventDefault()
        fileAction()
        return
      }
      if (mod || e.altKey) return

      // Num 1–8 (teclado numérico) → número conocido. Va antes que las flechas porque con
      // Bloq Num apagado esas teclas envían ArrowUp, PageDown, etc.
      const pad = NUMPAD.exec(e.code)
      if (pad) {
        e.preventDefault()
        return set({ t: 'known', v: Number(pad[1]) })
      }

      const { r, c } = safeSel
      const go = (nr, nc) => {
        e.preventDefault()
        setSel({
          r: Math.max(0, Math.min(map.rows - 1, nr)),
          c: Math.max(0, Math.min(map.cols - 1, nc)),
        })
      }
      switch (e.key) {
        case 'ArrowLeft': return go(r, c - 1)
        case 'ArrowRight': return go(r, c + 1)
        case 'ArrowUp': return go(r - 1, c)
        case 'ArrowDown': return go(r + 1, c)
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          return set(null)
        default:
      }

      const digit = DIGIT.exec(e.code)
      if (digit) {
        const n = Number(digit[1])
        // en una mina revelada, 1–5 eligen la recompensa
        if (cell?.t === 'X' && !e.shiftKey && n >= 1 && n <= 5) {
          const ids = ['plinko', 'mines', 'gachas', 'cartas', 'variado']
          e.preventDefault()
          return set({ t: 'X', reward: ids[n - 1] })
        }
        e.preventDefault()
        if (n === 0) return e.shiftKey ? undefined : set({ t: 'zero' })
        return set({ t: e.shiftKey ? 'known' : 'num', v: n })
      }

      if (e.code === 'KeyX') {
        e.preventDefault()
        return set(e.shiftKey ? { t: 'X', reward: cell?.t === 'X' ? cell.reward : undefined } : { t: 'x' })
      }
      if (e.code === 'KeyO' || e.code === 'KeyR') return e.preventDefault(), set({ t: 'O' })
      if (e.code === 'KeyQ') return e.preventDefault(), set({ t: 'dash' })
      if (e.code === 'KeyW') return e.preventDefault(), set({ t: 'hash' })
      if (e.code === 'KeyE') return e.preventDefault(), set({ t: 'red' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, safeSel, cell, map.rows, map.cols, set, fileAction])

  const defaults = {
    name: nextMapName(state.maps),
    cols: map.cols,
    rows: map.rows,
    mines: map.mines,
  }

  return (
    <div className="flex h-full flex-col">
      {mobile ? (
        <MobileApp
          map={map}
          sel={safeSel}
          onSelect={setSel}
          cell={cell}
          onSet={set}
          stat={st}
          savedAt={savedAt}
          dirty={dirty}
          file={file}
          cloud={cloud}
          onSave={fileAction}
          onCloud={cloudAction}
          onFile={() => setDialog('file')}
          onMaps={() => setDialog('maps')}
          onNew={() => setDialog('new')}
        />
      ) : (
        <>
        <TopBar
          map={map}
          savedAt={savedAt}
          dirty={dirty}
          file={file}
          cloud={cloud}
          onFile={fileAction}
          onCloud={cloudAction}
          onSave={fileAction}
          onMaps={() => setDialog('maps')}
          onNew={() => setDialog('new')}
        />
        <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
          <BoardPanel map={map} sel={safeSel} onSelect={setSel} />
          <Inspector
            sel={safeSel}
            cell={cell}
            rewardStats={st}
            onSet={set}
            onErase={() => set(null)}
          />
        </div>
        </>
      )}

      {dialog === 'new' && (
        <NewMapDialog
          defaults={defaults}
          currentName={map.name}
          onClose={() => setDialog(null)}
          onCreate={(m) => {
            flush()
            createMap(m)
            setSel({ r: 0, c: 0 })
            setDialog(null)
          }}
        />
      )}
      {dialog === 'cloud' && (
        <CloudDialog
          cloud={cloud}
          onSignIn={cloudSignIn}
          onSignOut={cloudSignOut}
          onSave={flush}
          onUseRemote={cloudUseRemote}
          onKeepLocal={cloudKeepLocal}
          onFile={() => setDialog('file')}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'file' && (
        <FileDialog
          file={file}
          hasData={hasData}
          onNew={linkNew}
          onExisting={linkExisting}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'maps' && (
        <MapsDialog
          maps={state.maps}
          currentId={map.id}
          onClose={() => setDialog(null)}
          onNew={() => setDialog('new')}
          onOpen={(id) => {
            openMap(id)
            setSel({ r: 0, c: 0 })
            setDialog(null)
          }}
          onDelete={deleteMap}
        />
      )}
    </div>
  )
}
