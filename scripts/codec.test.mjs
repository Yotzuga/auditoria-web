import { serialize, parse, encodeCell, decodeCell } from '../src/lib/codec.js'
import assert from 'node:assert/strict'
// ida y vuelta por casilla
const cells = [null,{t:'zero'},{t:'num',v:5},{t:'known',v:3},{t:'x'},{t:'X'},{t:'X',reward:'gachas'},{t:'O'},{t:'dash'},{t:'hash'},{t:'red'}]
for (const c of cells) assert.deepEqual(decodeCell(encodeCell(c)), c, JSON.stringify(c))
for (const r of ['plinko','mines','gachas','cartas','variado']) assert.deepEqual(decodeCell(encodeCell({t:'X',reward:r})), {t:'X',reward:r})
assert.equal(decodeCell('z'), undefined); assert.equal(decodeCell('k9'), undefined); assert.equal(decodeCell('Xz'), undefined); assert.equal(decodeCell('9'), undefined)
// estado completo
const st = { currentId: '2', maps: [
  { id:'2', name:'Mapa 2', cols:6, rows:3, mines:7, createdAt: Date.UTC(2026,9,17,19,0), updatedAt: Date.UTC(2026,9,17,19,30),
    cells: {'0,0':{t:'zero'},'0,1':{t:'num',v:1},'0,2':{t:'known',v:2},'1,3':{t:'X',reward:'gachas'},'1,4':{t:'x'},'2,5':{t:'O'},'2,0':{t:'dash'},'2,1':{t:'hash'},'2,2':{t:'red'}} },
  { id:'10', name:'Mapa 10', cols:5, rows:5, mines:3, createdAt: 1, updatedAt: 2, cells:{} },
  { id:'1', name:'Mapa 1', cols:5, rows:5, mines:3, createdAt: 1, updatedAt: 2, cells:{} },
]}
const txt = serialize(st)
const back = parse(txt)
assert.equal(back.currentId,'2')
assert.deepEqual(back.maps.map(m=>m.id),['1','2','10'])  // orden numérico
const m2 = back.maps.find(m=>m.id==='2')
assert.deepEqual(m2.cells, st.maps[0].cells); assert.equal(m2.rows,3); assert.equal(m2.createdAt, Math.floor(Date.UTC(2026,9,17,19,0)/1000)*1000)
// errores claros
for (const [bad,msg] of [['{','JSON'],['{}','mapas'],['{"mapas":{"a":{}}}','número'],['{"mapas":{"1":{"cols":0,"filas":5,"minas":1}}}','enteros'],['{"mapas":{}}','no tiene mapas']]) {
  assert.throws(()=>parse(bad), new RegExp(msg), bad)
}
// código inválido se ignora, no rompe
const t2 = parse(JSON.stringify({mapas:{1:{cols:3,filas:1,minas:1,tablero:['1 zz x']}}}))
assert.deepEqual(t2.maps[0].cells,{'0,0':{t:'num',v:1},'0,2':{t:'x'}})
console.log('OK codec')
