import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages sirve en /nombre-del-repo/; el workflow define VITE_BASE. En local queda '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    // al guardar, mapas.json cambia: que el servidor de desarrollo no lo vigile (evita recargas y parpadeos)
    watch: { ignored: ['**/data/**'] },
  },
})
