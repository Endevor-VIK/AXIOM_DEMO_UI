import React from 'react'

import PreviewPane from '@/components/PreviewPane'
import type { ContentItem, ContentRenderMode } from '@/lib/vfs'

export interface ContentCardExpandedProps {
  item: ContentItem
  dataBase: string
  onExpand?: (item: ContentItem) => void
}

const RENDER_MODE_ORDER: ReadonlyArray<ContentRenderMode> = ['plain', 'hybrid', 'sandbox']

function inferPreferredMode(item: ContentItem): ContentRenderMode {
  const declared = item.renderMode
  if (declared && (RENDER_MODE_ORDER as readonly string[]).includes(declared)) {
    return declared
  }

  const format = (item.format ?? '').toLowerCase()
  if (format === 'html') return 'sandbox'
  if (format === 'md' || format === 'markdown') return 'hybrid'
  return 'plain'
}

const ContentCardExpanded: React.FC<ContentCardExpandedProps> = ({ item, dataBase, onExpand }) => {
  const preferredMode = inferPreferredMode(item)

  return (
    <div className='ax-content-card__expanded' role='region' aria-label={`Preview of ${item.title}`}>
      <PreviewPane
        item={item}
        dataBase={dataBase}
        allowedModes={[preferredMode]}
        initialZoom={100}
        onExpand={onExpand}
      />
    </div>
  )
}

export default ContentCardExpanded
