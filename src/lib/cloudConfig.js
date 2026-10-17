// Config pública de Firebase (no es secreta: la protegen las reglas de Firestore).
// Se lee de variables VITE_FIREBASE_* (.env.local en tu PC, "Variables" del repo en GitHub).
// (se escriben completas: vite.config.js las reemplaza como texto, y así tolera archivos .env con BOM)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// nombres de variables que llegaron vacías (para el aviso de desarrollo)
export const missingVars = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

export const cloudConfigured =
  Boolean(import.meta.env.VITE_CLOUD_MOCK) || // solo para pruebas automáticas
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)

// Se carga bajo demanda: sin configuración, Firebase ni se descarga.
export const loadCloud = () =>
  import.meta.env.VITE_CLOUD_MOCK ? import('./cloudMock.js') : import('./cloud.js')
