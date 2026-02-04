import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentPreview from '../components/ContentPreview'
import ContentSidebar from '../components/ContentSidebar'
import { useContentIndex } from '../data/useContentIndex'

import '@/styles/content-hub-v2.css'

const ContentHubPage: React.FC = () => {
  const { entries, loading, error } = useContentIndex()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const requestedId = searchParams.get('id')

  const initialSelectedId = useMemo(() => {
    if (requestedId && entries.some((entry) => entry.id === requestedId)) {
      return requestedId
    }
    return entries[0]?.id ?? null
  }, [requestedId, entries])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId(initialSelectedId)
  }, [initialSelectedId])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [selectedId, entries]
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

  if (loading) {
    return <p className='axcp-empty'>Загрузка контента...</p>
  }

  if (error) {
    return <p className='axcp-empty'>{error}</p>
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
