// Cliente del motor local: seguridad del token y lectura de historiales.
import assert from 'node:assert/strict'
import { ApiError, call, cleanServer, cleanToken, isLocalServer, parseCsv, tokenLooksValid } from '../src/lib/modelo.js'

// el token solo viaja a esta máquina
assert.ok(isLocalServer('http://127.0.0.1:8787'))
assert.ok(isLocalServer('http://localhost:9000'))
assert.ok(isLocalServer('http://[::1]:8787'))
for (const bad of ['http://evil.example.com:8787', 'http://127.0.0.1.evil.com', 'http://192.168.1.5:8787', 'ftp://127.0.0.1', 'javascript:alert(1)', '', 'no es url']) {
  assert.equal(isLocalServer(bad), false, bad)
}
assert.equal(cleanServer('127.0.0.1:8787/api/'), 'http://127.0.0.1:8787')
assert.equal(cleanServer(''), 'http://127.0.0.1:8787')

// call() se niega a hablar con un servidor ajeno ANTES de enviar nada
let sent = false
globalThis.fetch = async () => {
  sent = true
  return { ok: true, status: 200, json: async () => ({ ok: true }) }
}
await assert.rejects(call('http://evil.example.com', '/revisa', {}, undefined, 'tok'), (e) => e instanceof ApiError && !e.offline)
assert.equal(sent, false)

// y envía el token como Bearer, sin cookies ni referrer
let seen
globalThis.fetch = async (url, init) => {
  seen = { url, init }
  return { ok: true, status: 200, json: async () => ({ ok: true }) }
}
await call('http://127.0.0.1:8787', '/revisa', { a: 1 }, undefined, 'T'.repeat(43))
assert.equal(seen.url, 'http://127.0.0.1:8787/api/revisa')
assert.equal(seen.init.headers.Authorization, 'Bearer ' + 'T'.repeat(43))
assert.equal(seen.init.headers['Content-Type'], 'application/json')
assert.equal(seen.init.credentials, 'omit')
assert.equal(seen.init.referrerPolicy, 'no-referrer')
await call('http://127.0.0.1:8787', '/salud', undefined)
assert.equal(seen.init.headers.Authorization, undefined)
assert.equal(seen.init.method, undefined)

// 401 y 429 se distinguen; el motor apagado también
globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ ok: false, error: 'x' }) })
await assert.rejects(call('http://127.0.0.1:8787', '/revisa', {}), (e) => e.auth === true && /token/.test(e.message))
globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ ok: false }) })
await assert.rejects(call('http://127.0.0.1:8787', '/revisa', {}), (e) => e.limited === true)
globalThis.fetch = async () => {
  throw new TypeError('Failed to fetch')
}
await assert.rejects(call('http://127.0.0.1:8787', '/salud'), (e) => e.offline === true)

// token: se acepta lo que parece un token y se quita «Bearer »
assert.equal(cleanToken('  Bearer abc  '), 'abc')
assert.ok(tokenLooksValid('a'.repeat(43)))
assert.ok(tokenLooksValid('Ab_-'.repeat(11)))
for (const bad of ['', 'corto', 'a'.repeat(200), 'con espacios ' + 'a'.repeat(40), 'a'.repeat(42) + '<']) assert.equal(tokenLooksValid(bad), false, bad)

// CSV del motor (disparos.csv) → filas para /api/disparos/importar
const rows = parseCsv('fecha,mapa,fila,col,S,minas_nuevas,SP,SP_esp,S_esp,nota\r\n2026-10-22,5,8,2,17,3,104,88.9,13.4,\r\n2026-10-22,5,12,6,12,3,84,86.6,12.8,"a, b"\n\n')
assert.equal(rows.length, 2)
assert.deepEqual(rows[0], { fecha: '2026-10-22', mapa: '5', fila: '8', col: '2', S: '17', minas_nuevas: '3', SP: '104', SP_esp: '88.9', S_esp: '13.4', nota: '' })
assert.equal(rows[1].nota, 'a, b')
assert.deepEqual(parseCsv(''), [])
assert.deepEqual(parseCsv('solo,cabecera'), [])

console.log('OK modelo')
