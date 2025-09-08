import dns from 'node:dns';
import { defineConfig } from 'vite';

// чтобы 'localhost' не резолвился хитро и не вёл на другой адрес
dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  return {
    root: '.',                                // явно корень репо
    base: isDev ? '/' : '/AXIOM_DEMO_UI/',    // dev='/', prod='/AXIOM_DEMO_UI/'
    server: { host: true, port: 5173, strictPort: true },  // доступ по LAN
    preview:{ port: 5174, strictPort: true },
  };
});
