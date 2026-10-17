import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const FIREBASE_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

export default defineConfig(({ mode }) => {
  // El Bloc de notas y PowerShell 5 guardan .env.local con una marca invisible (BOM) y Vite pierde la
  // primera variable. Aquí la recuperamos para que funcione con cualquier editor.
  const raw = loadEnv(mode, process.cwd(), '')
  const env = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replace(/^﻿/, ''), v]))
  const define = {}
  for (const k of FIREBASE_VARS) {
    if (env[k]) define[`import.meta.env.${k}`] = JSON.stringify(env[k])
  }

  return {
    // GitHub Pages sirve en /nombre-del-repo/; el workflow define VITE_BASE. En local queda '/'.
    base: process.env.VITE_BASE || '/',
    build: { chunkSizeWarningLimit: 700 }, // Firebase se carga aparte y solo si hay nube configurada
    plugins: [react(), tailwindcss()],
    define,
    server: {
      // al guardar, mapas.json cambia: que el servidor de desarrollo no lo vigile (evita recargas y parpadeos)
      watch: { ignored: ['**/data/**'] },
    },
  }
})
