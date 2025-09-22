import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import Breadcrumbs from '@/components/Breadcrumbs'
import LoreTree from '@/components/LoreTree'
import { vfs } from '@/lib/vfs'
import type { BreadcrumbItem } from '@/components/Breadcrumbs'
import type { LoreIndexNode } from '@/lib/vfs'

import { useContentHub } from './context'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function nodeSegment(node: LoreIndexNode): string {
  return (node.path ?? slugify(node.id)).toLowerCase()
}

function ensureLoreIndexPath(path: string | undefined): string {
  const fallback = 'content/lore/_index.json'
  const value = path ?? fallback
  const trimmed = value.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed.slice('content/'.length) : trimmed
}

function ensureContentPath(path: string): string {
  const trimmed = path.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed : 'content/' + trimmed
}

interface LoreState {
  root: LoreIndexNode | null
  node: LoreIndexNode | null
  breadcrumbs: BreadcrumbItem[]
  trail: string[]
  loading: boolean
  error: string | null
}

const initialState: LoreState = {
  root: null,
  node: null,
  breadcrumbs: [],
  trail: [],
  loading: true,
  error: null,
}

const LoreRoute: React.FC = () => {
  const { aggregate, dataBase } = useContentHub()
  const params = useParams<{ '*': string }>()
  const wildcard = params['*'] ?? ''
  const segments = useMemo(
    () => wildcard.split('/').map((s) => s.trim().toLowerCase()).filter(Boolean),
    [wildcard]
  )

  const [state, setState] = useState<LoreState>(initialState)

  useEffect(() => {
    let alive = true

    async function resolve() {
      if (!aggregate) return
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const rootRel = ensureLoreIndexPath(aggregate.lore.index)
      const rootDirBase = rootRel.replace(/_index\.json$/i, '')

      try {
        let currentRel = rootRel
        let currentDir = rootDirBase
        let currentNode = await vfs.readLoreIndex(currentRel)
        const rootNode = currentNode
        const breadcrumbItems: BreadcrumbItem[] = [
          { label: currentNode.title, to: '/dashboard/content/lore' },
        ]
        let trail: string[] = []

        for (const segment of segments) {
          const children = currentNode.children ?? []
          const child = children.find((candidate) => nodeSegment(candidate) === segment)
          if (!child) {
            throw new Error('Lore segment not found: ' + segment)
          }
          const slug = nodeSegment(child)
          trail = [...trail, slug]
          currentDir = currentDir + slug + '/'
          currentRel = currentDir + '_index.json'

          let nextNode: LoreIndexNode = child
          try {
            const fetched = await vfs.readLoreIndex(currentRel)
            nextNode = { ...child, ...fetched }
          } catch {
            // optional index is absent; fall back to inline definition
          }

          const trailPath = trail.join('/')
          breadcrumbItems.push({
            label: child.title,
            to: trailPath ? '/dashboard/content/lore/' + trailPath : '/dashboard/content/lore',
          })
          currentNode = nextNode
        }

        if (!alive) return
        setState({
          root: rootNode,
          node: currentNode,
          breadcrumbs: breadcrumbItems,
          trail,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (!alive) return
        setState({
          root: null,
          node: null,
          breadcrumbs: [],
          trail: [],
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    resolve()

    return () => {
      alive = false
    }
  }, [aggregate, segments])

  if (!aggregate) {
    return <Navigate to='../all' replace />
  }

  if (state.loading) {
    return <p className='ax-muted'>Loading lore...</p>
  }

  if (state.error) {
    return <div className='ax-err'>{state.error}</div>
  }

  if (!state.node || !state.root) {
    return <p className='ax-muted'>Lore index not available.</p>
  }

  const fileUrl = state.node.file
    ? dataBase + ensureContentPath(state.node.file)
    : null

  return (
    <div className='ax-lore-view'>
      <LoreTree
        root={state.root}
        activeTrail={state.trail}
        buildHref={(segments) => '/dashboard/content/lore/' + segments.join('/')}
      />
      <div className='ax-lore-main'>
        <Breadcrumbs items={state.breadcrumbs} />
        <h2>{state.node.title}</h2>
        {state.node.summary && <p>{state.node.summary}</p>}

        {state.node.children && state.node.children.length > 0 ? (
          <ul className='ax-lore-list'>
            {state.node.children.map((child) => {
              const slug = nodeSegment(child)
              const href = '/dashboard/content/lore/' + [...state.trail, slug].join('/')
              return (
                <li key={child.id + '-' + slug}>
                  <Link to={href}>{child.title}</Link>
                  {child.summary && <p>{child.summary}</p>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className='ax-muted'>No nested entries.</p>
        )}

        {fileUrl && (
          <div className='ax-lore-actions'>
            <a className='ax-btn' href={fileUrl} target='_blank' rel='noopener noreferrer'>
              Open source
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoreRoute
