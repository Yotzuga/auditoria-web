// Tipos de casilla (notación de la hoja "Mine"):
//  x     mina identificada, sin revelar
//  X     mina revelada (lleva recompensa)
//  O     posible mina
//  dash  "–" blanco  → posible nº / cero deducido
//  hash  "#"         → nº seguro (valor desconocido)
//  red   "–" rojo    → seguro, sin certeza de si es número
//  zero  "–" negro   → cero revelado
//  num   1–8         → número revelado
//  known 1–8 (hidden)→ número conocido, aún sin revelar
export const NUM_COLORS = {
  1: '#60A5FA',
  2: '#4ADE80',
  3: '#F87171',
  4: '#A78BFA',
  5: '#FB923C',
  6: '#22D3EE',
  7: '#E5E7EB',
  8: '#9CA3AF',
}

export const OPEN_KINDS = new Set(['zero', 'num'])

export const isMine = (c) => c && (c.t === 'x' || c.t === 'X')

export const key = (r, c) => `${r},${c}`

export function describe(cell) {
  if (!cell) return 'Sin definir'
  switch (cell.t) {
    case 'x':
      return 'Mina identificada'
    case 'X':
      return 'Mina revelada'
    case 'O':
      return 'Posible mina'
    case 'dash':
      return 'Posible nº'
    case 'hash':
      return 'Nº seguro'
    case 'red':
      return 'Sin certeza'
    case 'zero':
      return 'Cero'
    case 'num':
      return `Número ${cell.v}`
    case 'known':
      return `Nº conocido ${cell.v}`
    default:
      return 'Sin definir'
  }
}

export function stats(map) {
  let x = 0
  let X = 0
  const rewards = { plinko: 0, mines: 0, gachas: 0, cartas: 0, variado: 0 }
  for (const cell of Object.values(map.cells)) {
    if (cell.t === 'x') x++
    else if (cell.t === 'X') {
      X++
      if (cell.reward) rewards[cell.reward]++
    }
  }
  const rewardTotal = Object.values(rewards).reduce((a, b) => a + b, 0)
  return { x, X, total: x + X, rewards, rewardTotal }
}

export function mapStatus(map) {
  const { total } = stats(map)
  if (total === 0) return 'empty'
  if (total >= map.mines) return 'done'
  return 'running'
}
