// AXIOM_DEMO_UI — WEB CORE
// Canvas: C21 — components/NewsFeed.tsx
// Purpose: Reusable NewsFeed component to render a list of NewsItem cards (virtualization-ready).

import React, { useMemo } from 'react';
import NewsCard from '@/components/NewsCard';
import type { NewsItem } from '@/lib/vfs';

export interface NewsFeedProps {
  items: NewsItem[];
  /** maximum items to show (for embeds) */
  limit?: number;
}

export default function NewsFeed({ items, limit }: NewsFeedProps){
  const list = useMemo(() => limit ? items.slice(0, limit) : items, [items, limit]);
  return (
    <div className="news-grid">
      {list.map(it => <NewsCard key={it.id} item={it} />)}
    </div>
  );
}
