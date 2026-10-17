// Acceso al archivo mapas.json con la File System Access API (Chrome / Edge).
// El "handle" del archivo se recuerda en IndexedDB para no volver a elegirlo.

const DB_NAME = 'auditoria'
const STORE = 'handles'
const KEY = 'mapas'

export const fsSupported =
  typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window

const PICKER_TYPES = [{ description: 'Mapas (JSON)', accept: { 'application/json': ['.json'] } }]

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idb(mode, fn) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const getHandle = () => idb('readonly', (s) => s.get(KEY))
export const saveHandle = (h) => idb('readwrite', (s) => s.put(h, KEY))

/** 'granted' | 'prompt' | 'denied'. Con request=true pide permiso (requiere un clic del usuario). */
export async function permission(handle, request = false) {
  const opts = { mode: 'readwrite' }
  let p = await handle.queryPermission(opts)
  if (p === 'prompt' && request) p = await handle.requestPermission(opts)
  return p
}

export async function readText(handle) {
  const file = await handle.getFile()
  return file.text()
}

export async function writeText(handle, text) {
  const w = await handle.createWritable()
  await w.write(text)
  await w.close()
}

export const pickNew = () =>
  window.showSaveFilePicker({ suggestedName: 'mapas.json', types: PICKER_TYPES, startIn: 'documents' })

export async function pickExisting() {
  const [h] = await window.showOpenFilePicker({ types: PICKER_TYPES, multiple: false, startIn: 'documents' })
  return h
}

export const isAbort = (e) => e?.name === 'AbortError'
