import { useCallback, useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import BoardPanel from './components/BoardPanel'
import Inspector from './components/Inspector'
import NewMapDialog from './components/NewMapDialog'
import MapsDialog from './components/MapsDialog'
import FileDialog from './components/FileDialog'
import CloudDialog from './components/CloudDialog'
import AvisosDialog from './components/AvisosDialog'
import ModeloPanel from './components/modelo/ModeloPanel'
import MobileApp from './components/mobile/MobileApp'
import { useMedia } from './lib/useMedia'
import { key, stats } from './lib/cells'
import { nextMapName, useStore } from './lib/store'
import { downloadText } from './lib/exportFile'
import { cercanas, revisar } from './lib/reglas'

const DIGIT = /^Digit([0-8])$/
const NUMPAD = /^Numpad([1-8])$/

export default function App() {
  const {
    state, map, savedAt, dirty, file, cloud, hasData, flush, exportText, setCell, undo, redo, canUndo, canRedo, createMap, openMap, deleteMap,
    linkNew, linkExisting, reconnect, cloudSignIn, cloudSignOut, cloudUseRemote, cloudKeepLocal,
  } = useStore()
  const mobile = useMedia('(max-width: 767px)') // pantalla vertical: diseño móvil
  const [sel, setSel] = useState({ r: 0, c: 0 })
  const [dialog, setDialog] = useState(null) // 'new' | 'maps' | 'file' | 'cloud' | 'avisos' | null
  const [mode, setMode] = useState('auditoria') // escritorio: 'auditoria' (editar) | 'modelo' (panel del motor local)
  const [overlay, setOverlay] = useState(null) // lo que el panel Modelo resalta en el tablero
  const modelo = mode === 'modelo' && !mobile
  // ⇧X en modo Modelo abre la tarjeta flotante de recompensa sobre la casilla; guarda cuál casilla (r, c)
  const [picker, setPicker] = useState(null)

  // mantener la selección dentro del tablero al cambiar de mapa
  const safeSel = { r: Math.min(sel.r, map.rows - 1), c: Math.min(sel.c, map.cols - 1) }
  const cell = map.cells[key(safeSel.r, safeSel.c)]
  const st = useMemo(() => stats(map), [map])
  // reglas del juego (mismas que issues.py): avisos del mapa y los que tocan la casilla elegida
  const rev = useMemo(() => revisar(map), [map])
  const cerca = useMemo(() => cercanas(rev, { r: safeSel.r, c: safeSel.c }), [rev, safeSel.r, safeSel.c])

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

  // la tarjeta se cierra al cambiar de casilla, de mapa o de modo
  useEffect(() => setPicker(null), [safeSel.r, safeSel.c, map.id, mode])
  const closePicker = useCallback(() => setPicker(null), [])
  const pickReward = useCallback(
    (id) => {
      set({ t: 'X', reward: id })
      setPicker(null)
    },
    [set],
  )

  // deshacer / rehacer: la selección salta a la casilla que cambió, para ver qué se movió
  const doUndo = useCallback(() => {
    const rc = undo()
    if (rc) setSel(rc)
  }, [undo])
  const doRedo = useCallback(() => {
    const rc = redo()
    if (rc) setSel(rc)
  }, [redo])

  const fixIssue = useCallback((it) => setCell(it.r, it.c, it.fix), [setCell])

  // descarga mapas.json con todos los mapas tal como están en pantalla (incluye cambios sin guardar)
  const exportJson = useCallback(() => downloadText(exportText(), 'mapas.json'), [exportText])

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
      // Ctrl Z deshace, Ctrl Y (o Ctrl Mayús Z) rehace; la selección salta a la casilla que cambió
      if (mod && !e.altKey && (e.code === 'KeyZ' || e.code === 'KeyY')) {
        e.preventDefault()
        if (e.code === 'KeyY' || e.shiftKey) doRedo()
        else doUndo()
        return
      }
      if (mod || e.altKey) return

      if (e.key === 'Escape' && picker) {
        e.preventDefault()
        return setPicker(null)
      }

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
          setPicker(null)
          return set({ t: 'X', reward: ids[n - 1] })
        }
        e.preventDefault()
        if (n === 0) return e.shiftKey ? undefined : set({ t: 'zero' })
        return set({ t: e.shiftKey ? 'known' : 'num', v: n })
      }

      if (e.code === 'KeyX') {
        e.preventDefault()
        if (e.shiftKey && modelo) setPicker({ r, c })
        return set(e.shiftKey ? { t: 'X', reward: cell?.t === 'X' ? cell.reward : undefined } : { t: 'x' })
      }
      if (e.code === 'KeyO' || e.code === 'KeyR') return e.preventDefault(), set({ t: 'O' })
      if (e.code === 'KeyQ') return e.preventDefault(), set({ t: 'hash' })
      if (e.code === 'KeyW') return e.preventDefault(), set({ t: 'red' })
      if (e.code === 'KeyE') return e.preventDefault(), set({ t: 'dash' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, safeSel, cell, map.rows, map.cols, set, fileAction, doUndo, doRedo, modelo, picker])

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
          onExport={exportJson}
          avisos={rev}
          cerca={cerca}
          onAvisos={() => setDialog('avisos')}
          onFix={fixIssue}
          onCloud={cloudAction}
          onFile={() => setDialog('file')}
          onMaps={() => setDialog('maps')}
          onNew={() => setDialog('new')}
          onUndo={doUndo}
          canUndo={canUndo}
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
          onExport={exportJson}
          mode={mode}
          onMode={setMode}
          avisos={rev.count}
          onAvisos={() => setDialog('avisos')}
          onMaps={() => setDialog('maps')}
          onNew={() => setDialog('new')}
        />
        <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
          <BoardPanel map={map} sel={safeSel} onSelect={setSel} bad={rev.cells} history={{ canUndo, canRedo, onUndo: doUndo, onRedo: doRedo }} picker={modelo && picker && cell?.t === 'X' ? { cell, onPick: pickReward, onClose: closePicker } : null} overlay={modelo ? overlay : null} fitKey={modelo ? 'm' : 'a'} />
          {!mobile && <ModeloPanel map={map} active={modelo} onGo={setSel} onOverlay={setOverlay} />}
          {!modelo && (
          <Inspector
            sel={safeSel}
            cell={cell}
            rewardStats={st}
            onSet={set}
            onErase={() => set(null)}
            avisos={cerca}
            onGo={setSel}
            onFix={fixIssue}
            onAllAvisos={() => setDialog('avisos')}
          />
          )}
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
      {dialog === 'avisos' && (
        <AvisosDialog
          rev={rev}
          onClose={() => setDialog(null)}
          onGo={(rc) => {
            setSel(rc)
            setDialog(null)
          }}
          onFix={fixIssue}
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
          onExport={exportJson}
        />
      )}
    </div>
  )
}
