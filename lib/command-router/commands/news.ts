// AXIOM_DEMO_UI — WEB CORE
// Canvas: C26 — lib/command-router/commands/news.ts
// Purpose: `news` command — print last N news items, optionally filter by kind.

import type { CommandSpec } from '@/lib/command-router';
import { news, type NewsKind } from '@/lib/news';

export default function newsCommand(): CommandSpec {
  return {
    name: 'news',
    describe: 'show latest news',
    usage: 'news [N=5] [kind]',
    run: async (args, ctx) => {
      const n = Math.max(1, Math.min(50, parseInt(args[0] ?? '5', 10) || 5));
      const k = (args[1] as NewsKind | undefined);
      const items = await news.find({ kind: (k ?? '') as any, limit: n });
      if (items.length === 0){ ctx.print('no news'); return; }
      for (const it of items){
        const tags = it.tags?.length ? ` [${it.tags.join(', ')}]` : '';
        ctx.print(`• ${it.date} :: ${it.kind.toUpperCase()} :: ${it.title}${tags}`);
      }
    }
  };
}
