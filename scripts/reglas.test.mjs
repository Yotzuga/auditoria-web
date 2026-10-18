import assert from 'node:assert/strict'
import { parse } from '../src/lib/codec.js'
import { revisar, cercanas } from '../src/lib/reglas.js'

const mapa = (tablero, minas = 9) => {
  const filas = tablero.length
  const cols = tablero[0].split(' ').length
  return parse(
    JSON.stringify({
      version: 1, actual: '1',
      mapas: { 1: { nombre: 't', cols, filas, minas, creado: '2026-10-18T00:00:00-05:00', editado: '2026-10-18T00:00:00-05:00', tablero } },
    }),
  ).maps[0]
}
const reglas = (m) => revisar(m).issues.map((i) => `${i.rule}@${i.r},${i.c}`).sort()

// tablero coherente: sin avisos
assert.deepEqual(reglas(mapa(['1 x', '1 1'], 1)), [])
// EXCESO: un 1 con dos minas confirmadas
assert.deepEqual(reglas(mapa(['x x .', '1 . .', '. . .'])), ['EXCESO@1,0'])
// INSUF: un 3 rodeado de casillas resueltas ('0' no es mina ni posible)
assert.ok(reglas(mapa(['0 0 0', '0 3 0', '0 0 0'])).includes('INSUF@1,1'))
// una casilla sin explorar o una posible mina SÍ cuentan como posibles: no hay INSUF
assert.deepEqual(reglas(mapa(['. . .', '. 3 .', '. . .'])), [])
assert.deepEqual(reglas(mapa(['r r r', '. 3 .', '. . .'])), [])
// números conocidos (k)
assert.deepEqual(reglas(mapa(['x x', 'k1 .'])), ['EXCESO-k@1,0'])
assert.ok(reglas(mapa(['0 0', 'k3 0'])).includes('INSUF-k@1,0'))
// PROMO: "–" rojo junto a una mina, con arreglo a "#"
const promo = revisar(mapa(['x e', '. .']))
assert.deepEqual(promo.issues.map((i) => i.rule), ['PROMO'])
assert.deepEqual(promo.issues[0].fix, { t: 'hash' })
// ANOM#: "#" sin vecinos sin resolver y sin mina
assert.ok(reglas(mapa(['w 0', '0 0'])).includes('ANOM#@0,0'))
assert.deepEqual(reglas(mapa(['w .', '. .'])), []) // con vecinos sin explorar es normal
// CERO-MINA: cero revelado ("0") o deducido ("q") con mina al lado
assert.deepEqual(reglas(mapa(['x 0'], 1)), ['CERO-MINA@0,1'])
assert.deepEqual(reglas(mapa(['X q'], 1)), ['CERO-MINA@0,1'])
// TOTAL: más minas marcadas que el total (x + X)
const total = revisar(mapa(['x X x'], 2))
assert.deepEqual(total.issues.map((i) => i.rule), ['TOTAL'])
assert.equal(total.issues[0].r, null)
assert.equal(total.cells.size, 0)
// cercanas: avisos de la casilla y de las pistas vecinas, no los lejanos ni el TOTAL
const m = mapa(['x x . . .', '1 . . . .', '. . . . .', '. . . . .'])
const rev = revisar(m)
assert.equal(cercanas(rev, { r: 0, c: 1 }).length, 1) // el 1 de (1,0) es vecino de (0,1)
assert.equal(cercanas(rev, { r: 3, c: 0 }).length, 0)
console.log('OK reglas')
