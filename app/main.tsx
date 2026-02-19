import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import '../ax-design/tokens.css'
import '../ax-design/components.css'
import '../styles/app.css'
import '../styles/red-protocol-overrides.css'

import Layout from '@/app/routes/_layout'
import LoginPage from '@/app/routes/login/page'
import AdminLoginPage from '@/app/routes/admin/login/page'

import AuthGate from '@/components/AuthGate'
import AdminGate from '@/components/AdminGate'
import ScaleViewport from '@/components/ScaleViewport'
import TerminalBoot from '@/components/TerminalBoot'
import { initAnalyticsBridge } from '@/lib/analytics/init'
import { initScaleManager } from '@/lib/ui/scaleManager'

const AdminPage = React.lazy(() => import('@/app/routes/admin/page'))
const DashboardPage = React.lazy(() => import('@/app/routes/dashboard/page'))
const ChroniclePage = React.lazy(() => import('@/app/routes/dashboard/chronicle/page'))
const ChronicleChapterPage = React.lazy(() => import('@/app/routes/dashboard/chronicle/chapter'))
const AuditPage = React.lazy(() => import('@/app/routes/dashboard/audit/page'))
const AxchatPage = React.lazy(() => import('@/app/routes/dashboard/axchat/page'))
const ContentLayout = React.lazy(() => import('@/app/routes/dashboard/content/_layout'))
const AllRoute = React.lazy(() => import('@/app/routes/dashboard/content/AllRoute'))
const CategoryRoute = React.lazy(() => import('@/app/routes/dashboard/content/CategoryRoute'))
const LoreRoute = React.lazy(() => import('@/app/routes/dashboard/content/LoreRoute'))
const ReadRoute = React.lazy(() => import('@/app/routes/dashboard/content/ReadRoute'))
const NewsPage = React.lazy(() => import('@/app/routes/dashboard/news/page'))
const ReaderPage = React.lazy(() => import('@/src/features/content/pages/ReaderPage'))
const FavoritesPage = React.lazy(() => import('@/app/routes/favorites/page'))
const ProfilePage = React.lazy(() => import('@/app/routes/profile/page'))
const SettingsPage = React.lazy(() => import('@/app/routes/settings/page'))
const PersonalizationPage = React.lazy(() => import('@/app/routes/settings/personalization/page'))
const HelpPage = React.lazy(() => import('@/app/routes/help/page'))

function RouteLoadingFallback() {
  return (
    <div role='status' aria-live='polite' style={{ padding: '16px', color: 'var(--ax-text)' }}>
      LOADING ROUTE...
    </div>
  )
}

function withRouteSuspense(element: React.ReactElement) {
  return <React.Suspense fallback={<RouteLoadingFallback />}>{element}</React.Suspense>
}

const routes = [
  { path: '/', element: <TerminalBoot /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <AdminGate>
        {withRouteSuspense(<AdminPage />)}
      </AdminGate>
    ),
  },
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
          { index: true, element: withRouteSuspense(<DashboardPage />) },
          { path: 'chronicle', element: withRouteSuspense(<ChroniclePage />) },
          {
            path: 'chronicle/:chapterSlug',
            element: withRouteSuspense(<ChronicleChapterPage />),
          },
          { path: 'roadmap', element: <Navigate to='/dashboard/chronicle' replace /> },
          { path: 'audit', element: withRouteSuspense(<AuditPage />) },
          { path: 'axchat', element: withRouteSuspense(<AxchatPage />) },
          {
            path: 'content',
            element: withRouteSuspense(<ContentLayout />),
            children: [
              { index: true, element: <Navigate to='all' replace /> },
              { path: 'all', element: withRouteSuspense(<AllRoute />) },
              { path: 'lore/*', element: withRouteSuspense(<LoreRoute />) },
              { path: 'read/:id', element: withRouteSuspense(<ReadRoute />) },
              { path: ':category', element: withRouteSuspense(<CategoryRoute />) },
            ],
          },
          { path: 'news', element: withRouteSuspense(<NewsPage />) },
        ],
      },
      { path: 'profile', element: withRouteSuspense(<ProfilePage />) },
      { path: 'favorites', element: withRouteSuspense(<FavoritesPage />) },
      { path: 'settings', element: withRouteSuspense(<SettingsPage />) },
      { path: 'settings/personalization', element: withRouteSuspense(<PersonalizationPage />) },
      { path: 'help', element: withRouteSuspense(<HelpPage />) },
    ],
  },
  {
    path: '/content/:id',
    element: (
      <AuthGate>
        {withRouteSuspense(<ReaderPage />)}
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
