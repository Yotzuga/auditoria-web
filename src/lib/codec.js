// Formato del archivo mapas.json
//
// {
//   "version": 1,
//   "actual": "2",
//   "mapas": {
//     "1": {
//       "nombre": "Mapa 1", "cols": 20, "filas": 20, "minas": 77,
//       "creado": "2026-10-16T22:10:00-05:00", "editado": "2026-10-17T14:32:00-05:00",
//       "tablero": [ ". . 0 1 k2 w x", "q 0 1 Xg x e r" ]      // una cadena por fila
//     }
//   }
// }
//
// Códigos de casilla (separados por espacio dentro de cada fila):
//   .  sin definir      0  cero revelado     1-8  número revelado    k1-k8  número conocido
//   x  mina identificada   X  mina revelada (+ p/m/g/c/v = recompensa)   r  posible mina
//   q  posible nº (-)   w  nº seguro (#)     e  sin certeza (- rojo)
//
// Las estadísticas (marcadas, reveladas, total, recompensas, estado) NO se guardan: se calculan.

const REWARD_CODE = { plinko: 'p', mines: 'm', gachas: 'g', cartas: 'c', variado: 'v' }
const CODE_REWARD = Object.fromEntries(Object.entries(REWARD_CODE).map(([k, v]) => [v, k]))

export const FORMAT_VERSION = 1

export function encodeCell(cell) {
  if (!cell) return '.'
  switch (cell.t) {
    case 'zero': return '0'
    case 'num': return String(cell.v)
    case 'known': return `k${cell.v}`
    case 'x': return 'x'
    case 'X': return 'X' + (REWARD_CODE[cell.reward] ?? '')
    case 'O': return 'r'
    case 'dash': return 'q'
    case 'hash': return 'w'
    case 'red': return 'e'
    default: return '.'
  }
}

/** Devuelve la casilla, null si está vacía, o undefined si el código no es válido. */
export function decodeCell(tok) {
  if (tok === '.' || tok === '') return null
  if (tok === '0') return { t: 'zero' }
  if (/^[1-8]$/.test(tok)) return { t: 'num', v: Number(tok) }
  if (/^k[1-8]$/.test(tok)) return { t: 'known', v: Number(tok[1]) }
  if (tok === 'x') return { t: 'x' }
  if (tok === 'X') return { t: 'X' }
  if (/^X[pmgcv]$/.test(tok)) return { t: 'X', reward: CODE_REWARD[tok[1]] }
  if (tok === 'r') return { t: 'O' }
  if (tok === 'q') return { t: 'dash' }
  if (tok === 'w') return { t: 'hash' }
  if (tok === 'e') return { t: 'red' }
  return undefined
}

export function encodeBoard(cells, cols, rows) {
  const out = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) row.push(encodeCell(cells[`${r},${c}`]))
    out.push(row.join(' '))
  }
  return out
}

export function decodeBoard(tablero, cols, rows) {
  const cells = {}
  const bad = []
  for (let r = 0; r < rows; r++) {
    const toks = String(tablero?.[r] ?? '').trim().split(/\s+/)
    for (let c = 0; c < cols; c++) {
      const cell = decodeCell(toks[c] ?? '.')
      if (cell === undefined) bad.push(`fila ${r + 1}, col ${c + 1}: "${toks[c]}"`)
      else if (cell) cells[`${r},${c}`] = cell
    }
  }
  return { cells, bad }
}

function isoLocal(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const a = Math.abs(off)
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(a / 60))}:${p(a % 60)}`
  )
}

const toMs = (s) => {
  const t = Date.parse(s)
  return Number.isNaN(t) ? Date.now() : t
}

/** Estado interno → texto JSON para el archivo. */
export function serialize(state) {
  const mapas = {}
  for (const m of [...state.maps].sort((a, b) => Number(a.id) - Number(b.id))) {
    mapas[m.id] = {
      nombre: m.name,
      cols: m.cols,
      filas: m.rows,
      minas: m.mines,
      creado: isoLocal(m.createdAt),
      editado: isoLocal(m.updatedAt),
      tablero: encodeBoard(m.cells, m.cols, m.rows),
    }
  }
  return JSON.stringify({ version: FORMAT_VERSION, actual: state.currentId, mapas }, null, 2) + '\n'
}

const posInt = (n) => Number.isInteger(n) && n > 0

/** Texto JSON del archivo → estado interno. Lanza Error con un mensaje claro si no es válido. */
export function parse(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }
  if (!raw || typeof raw.mapas !== 'object' || Array.isArray(raw.mapas)) {
    throw new Error('Falta la sección "mapas"')
  }
  const maps = []
  for (const [id, m] of Object.entries(raw.mapas)) {
    if (!/^\d+$/.test(id)) throw new Error(`La llave del mapa "${id}" debe ser un número`)
    if (!posInt(m.cols) || !posInt(m.filas) || !posInt(m.minas)) {
      throw new Error(`Mapa ${id}: cols, filas y minas deben ser enteros positivos`)
    }
    const { cells, bad } = decodeBoard(m.tablero, m.cols, m.filas)
    if (bad.length) console.warn(`Mapa ${id}: códigos no válidos ignorados →`, bad.join('; '))
    maps.push({
      id,
      name: String(m.nombre ?? `Mapa ${id}`),
      cols: m.cols,
      rows: m.filas,
      mines: m.minas,
      cells,
      createdAt: toMs(m.creado),
      updatedAt: toMs(m.editado),
    })
  }
  if (!maps.length) throw new Error('El archivo no tiene mapas')
  const currentId = maps.some((m) => m.id === String(raw.actual)) ? String(raw.actual) : maps[0].id
  return { maps, currentId }
}
