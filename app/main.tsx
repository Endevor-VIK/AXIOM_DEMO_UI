import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import '../ax-design/tokens.css'
import '../ax-design/components.css'
import '../styles/app.css'
import '../styles/red-protocol-overrides.css'

import Layout from '@/app/routes/_layout'
import LoginPage from '@/app/routes/login/page'
import DashboardPage from '@/app/routes/dashboard/page'
import RoadmapPage from '@/app/routes/dashboard/roadmap/page'
import AuditPage from '@/app/routes/dashboard/audit/page'
import ContentLayout from '@/app/routes/dashboard/content/_layout'
import AllRoute from '@/app/routes/dashboard/content/AllRoute'
import CategoryRoute from '@/app/routes/dashboard/content/CategoryRoute'
import LoreRoute from '@/app/routes/dashboard/content/LoreRoute'
import ReadRoute from '@/app/routes/dashboard/content/ReadRoute'
import NewsPage from '@/app/routes/dashboard/news/page'
import ReaderPage from '@/src/features/content/pages/ReaderPage'
import FavoritesPage from '@/app/routes/favorites/page'
import ProfilePage from '@/app/routes/profile/page'
import SettingsPage from '@/app/routes/settings/page'
import PersonalizationPage from '@/app/routes/settings/personalization/page'
import HelpPage from '@/app/routes/help/page'

import AuthGate from '@/components/AuthGate'
import ScaleViewport from '@/components/ScaleViewport'
import TerminalBoot from '@/components/TerminalBoot'
import { initAnalyticsBridge } from '@/lib/analytics/init'
import { initScaleManager } from '@/lib/ui/scaleManager'

const routes = [
  { path: '/', element: <TerminalBoot /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <AuthGate>
        <Layout />
      </AuthGate>
    ),
    children: [
      {
        path: 'dashboard',
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
              { path: 'read/:id', element: <ReadRoute /> },
              { path: ':category', element: <CategoryRoute /> },
            ],
          },
          { path: 'news', element: <NewsPage /> },
        ],
      },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/personalization', element: <PersonalizationPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
  {
    path: '/content/:id',
    element: (
      <AuthGate>
        <ReaderPage />
      </AuthGate>
    ),
  },
  { path: '*', element: <Navigate to='/' replace /> },
]

const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

function mount() {
  initAnalyticsBridge()
  initScaleManager()
  const el = document.getElementById('root')
  const app = (
    <ScaleViewport>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
      />
    </ScaleViewport>
  )
  if (!el) {
    const fallback = document.createElement('div')
    fallback.id = 'root'
    document.body.appendChild(fallback)
    return createRoot(fallback).render(app)
  }
  createRoot(el).render(app)
}

mount()
