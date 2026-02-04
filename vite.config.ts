import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const REPO = 'AXIOM_DEMO_UI'
const repoBase = `/${REPO}/`
const envBase = process.env.VITE_BASE?.trim()
const isCI =
  process.env.GITHUB_PAGES === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.CI === 'true'
const DEV_HOST = (process.env.DEV_HOST || '').trim()  // set to "192.168.0.11" for LAN
const HMR_HOST = (process.env.HMR_HOST || '').trim()
const PORT = Number(process.env.PORT || 5173)
const EXPORT_ROOT = (process.env.AXS_EXPORT_ROOT || '').trim() || '/app/content'
const resolvedHmrHost =
  HMR_HOST || (DEV_HOST && DEV_HOST !== '0.0.0.0' ? DEV_HOST : '')

export default defineConfig({
  plugins: [react()],
  base: envBase || (isCI ? repoBase : '/'),
  define: {
    'import.meta.env.AXS_EXPORT_ROOT': JSON.stringify(EXPORT_ROOT),
  },
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
      ...(resolvedHmrHost ? { host: resolvedHmrHost } : {}), // avoid 0.0.0.0 for HMR
    },
  },
})
