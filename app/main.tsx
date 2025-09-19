import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import '../ax-design/tokens.css'
import '../ax-design/components.css'
import '../styles/app.css'

import Layout from '@/app/routes/_layout'
import LoginPage from '@/app/routes/login/page'
import DashboardPage from '@/app/routes/dashboard/page'
import RoadmapPage from '@/app/routes/dashboard/roadmap/page'
import AuditPage from '@/app/routes/dashboard/audit/page'
import ContentLayout from '@/app/routes/dashboard/content/_layout'
import AllRoute from '@/app/routes/dashboard/content/AllRoute'
import CategoryRoute from '@/app/routes/dashboard/content/CategoryRoute'
import LoreRoute from '@/app/routes/dashboard/content/LoreRoute'
import NewsPage from '@/app/routes/dashboard/news/page'

import AuthGate from '@/components/AuthGate'
import TerminalBoot from '@/components/TerminalBoot'

const router = createBrowserRouter(
  [
    { path: '/', element: <TerminalBoot /> },
    { path: '/login', element: <LoginPage /> },
    {
      path: '/dashboard',
      element: (
        <AuthGate>
          <Layout />
        </AuthGate>
      ),
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'roadmap', element: <RoadmapPage /> },
        { path: 'audit', element: <AuditPage /> },
        {
          path: 'content',
          element: <ContentLayout />,
          children: [
            { index: true, element: <Navigate to='all' replace /> },
            { path: 'all', element: <AllRoute /> },
            { path: 'lore/*', element: <LoreRoute /> },
            { path: ':category', element: <CategoryRoute /> },
          ],
        },
        { path: 'news', element: <NewsPage /> },
      ],
    },
    { path: '*', element: <Navigate to='/' replace /> },
  ],
  { basename: import.meta.env.BASE_URL }
)

function mount() {
  const el = document.getElementById('root')
  const app = <RouterProvider router={router} />
  if (!el) {
    const fallback = document.createElement('div')
    fallback.id = 'root'
    document.body.appendChild(fallback)
    return createRoot(fallback).render(app)
  }
  createRoot(el).render(app)
}

mount()



