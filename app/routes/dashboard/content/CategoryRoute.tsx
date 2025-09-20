import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import ContentCategoryView from './ContentCategoryView'
import { contentCategories, type ContentCategory } from '@/lib/vfs'

const CategoryRoute: React.FC = () => {
  const { category } = useParams<{ category: string }>()
  const normalized = (category ?? '').toLowerCase()

  if (!normalized) {
    return <Navigate to='../all' replace />
  }

  if (normalized === 'lore') {
    return <Navigate to='../lore' replace />
  }

  if (!contentCategories.includes(normalized as ContentCategory)) {
    return <Navigate to='../all' replace />
  }

  return <ContentCategoryView category={normalized as ContentCategory} />
}

export default CategoryRoute
