import type { ContentItem } from '@/lib/vfs'

export function pickContentImage(item: ContentItem): string {
  const cover = (item as any).cover
  if (typeof cover === 'string' && cover.trim()) return cover
  // Fallbacks for demo pack heroes so preview/cards never go blank.
  if (item.id === 'CHR-AXIOM-0303') return '/assets/content/03.03_AXIOM.png'
  if (item.id === 'CHR-VIKTOR-0301') return '/assets/content/03.00_VIKTOR.png'
  return '/assets/content/03.03_AXIOM.png'
}

