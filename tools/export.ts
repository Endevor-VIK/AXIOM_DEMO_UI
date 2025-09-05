// AXIOM_DEMO_UI — WEB CORE
// Canvas: C30 — tools/export.ts
// Purpose: Create reproducible export bundle: run Vite build, run redactor, and assemble `/export`.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { redactExport } from './redactor';

function run(cmd: string){
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

export function buildExport(root = process.cwd()){
  const dist = path.join(root, 'dist');
  const out = path.join(root, 'export');

  // 1) Vite build with deterministic base (can be overridden by CI)
  if (!process.env.VITE_BASE) process.env.VITE_BASE = '/';
  run('npm run build');

  // 2) Redact/copy data → export/data
  const results = redactExport(root);

  // 3) Copy dist → export/site
  const siteDir = path.join(out, 'site');
  fs.rmSync(siteDir, { recursive: true, force: true });
  fs.mkdirSync(siteDir, { recursive: true });

  copyDir(dist, siteDir);

  // 4) Write export meta
  const meta = {
    at: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    base: process.env.VITE_BASE,
    filesProcessed: results.length
  };
  fs.writeFileSync(path.join(out, 'export.meta.json'), JSON.stringify(meta, null, 2));

  // 5) Done
  // eslint-disable-next-line no-console
  console.log('[export] bundle ready in ./export');
}

function copyDir(src: string, dst: string){
  for (const entry of fs.readdirSync(src, { withFileTypes: true })){
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()){
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else if (entry.isFile()){
      fs.copyFileSync(s, d);
    }
  }
}

if (require.main === module){
  buildExport();
}
