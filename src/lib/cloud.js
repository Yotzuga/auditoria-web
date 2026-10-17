import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, connectAuthEmulator, getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore, runTransaction } from 'firebase/firestore'
import { firebaseConfig } from './cloudConfig'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Solo para pruebas locales con los emuladores de Firebase (npx firebase emulators:start)
if (import.meta.env.VITE_FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const ref = (uid) => doc(db, 'mapas', uid)

/** Marca de conflicto: otro dispositivo guardó una versión más nueva. */
export class ConflictError extends Error {}

export const watchAuth = (cb) =>
  onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email ?? '' } : null))

export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider())
export const signOut = () => fbSignOut(auth)

/** Lee el documento de la nube → { text, rev } (text = JSON con el formato de mapas.json) o null si no existe. */
export async function fetchDoc(uid) {
  const snap = await getDoc(ref(uid))
  if (!snap.exists()) return null
  const { _rev = 0, _por, ...data } = snap.data()
  return { text: JSON.stringify(data), rev: _rev }
}

/**
 * Guarda `text` solo si la nube sigue en la revisión `knownRev` (la que cargamos).
 * Devuelve la nueva revisión. Lanza ConflictError si otro dispositivo guardó antes.
 */
export function saveDoc(uid, text, knownRev) {
  const data = JSON.parse(text)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(uid))
    const cloudRev = snap.exists() ? (snap.data()._rev ?? 0) : 0
    if (cloudRev !== knownRev) throw new ConflictError('La nube tiene una versión distinta')
    const rev = cloudRev + 1
    tx.set(ref(uid), { ...data, _rev: rev })
    return rev
  })
}
