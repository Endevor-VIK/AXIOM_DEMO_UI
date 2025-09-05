// AXIOM_DEMO_UI — WEB CORE
// Canvas: C01 — vite.config.ts
// Purpose: Vite + React + TS base config with clean aliases, reproducible build, GH Pages‑friendly base.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// NOTE on base path:
// - Local dev:        "/"
// - GitHub Pages:     "/AXIOM_DEMO_UI/" (or set VITE_BASE in .env.production)
// We read VITE_BASE (no prefix filtering) to allow explicit overrides in CI.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    plugins: [react()],

    // If you later move sources into ./src, keep alias '@/'. For now we alias repo root for flexibility.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },

    // Base URL can be overridden for Pages; default to '/'
    base: env.VITE_BASE && env.VITE_BASE.trim() !== '' ? env.VITE_BASE : '/',

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      open: false,
    },

    preview: {
      host: true,
      port: 5173,
      strictPort: true,
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProd ? false : true,
      rollupOptions: {
        output: {
          // Stable vendor chunk split for cacheability
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
      // Ensure reproducible assets hashing across environments
      cssTarget: 'chrome90',
    },

    css: {
      // Helpful while building tokens and adaptive layout
      devSourcemap: true,
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },

    // Avoid injecting non‑deterministic compile‑time constants here to keep builds reproducible
    define: {},
  };
});
