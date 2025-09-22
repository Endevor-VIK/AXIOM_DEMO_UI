import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const REPO = 'AXIOM_DEMO_UI'
const isCI = process.env.GITHUB_ACTIONS === 'true'
const DEV_HOST = process.env.DEV_HOST || ''  // set to "192.168.0.11" for LAN
const PORT = Number(process.env.PORT || 5173)

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
    host: DEV_HOST || true,          // 0.0.0.0 if empty
    port: PORT,
    strictPort: true,
    open: false,
    hmr: {
      protocol: 'ws',
      port: PORT,
      clientPort: PORT,
      ...(DEV_HOST ? { host: DEV_HOST } : {}), // no `host: undefined`
    },
  },
})
