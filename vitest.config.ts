import { defineConfig, configDefaults } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@app': fileURLToPath(new URL('./app', import.meta.url)),
      '@components': fileURLToPath(new URL('./components', import.meta.url)),
      '@styles': fileURLToPath(new URL('./styles', import.meta.url)),
      '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
})
