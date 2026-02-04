import { useEffect, useState } from 'react'

import type { ContentPreviewData } from '../types'
import { withExportPath } from '../exportRoot'

interface ContentIndexState {
  entries: ContentPreviewData[]
  loading: boolean
  error: string | null
}

const MANIFEST_FILE = 'manifest.json'
const INDEX_FILE = 'content-index.json'

async function loadContentIndex(): Promise<ContentPreviewData[]> {
  const manifestUrl = withExportPath(`/${MANIFEST_FILE}`)
  const manifestRes = await fetch(manifestUrl, { cache: 'no-store' })
  if (!manifestRes.ok) {
    throw new Error(
      `Не найден export-snapshot (${manifestUrl}). Сначала запусти ./ops/dev/site_dev.sh`
    )
  }

  const indexUrl = withExportPath(`/${INDEX_FILE}`)
  const indexRes = await fetch(indexUrl, { cache: 'no-store' })
  if (!indexRes.ok) {
    throw new Error(`Не найден ${INDEX_FILE} (${indexUrl}). Проверь export_canon.sh`)
  }

  const raw = await indexRes.text()
  if (raw.trim().startsWith('<')) {
    throw new Error(
      `Получен HTML вместо ${INDEX_FILE}. Проверь экспорт и symlink /app/content (site_dev.sh или run_local.py).`
    )
  }

  const data = JSON.parse(raw) as ContentPreviewData[]
  return Array.isArray(data) ? data : []
}

export function useContentIndex(): ContentIndexState {
  const [entries, setEntries] = useState<ContentPreviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    loadContentIndex()
      .then((items) => {
        if (!active) return
        setEntries(items)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { entries, loading, error }
}
