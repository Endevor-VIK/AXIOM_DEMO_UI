import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentPreview from '../components/ContentPreview'
import ContentSidebar from '../components/ContentSidebar'
import type { ContentPreviewData } from '../types'
import contentIndex from '../data/content-index.json'

import '@/styles/content-hub-v2.css'

const entries = contentIndex as ContentPreviewData[]

const ContentHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const requestedId = searchParams.get('id')

  const initialSelectedId = useMemo(() => {
    if (requestedId && entries.some((entry) => entry.id === requestedId)) {
      return requestedId
    }
    return entries[0]?.id ?? null
  }, [requestedId])

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)

  useEffect(() => {
    setSelectedId(initialSelectedId)
  }, [initialSelectedId])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [selectedId]
  )

  const handleSelect = (id: string) => {
    setSelectedId(id)
    const next = new URLSearchParams(searchParams)
    next.set('id', id)
    setSearchParams(next, { replace: true })
  }

  const handleOpenSource = (id: string) => {
    navigate(`/content/${encodeURIComponent(id)}`)
  }

  if (!entries.length) {
    return <p className='axcp-empty'>Контент не найден.</p>
  }

  return (
    <div className='axch-shell'>
      <div className='axch-header'>
        <h1>CONTENT HUB v2</h1>
        <small>Reader v1.0</small>
      </div>
      <div className='axch-layout'>
        <ContentSidebar entries={entries} selectedId={selectedId} onSelect={handleSelect} />
        <div className='axch-preview'>
          <ContentPreview entry={selectedEntry} onOpenSource={handleOpenSource} />
        </div>
      </div>
    </div>
  )
}

export default ContentHubPage
