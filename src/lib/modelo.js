// Cliente de la API local de bm2 (buscaminas_v2/API.md).
// El servidor corre en la PC del usuario: `python bm2.py servir` → http://127.0.0.1:8787
// Seguridad: todas las rutas (salvo /salud) piden «Authorization: Bearer <token>». El token se crea la primera vez
// que se arranca el servidor (data/.token). Solo se envía a un servidor de ESTA máquina (127.0.0.1 / localhost / ::1).
import { encodeBoard } from './codec.js'

export const DEFAULT_SERVER = 'http://127.0.0.1:8787'
const KEY = 'auditoria.modelo.servidor'
const TOKEN_KEY = 'auditoria.modelo.token'

const read = (k) => {
  try {
    return localStorage.getItem(k) || ''
  } catch {
    return ''
  }
}
const write = (k, v) => {
  try {
    if (v) localStorage.setItem(k, v)
    else localStorage.removeItem(k)
  } catch {
    /* sin almacenamiento: se usa solo en esta sesión */
  }
}

export const loadServer = () => read(KEY) || DEFAULT_SERVER
export const saveServer = (url) => write(KEY, url)
export const loadToken = () => read(TOKEN_KEY)
export const saveToken = (t) => write(TOKEN_KEY, t)

/** El token es una cadena url-safe de 43 caracteres; se acepta solo lo que parezca uno. */
export const cleanToken = (t) => String(t || '').trim().replace(/^Bearer\s+/i, '')
export const tokenLooksValid = (t) => /^[A-Za-z0-9_-]{32,128}$/.test(t)

/** ¿La dirección apunta a esta misma máquina? (el token no debe salir de ella) */
export function isLocalServer(url) {
  try {
    const u = new URL(url)
    return (u.protocol === 'http:' || u.protocol === 'https:') && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)
  } catch {
    return false
  }
}

/** "127.0.0.1:8787/" → "http://127.0.0.1:8787" (sin barra final ni "/api"). */
export function cleanServer(text) {
  let u = String(text || '').trim()
  if (!u) return DEFAULT_SERVER
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u
  return u.replace(/\/+$/, '').replace(/\/api$/i, '')
}

/** Puerto de la dirección (para armar el comando `--puerto`). */
export function portOf(url) {
  try {
    return new URL(url).port || '80'
  } catch {
    return '8787'
  }
}

/** El mapa tal como se ve en pantalla (aunque no esté guardado), en el formato de la API. */
export function boardBody(map) {
  return {
    mapa: String(map.id),
    nombre: map.name,
    minas: map.mines,
    tablero: encodeBoard(map.cells, map.cols, map.rows),
  }
}

/** Huella del tablero: si cambia, lo que calculó el motor ya no corresponde a lo que se ve. */
export const boardKey = (map) => `${map.id}|${map.mines}|${encodeBoard(map.cells, map.cols, map.rows).join('/')}`

export class ApiError extends Error {
  constructor(message, { offline = false, status = 0, data = null } = {}) {
    super(message)
    this.offline = offline // no se pudo hablar con el servidor
    this.auth = status === 401 // falta el token o no es el correcto
    this.limited = status === 429
    this.status = status
    this.data = data
  }
}

/** GET (sin cuerpo) o POST (con cuerpo JSON). Devuelve el JSON con `ok: true` o lanza ApiError. */
export async function call(server, ruta, cuerpo, signal, token = '') {
  if (!isLocalServer(server)) {
    throw new ApiError('El motor solo puede estar en esta PC (127.0.0.1 o localhost).')
  }
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(server + '/api' + ruta, {
      signal,
      headers,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      ...(cuerpo === undefined ? {} : { method: 'POST', body: JSON.stringify(cuerpo) }),
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new ApiError('No se pudo conectar con el motor local', { offline: true })
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok || !data || data.ok === false) {
    const msg =
      res.status === 401
        ? 'El motor pide un token válido'
        : res.status === 429
          ? 'Demasiados intentos con token incorrecto: espera un minuto'
          : data?.error || `El motor respondió ${res.status}`
    throw new ApiError(msg, { status: res.status, data })
  }
  return data
}

export const hhmm = (iso) => {
  const d = iso instanceof Date ? iso : new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}
export const hhmmss = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** "Filas 5–7 · Col 7–9" de una ventana de la API (1-index). */
export const windowText = (w) => (w ? `Filas ${w.f0}–${w.f1} · Col ${w.c0}–${w.c1}` : '')

/** Parser mínimo de CSV (comillas dobles, separador coma). Devuelve filas como objetos según la cabecera. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let q = false
  const s = String(text).replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) {
      if (ch === '"' && s[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      row.push(cur)
      cur = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cur)
      cur = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur)
  if (row.some((x) => x !== '')) rows.push(row)
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
}
