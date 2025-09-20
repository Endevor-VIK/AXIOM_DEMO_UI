import React from 'react'
import { Link } from 'react-router-dom'

import type { LoreIndexNode } from '@/lib/vfs'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function nodeSegment(node: LoreIndexNode): string {
  return node.path ?? slugify(node.id)
}

export interface LoreTreeProps {
  root: LoreIndexNode
  activeTrail: string[]
  buildHref(segments: string[]): string
}

const LoreTree: React.FC<LoreTreeProps> = ({ root, activeTrail, buildHref }) => {
  const renderNode = (node: LoreIndexNode, trail: string[]): React.ReactNode => {
    const segment = nodeSegment(node)
    const currentTrail = [...trail, segment]
    const isActive = activeTrail.slice(0, currentTrail.length).every((seg, idx) => seg === currentTrail[idx])
    const isCurrent = isActive && activeTrail.length === currentTrail.length

    return (
      <li
        key={currentTrail.join('/')}
        className={[
          isCurrent ? 'current' : '',
          isActive && !isCurrent ? 'active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Link to={buildHref(currentTrail)} aria-current={isCurrent ? 'page' : undefined}>
          {node.title}
        </Link>
        {Array.isArray(node.children) && node.children.length > 0 && (
          <ul>{node.children.map((child) => renderNode(child, currentTrail))}</ul>
        )}
      </li>
    )
  }

  return (
    <aside className='ax-lore-tree' aria-label='Lore navigation'>
      <h3>Lore</h3>
      {Array.isArray(root.children) && root.children.length > 0 ? (
        <ul>{root.children.map((child) => renderNode(child, []))}</ul>
      ) : (
        <p className='ax-muted'>No lore structure available.</p>
      )}
    </aside>
  )
}

export default LoreTree
