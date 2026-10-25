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
// O-EN-COMPLETO: una posible mina (r) junto a un número que ya tiene todas sus minas
assert.deepEqual(reglas(mapa(['x 1 r .', '. . . .', '. . . .'], 3)), ['O-EN-COMPLETO@0,2'])
const oc = revisar(mapa(['x 1 r .', '. . . .', '. . . .'], 3)).issues[0]
assert.match(oc.detail, /Fila 1 · Columna 2 marca 1/)
assert.equal(oc.fix, undefined)
assert.deepEqual(reglas(mapa(['Xv 2 r .', 'Xg . . .', '. . . .'], 3)), ['O-EN-COMPLETO@0,2']) // minas reveladas con recompensa
assert.deepEqual(reglas(mapa(['x 2 r .', '. . . .', '. . . .'], 3)), []) // pista incompleta: la r puede ser mina
assert.deepEqual(reglas(mapa(['x 1 . .', '. . . r', '. . . .'], 3)), []) // r lejos de la pista
assert.deepEqual(reglas(mapa(['x k1 r .', '. . . .', '. . . .'], 3)), ['O-EN-COMPLETO@0,2']) // número conocido (k)
assert.deepEqual(reglas(mapa(['x 1 x .', '. . . .', '. . . .'], 3)), ['EXCESO@0,1']) // exceso: sigue siendo EXCESO
assert.deepEqual(reglas(mapa(['x 1 r 1', '. . . x', '. . . .'], 3)), ['O-EN-COMPLETO@0,2']) // junto a dos pistas completas: un solo aviso
// O-EN-CERO: una posible mina (r) junto a un cero (0 revelado o q deducido); manda sobre O-EN-COMPLETO
assert.deepEqual(reglas(mapa(['0 r . .', '. . . .', '. . . .'], 3)), ['O-EN-CERO@0,1'])
assert.deepEqual(reglas(mapa(['q r . .', '. . . .', '. . . .'], 3)), ['O-EN-CERO@0,1'])
assert.deepEqual(reglas(mapa(['x 1 r 0', '. . . .', '. . . .'], 3)), ['O-EN-CERO@0,2'])
assert.deepEqual(reglas(mapa(['0 . . r', '. . . .', '. . . .'], 3)), []) // lejos del cero
assert.match(revisar(mapa(['0 r . .', '. . . .', '. . . .'], 3)).issues[0].detail, /Fila 1 · Columna 1 es un cero/)
// MINAS-FALTAN: aviso suave (no cuenta ni pinta la casilla). 'w' = relleno resuelto que no es pista ni mina
const mf5 = revisar(mapa(['1 . w', 'w w w'], 3)) // el 1 solo tiene una casilla posible: es mina
assert.deepEqual(mf5.issues.map((i) => `${i.rule}@${i.r},${i.c}`), ['MINAS-FALTAN@0,0'])
assert.equal(mf5.issues[0].soft, true)
assert.equal(mf5.count, 0)
assert.equal(mf5.cells.size, 0)
assert.deepEqual(reglas(mapa(['. 1 .', 'w w w'], 3)), []) // dos posibles para una mina: no se puede decidir
assert.deepEqual(reglas(mapa(['1 r w', 'w w w'], 3)), []) // ya está marcada como r: nada que avisar
assert.deepEqual(reglas(mapa(['. 2 r', 'w w w'], 3)), ['MINAS-FALTAN@0,1']) // una vacía y una r: falta marcar la vacía
assert.deepEqual(reglas(mapa(['x 2 . w', 'w w w w'], 3)), ['MINAS-FALTAN@0,1']) // cuenta las minas ya marcadas
assert.deepEqual(reglas(mapa(['x 1 . w', 'w w w w'], 3)), []) // ya tiene todas sus minas (completo): nada que marcar
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
