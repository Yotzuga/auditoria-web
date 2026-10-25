// Reglas del buscaminas inverso. Es la misma lógica que issues.py (herramientas de Python):
// si cambias una, cambia la otra. Solo AVISAN; nunca impiden editar.
//
// Casillas que cuentan como mina: x y X. Como "posible mina o sin explorar": r (O) y las vacías.
//  EXCESO    número con más minas confirmadas alrededor que su valor
//  INSUF     número que no llega a su valor ni contando posibles minas y casillas sin explorar
//  EXCESO-k / INSUF-k   lo mismo para un número conocido (k1-k8), que se revisa como una pista
//  PROMO     "–" rojo junto a una mina confirmada: debería ser "#" (corregible con un toque)
//  ANOM#     "#" con los 8 vecinos resueltos y sin ninguna mina
//  CERO-MINA cero (revelado o deducido) con una mina confirmada alrededor
//  O-EN-CERO posible mina (O) junto a un cero (revelado o deducido): un cero no tiene minas alrededor
//  O-EN-COMPLETO  posible mina (O) junto a un número (o k) que ya tiene todas sus minas marcadas: no puede ser mina
//  MINAS-FALTAN  (solo aquí, aviso suave: no cuenta en el contador ni marca la casilla) un número cuyas minas restantes
//                son tantas como casillas posibles que le quedan: todas son mina y falta marcarlas. En el motor
//                local equivale a «MINAS SEGURAS aún sin marcar» de la pantalla Revisar.
//  TOTAL     más minas marcadas (x + X) que el total del mapa

const K = (r, c) => `${r},${c}`

/** M mina · P posible mina/sin explorar · N número · Hk nº conocido · H "#" · R "–" rojo · Z cero · W "–" blanco */
function clase(cell) {
  if (!cell) return 'P'
  switch (cell.t) {
    case 'x':
    case 'X':
      return 'M'
    case 'O':
      return 'P'
    case 'num':
      return 'N'
    case 'known':
      return 'Hk'
    case 'hash':
      return 'H'
    case 'red':
      return 'R'
    case 'zero':
      return 'Z'
    case 'dash':
      return 'W'
    default:
      return 'P'
  }
}

/** ¿Alguna de las casillas posibles alrededor está vacía (no marcada como "r")? */
function sinMarcar(cls, cells, r, c, rows, cols) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr
      const cc = c + dc
      if ((!dr && !dc) || rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
      if (cls[rr][cc] === 'P' && cells[K(rr, cc)]?.t !== 'O') return true
    }
  }
  return false
}

export const nombre = (r, c) => `Fila ${r + 1} · Columna ${c + 1}`

/** Revisa un mapa. → { issues, cells (Set "r,c"), count } */
export function revisar(map) {
  const { rows, cols, cells } = map
  const cls = []
  let found = 0
  for (let r = 0; r < rows; r++) {
    const line = []
    for (let c = 0; c < cols; c++) {
      const k = clase(cells[K(r, c)])
      if (k === 'M') found++
      line.push(k)
    }
    cls.push(line)
  }

  const issues = []
  const completos = new Map() // pistas (número o k) con todas sus minas marcadas: "r,c" → { r, c, v }
  const add = (rule, r, c, title, detail, fix, soft) =>
    issues.push({ id: `${rule}:${r},${c}`, rule, r, c, title, detail, fix, ...(soft ? { soft: true } : null) })

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = cls[r][c]
      if (k === 'P' || k === 'M') continue // vacías, posibles minas y minas no son pistas
      let m = 0
      let pot = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue
          const q = cls[rr][cc]
          if (q === 'M') m++
          else if (q === 'P') pot++
        }
      }
      const cell = cells[K(r, c)]
      if (k === 'Hk' || k === 'N') {
        const v = cell.v
        const lbl = k === 'Hk' ? `Nº conocido ${v}` : `Nº ${v}`
        const rule = k === 'Hk' ? '-k' : ''
        if (m === v) completos.set(K(r, c), { r, c, v })
        // faltan tantas minas como casillas posibles: todas lo son. Si ya están todas como "r" no hay nada que avisar.
        if (pot > 0 && m < v && m + pot === v && sinMarcar(cls, cells, r, c, rows, cols)) {
          add(
            'MINAS-FALTAN', r, c, `${lbl}: faltan minas por marcar`,
            `Necesita ${v - m} más y tiene exactamente ${pot} casilla${pot === 1 ? '' : 's'} posible${pot === 1 ? '' : 's'}: todas son mina.`,
            undefined, true,
          )
        }
        if (m > v) {
          add(
            'EXCESO' + rule, r, c, `${lbl}: demasiadas minas`,
            `Tiene ${m} minas confirmadas alrededor y solo debería tener ${v}.`,
          )
        } else if (m + pot < v) {
          add(
            'INSUF' + rule, r, c, `${lbl}: faltan minas posibles`,
            `Necesita ${v}, pero aun contando posibles minas y casillas sin explorar solo llega a ${m + pot}.`,
          )
        }
      }
      if (k === 'R' && m > 0) {
        add(
          'PROMO', r, c, '"–" rojo junto a una mina',
          'Está al lado de una mina confirmada, así que es un número seguro: debería ser "#".',
          { t: 'hash' },
        )
      }
      if (k === 'H' && m === 0 && pot === 0) {
        add('ANOM#', r, c, '"#" sin salida', 'Es un número seguro, pero sus 8 vecinos ya están resueltos y ninguno es mina.')
      }
      if ((k === 'Z' || k === 'W') && m > 0) {
        add('CERO-MINA', r, c, 'Cero con mina alrededor', `Un cero no puede tener minas a su lado y tiene ${m}.`)
      }
    }
  }
  // una posible mina (O) no puede tocar un cero ni una pista completa: se avisa en la O, que es la que hay que corregir
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[K(r, c)]?.t !== 'O') continue
      let cero = null
      let pista = null
      for (let dr = -1; dr <= 1 && !cero; dr++) {
        for (let dc = -1; dc <= 1 && !cero; dc++) {
          const rr = r + dr
          const cc = c + dc
          if ((dr || dc) && rr >= 0 && cc >= 0 && rr < rows && cc < cols && (cls[rr][cc] === 'Z' || cls[rr][cc] === 'W')) cero = { r: rr, c: cc }
        }
      }
      if (cero) {
        add(
          'O-EN-CERO', r, c, 'Posible mina junto a un cero',
          `${nombre(cero.r, cero.c)} es un cero: no tiene minas alrededor, así que esta casilla no puede ser mina.`,
        )
        continue
      }
      for (let dr = -1; dr <= 1 && !pista; dr++) {
        for (let dc = -1; dc <= 1 && !pista; dc++) {
          if (dr || dc) pista = completos.get(K(r + dr, c + dc)) || null
        }
      }
      if (pista) {
        add(
          'O-EN-COMPLETO', r, c, 'Posible mina junto a un número completo',
          `${nombre(pista.r, pista.c)} marca ${pista.v} y ya tiene todas sus minas (x o X): esta casilla no puede ser mina.`,
        )
      }
    }
  }
  if (found > map.mines) {
    issues.push({
      id: 'TOTAL', rule: 'TOTAL', r: null, c: null, title: 'Más minas que el total del mapa',
      detail: `Hay ${found} minas marcadas (x + X) y el mapa solo tiene ${map.mines}.`,
    })
  }
  // los avisos suaves se muestran junto a la casilla elegida, pero no inflan el contador ni pintan la casilla
  const duros = issues.filter((i) => !i.soft)
  return { issues, cells: new Set(duros.filter((i) => i.r != null).map((i) => K(i.r, i.c))), count: duros.length }
}

/** Avisos que tocan la casilla seleccionada: los suyos y los de las pistas de sus 8 vecinos. */
export function cercanas(rev, sel) {
  return rev.issues.filter((i) => i.r != null && Math.abs(i.r - sel.r) <= 1 && Math.abs(i.c - sel.c) <= 1)
}
