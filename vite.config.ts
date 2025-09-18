import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const REPO = 'AXIOM_DEMO_UI'
const isCI = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: isCI ? `/${REPO}/` : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@app': fileURLToPath(new URL('./app', import.meta.url)),
      '@styles': fileURLToPath(new URL('./styles', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
      '@components': fileURLToPath(new URL('./components', import.meta.url)),
      '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false,
  },
})
