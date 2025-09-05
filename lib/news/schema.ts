// AXIOM_DEMO_UI — WEB CORE
// Canvas: C23 — lib/news/schema.ts
// Purpose: Types and runtime guards for News manifest; AJV-ready JSON schema export.

import type { NewsKind } from '@/lib/vfs';

export const newsKinds: ReadonlyArray<NewsKind> = ['update','release','roadmap','heads-up'] as const;

export interface NewsRecord {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  kind: NewsKind;
  tags?: string[];
  summary?: string;
  link?: string;
}

export const NewsJsonSchema = {
  $id: 'axiom.news.schema',
  type: 'array',
  items: {
    type: 'object',
    required: ['id','date','title','kind'],
    additionalProperties: true,
    properties: {
      id: { type: 'string', minLength: 1 },
      date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
      title: { type: 'string', minLength: 1 },
      kind: { type: 'string', enum: newsKinds as any },
      tags: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
      link: { type: 'string' }
    }
  }
} as const;

// Minimal runtime guard if AJV is not connected
export function isNewsRecord(x: unknown): x is NewsRecord {
  if (!x || typeof x !== 'object') return false;
  const o = x as any;
  return typeof o.id === 'string' && typeof o.date === 'string' && typeof o.title === 'string' && typeof o.kind === 'string';
}
