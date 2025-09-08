// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// важно: имя репозитория для base на GitHub Pages
const REPO = 'AXIOM_DEMO_UI'
const isCI = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  // на GH Pages ВСЕГДА под /<repo>/, локально — под /
  // (официальная рекомендация Vite для Pages)
  base: isCI ? `/${REPO}/` : '/', // :contentReference[oaicite:0]{index=0}
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),         // корень проекта
      '@app': fileURLToPath(new URL('./app', import.meta.url)),
      '@styles': fileURLToPath(new URL('./styles', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
      '@components': fileURLToPath(new URL('./components', import.meta.url)),
      '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
    }
  },
  server: {
    host: true,        // слушает 0.0.0.0 — будет и localhost, и сеть
    port: 5173,
    strictPort: true,
    open: false
  }
})
