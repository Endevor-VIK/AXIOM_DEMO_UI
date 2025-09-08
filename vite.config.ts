import dns from 'node:dns';
import { defineConfig } from 'vite';

// Ensure consistent DNS result order (prevents localhost resolution issues)
dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  return {
    root: '.',
    base: isDev ? '/' : '/AXIOM_DEMO_UI/',
    server: { host: true, port: 5173, strictPort: true },
    preview: { port: 5174, strictPort: true }
  };
});

