import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

const LegacyReadRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to='../content' replace />
  return <Navigate to={`/content/${encodeURIComponent(id)}`} replace />
}

export default LegacyReadRedirect
