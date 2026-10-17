import { useCallback, useEffect, useRef, useState } from 'react'
import { parse, serialize } from './codec'
import {
  fsSupported,
  getHandle,
  isAbort,
  permission,
  pickExisting,
  pickNew,
  readText,
  saveHandle,
  writeText,
} from './fileStore'
import { cloudConfigured, loadCloud } from './cloudConfig'

const LS_KEY = 'auditoria.v2' // texto JSON con el mismo formato que mapas.json (respaldo)
const LS_REV = 'auditoria.cloudrev' // {uid, rev}: última revisión de la nube que este navegador conoce
const LS_KEY_V1 = 'auditoria.v1' // formato anterior (ids con UUID); solo se lee para migrar

function newMap(id, name, cols, rows, mines) {
  return { id, name, cols, rows, mines, cells: {}, createdAt: Date.now(), updatedAt: Date.now() }
}

const nextId = (maps) => String(Math.max(0, ...maps.map((m) => Number(m.id))) + 1)

function migrateV1(s) {
  const sorted = [...s.maps].sort((a, b) => a.createdAt - b.createdAt)
  const ids = new Map(sorted.map((m, i) => [m.id, String(i + 1)]))
  return {
    maps: sorted.map((m) => ({ ...m, id: ids.get(m.id) })),
    currentId: ids.get(s.currentId) ?? '1',
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return parse(raw)
  } catch {
    /* seguir con el formato anterior */
  }
  try {
    const raw = localStorage.getItem(LS_KEY_V1)
    if (raw) {
      const s = JSON.parse(raw)
      if (s?.maps?.length) return migrateV1(s)
    }
  } catch {
    /* ignorar */
  }
  return { maps: [newMap('1', 'Mapa 1', 20, 20, 77)], currentId: '1' }
}

export function nextMapName(maps) {
  let max = 0
  for (const m of maps) {
    const n = /(\d+)\s*$/.exec(m.name)
    if (n) max = Math.max(max, Number(n[1]))
  }
  return `Mapa ${max + 1}`
}

const hasData = (s) => s.maps.some((m) => Object.keys(m.cells).length > 0)

function readKnownRev(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(LS_REV) ?? 'null')
    return v && v.uid === uid ? v.rev : null
  } catch {
    return null
  }
}
function saveKnownRev(uid, rev) {
  try {
    localStorage.setItem(LS_REV, JSON.stringify({ uid, rev }))
  } catch {
    /* ignorar */
  }
}
const IGNORED_AUTH = /popup-closed-by-user|cancelled-popup-request/

/**
 * Estado global. Fuente de verdad: el archivo mapas.json (si está vinculado);
 * localStorage queda como respaldo. Solo se guarda cuando el usuario lo pide (flush).
 * file.status:
 *  unsupported | checking | none | needs-permission | ready | invalid | error
 * cloud.status (Firebase, opcional; se guarda en el mismo Ctrl S):
 *  off | checking | signed-out | ready | conflict | error
 */
export function useStore() {
  const [state, setState] = useState(loadLocal)
  const [savedAt, setSavedAt] = useState(() => new Date())
  const [dirty, setDirty] = useState(false)
  const [file, setFile] = useState({
    status: fsSupported ? 'checking' : 'unsupported',
    name: '',
    message: '',
  })
  const [cloud, setCloud] = useState({
    status: cloudConfigured ? 'checking' : 'off',
    email: '',
    message: '',
  })
  const latest = useRef(state)
  latest.current = state
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  const cloudApi = useRef(null)
  const cloudUser = useRef(null)
  const cloudSt = useRef(cloud.status)
  const cloudRev = useRef(0) // revisión de la nube sobre la que está basado lo que ves
  const remoteRef = useRef(null) // versión de la nube en conflicto
  const putCloud = useCallback((patch) => {
    if (patch.status) cloudSt.current = patch.status
    setCloud((c) => ({ ...c, message: '', ...patch }))
  }, [])
  const handle = useRef(null)
  const pending = useRef(null) // handle recordado que espera permiso
  const localEdits = useRef(false) // hubo cambios mientras el archivo estaba desconectado
  const chain = useRef(Promise.resolve())

  // Guarda en la nube (si hay sesión). Resuelve true si salió bien o si no hay nube.
  const writeCloud = useCallback(async () => {
    const api = cloudApi.current
    const u = cloudUser.current
    if (!api || !u || cloudSt.current === 'checking' || cloudSt.current === 'signed-out') return true
    if (cloudSt.current === 'conflict') return false
    try {
      const rev = await api.saveDoc(u.uid, serialize(latest.current), cloudRev.current)
      cloudRev.current = rev
      saveKnownRev(u.uid, rev)
      putCloud({ status: 'ready' })
      return true
    } catch (e) {
      if (e instanceof api.ConflictError) {
        remoteRef.current = await api.fetchDoc(u.uid).catch(() => null)
        putCloud({ status: 'conflict' })
      } else {
        console.error(e)
        putCloud({ status: 'error', message: String(e?.message ?? e) })
      }
      return false
    }
  }, [putCloud])

  // Escribe localStorage, el archivo vinculado (si hay) y la nube (si hay sesión). true si todo salió bien.
  const writeAll = useCallback(async () => {
    try {
      localStorage.setItem(LS_KEY, serialize(latest.current))
    } catch {
      /* cuota llena */
    }
    let fileOk = true
    if (handle.current) {
      const h = handle.current
      chain.current = chain.current
        .then(() => writeText(h, serialize(latest.current)))
        .then(() => {
          setFile((f) => (f.status === 'error' ? { ...f, status: 'ready', message: '' } : f))
          return true
        })
        .catch((e) => {
          console.error(e)
          setFile((f) => ({ ...f, status: 'error', message: String(e?.message ?? e) }))
          return false
        })
      fileOk = await chain.current
    }
    const cloudOk = await writeCloud()
    return fileOk && cloudOk
  }, [writeCloud])

  // Guardado MANUAL (botón Guardar / Ctrl S). No hay autoguardado.
  const flush = useCallback(async () => {
    const ok = await writeAll()
    if (ok) {
      setSavedAt(new Date())
      setDirty(false)
    }
    return ok
  }, [writeAll])

  const update = useCallback((fn) => {
    setState((s) => fn(s))
    if (!handle.current && pending.current) localEdits.current = true
    setDirty(true)
  }, [])

  // Lee el archivo vinculado y lo adopta como estado. Archivo vacío → se escribe el estado actual.
  const adoptFile = useCallback(async (h, { preferLocal = false } = {}) => {
    const text = preferLocal ? '' : await readText(h)
    if (text.trim() === '') {
      handle.current = h
      await writeText(h, serialize(latest.current))
    } else {
      let next
      try {
        next = parse(text)
      } catch (e) {
        handle.current = null // no se escribe sobre un archivo que no entendemos
        setFile({ status: 'invalid', name: h.name, message: e.message })
        return false
      }
      handle.current = h
      setState(next)
      latest.current = next
      try {
        localStorage.setItem(LS_KEY, serialize(next))
      } catch {
        /* ignorar */
      }
    }
    pending.current = null
    localEdits.current = false
    setFile({ status: 'ready', name: h.name, message: '' })
    setSavedAt(new Date())
    setDirty(false)
    return true
  }, [])

  // Al abrir la app: recuperar el archivo recordado
  useEffect(() => {
    if (!fsSupported) return
    let dead = false
    ;(async () => {
      try {
        const h = await getHandle()
        if (dead) return
        if (!h) return setFile({ status: 'none', name: '', message: '' })
        if ((await permission(h)) === 'granted') await adoptFile(h)
        else {
          handle.current = null
          setFile({ status: 'needs-permission', name: h.name, message: '' })
          pending.current = h
        }
      } catch (e) {
        console.error(e)
        if (!dead) setFile({ status: 'none', name: '', message: '' })
      }
    })()
    return () => {
      dead = true
    }
  }, [adoptFile])

  const remember = async (h) => {
    try {
      await saveHandle(h)
    } catch (e) {
      console.warn('No se pudo recordar el archivo:', e) // seguirá funcionando en esta sesión
    }
  }

  /** Vuelve a dar permiso al archivo recordado (requiere clic). */
  const reconnect = useCallback(async () => {
    const h = pending.current ?? (await getHandle())
    if (!h) return setFile({ status: 'none', name: '', message: '' })
    try {
      if ((await permission(h, true)) === 'granted') await adoptFile(h, { preferLocal: localEdits.current })
    } catch (e) {
      if (!isAbort(e)) setFile({ status: 'error', name: h.name, message: String(e?.message ?? e) })
    }
  }, [adoptFile])

  /** Crea un mapas.json nuevo con los mapas actuales. */
  const linkNew = useCallback(async () => {
    try {
      const h = await pickNew()
      await permission(h, true)
      handle.current = h
      await remember(h)
      await writeText(h, serialize(latest.current))
      setFile({ status: 'ready', name: h.name, message: '' })
      setSavedAt(new Date())
      setDirty(false)
      return true
    } catch (e) {
      if (!isAbort(e)) setFile({ status: 'error', name: '', message: String(e?.message ?? e) })
      return false
    }
  }, [])

  /** Abre un mapas.json existente y reemplaza los mapas actuales por los suyos. */
  const linkExisting = useCallback(async () => {
    try {
      const h = await pickExisting()
      if ((await permission(h, true)) !== 'granted') return false
      const ok = await adoptFile(h)
      if (ok) await remember(h)
      return ok
    } catch (e) {
      if (!isAbort(e)) setFile({ status: 'error', name: '', message: String(e?.message ?? e) })
      return false
    }
  }, [adoptFile])

  // ---- Nube (Firebase) ----
  const adoptRemote = useCallback(
    (remote, uid) => {
      const next = parse(remote.text)
      setState(next)
      latest.current = next
      try {
        localStorage.setItem(LS_KEY, serialize(next))
      } catch {
        /* ignorar */
      }
      cloudRev.current = remote.rev
      saveKnownRev(uid, remote.rev)
      remoteRef.current = null
      setDirty(false)
      setSavedAt(new Date())
      putCloud({ status: 'ready' })
    },
    [putCloud],
  )

  // Al iniciar sesión (o al abrir la app con sesión recordada): comparar con la nube
  const syncDown = useCallback(
    async (u) => {
      const api = cloudApi.current
      putCloud({ status: 'checking', email: u.email })
      try {
        const remote = await api.fetchDoc(u.uid)
        if (!remote) {
          // la nube está vacía: se sube lo que hay
          cloudRev.current = 0
          putCloud({ status: 'ready' })
          if (await writeCloud()) {
            setSavedAt(new Date())
            setDirty(false)
          }
          return
        }
        const same = readKnownRev(u.uid) === remote.rev
        if (dirtyRef.current && same) {
          cloudRev.current = remote.rev // sigues sobre la última versión: tus cambios se suben al guardar
          putCloud({ status: 'ready' })
        } else if (!dirtyRef.current && (same || !hasData(latest.current))) {
          adoptRemote(remote, u.uid)
        } else {
          remoteRef.current = remote
          putCloud({ status: 'conflict' })
        }
      } catch (e) {
        console.error(e)
        putCloud({ status: 'error', message: String(e?.message ?? e) })
      }
    },
    [adoptRemote, putCloud, writeCloud],
  )

  useEffect(() => {
    if (!cloudConfigured) return
    let dead = false
    let off
    loadCloud()
      .then((api) => {
        if (dead) return
        cloudApi.current = api
        off = api.watchAuth((u) => {
          if (dead) return
          cloudUser.current = u
          if (u) syncDown(u)
          else putCloud({ status: 'signed-out', email: '' })
        })
      })
      .catch((e) => {
        console.error(e)
        if (!dead) putCloud({ status: 'error', message: String(e?.message ?? e) })
      })
    return () => {
      dead = true
      off?.()
    }
  }, [syncDown, putCloud])

  const cloudSignIn = useCallback(async () => {
    try {
      await cloudApi.current.signIn()
    } catch (e) {
      if (!IGNORED_AUTH.test(String(e?.code ?? e?.message ?? e))) {
        putCloud({ status: 'signed-out', message: String(e?.message ?? e) })
      }
    }
  }, [putCloud])

  const cloudSignOut = useCallback(() => cloudApi.current?.signOut(), [])

  /** Conflicto → quedarse con la versión de la nube (se pierde lo de este navegador). */
  const cloudUseRemote = useCallback(() => {
    const r = remoteRef.current
    if (!r || !cloudUser.current) return
    try {
      adoptRemote(r, cloudUser.current.uid)
    } catch (e) {
      putCloud({ status: 'error', message: String(e?.message ?? e) })
    }
  }, [adoptRemote, putCloud])

  /** Conflicto → sobrescribir la nube con lo de este navegador. */
  const cloudKeepLocal = useCallback(async () => {
    const r = remoteRef.current
    if (r) cloudRev.current = r.rev
    putCloud({ status: 'ready' })
    remoteRef.current = null
    if (await flush()) return true
    return false
  }, [flush, putCloud])

  // Si cierras o recargas con cambios sin guardar, el navegador pregunta antes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const map = state.maps.find((m) => m.id === state.currentId) ?? state.maps[0]

  const patchCells = useCallback(
    (fn) =>
      update((s) => ({
        ...s,
        maps: s.maps.map((m) =>
          m.id === s.currentId ? { ...m, cells: fn(m.cells), updatedAt: Date.now() } : m,
        ),
      })),
    [update],
  )

  const setCell = useCallback(
    (r, c, cell) =>
      patchCells((cells) => {
        const next = { ...cells }
        if (cell) next[`${r},${c}`] = cell
        else delete next[`${r},${c}`]
        return next
      }),
    [patchCells],
  )

  const createMap = useCallback(
    ({ name, cols, rows, mines }) =>
      update((s) => {
        const m = newMap(nextId(s.maps), name, cols, rows, mines)
        return { maps: [m, ...s.maps], currentId: m.id }
      }),
    [update],
  )

  // cambiar de mapa no es un cambio de datos: no marca "sin guardar"
  const openMap = useCallback((id) => setState((s) => ({ ...s, currentId: id })), [])

  const deleteMap = useCallback(
    (id) =>
      update((s) => {
        let maps = s.maps.filter((m) => m.id !== id)
        if (!maps.length) maps = [newMap('1', 'Mapa 1', 20, 20, 77)]
        const currentId = maps.some((m) => m.id === s.currentId) ? s.currentId : maps[0].id
        return { maps, currentId }
      }),
    [update],
  )

  return {
    state,
    map,
    savedAt,
    dirty,
    file,
    cloud,
    cloudSignIn,
    cloudSignOut,
    cloudUseRemote,
    cloudKeepLocal,
    flush,
    setCell,
    createMap,
    openMap,
    deleteMap,
    linkNew,
    linkExisting,
    reconnect,
    hasData: hasData(state),
  }
}
