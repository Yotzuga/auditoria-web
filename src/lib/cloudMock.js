// Nube simulada para las pruebas automáticas (VITE_CLOUD_MOCK=1). Guarda en localStorage.
const KEY = 'mock.cloud.doc'
const USER = 'mock.cloud.user'
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms))
let listeners = []

export class ConflictError extends Error {}

export const watchAuth = (cb) => {
  listeners.push(cb)
  wait().then(() => cb(JSON.parse(localStorage.getItem(USER) ?? 'null')))
  return () => (listeners = listeners.filter((l) => l !== cb))
}
export async function signIn() {
  await wait()
  if (localStorage.getItem('mock.cloud.fail') === 'signin') throw new Error('popup cerrado')
  const u = { uid: 'u1', email: 'yo@example.com' }
  localStorage.setItem(USER, JSON.stringify(u))
  listeners.forEach((l) => l(u))
}
export async function signOut() {
  await wait()
  localStorage.removeItem(USER)
  listeners.forEach((l) => l(null))
}
export async function fetchDoc() {
  await wait()
  const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
  return d && { text: d.text, rev: d.rev }
}
export async function saveDoc(_uid, text, knownRev) {
  await wait()
  if (localStorage.getItem('mock.cloud.fail') === 'save') throw new Error('sin conexión')
  const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
  const cur = d ? d.rev : 0
  if (cur !== knownRev) throw new ConflictError('conflicto')
  localStorage.setItem(KEY, JSON.stringify({ text, rev: cur + 1 }))
  return cur + 1
}
