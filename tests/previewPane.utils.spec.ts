import { describe, it, expect } from 'vitest'

import { extractStyleBlocks } from '@/components/PreviewPane'

describe('PreviewPane utilities', () => {
  it('merges multiple style blocks without reordering', () => {
    const html = [
      '<style>',
      '.alpha { color: red; }',
      '</style>',
      '<div>content</div>',
      '<style>',
      '@media (min-width: 640px) {',
      '  .alpha { color: blue; }',
      '}',
      '</style>',
      '<p>tail</p>',
    ].join('\n')

    const { css, markup } = extractStyleBlocks(html)

    expect(css).toBe(
      [
        '.alpha { color: red; }',
        '@media (min-width: 640px) {\n  .alpha { color: blue; }\n}',
      ].join('\n\n'),
    )
    expect(markup).toContain('<div>content</div>')
    expect(markup).toContain('<p>tail</p>')
    expect(markup).not.toContain('<style>')
  })
})
