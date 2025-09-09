// AXIOM_DEMO_UI — WEB CORE
// Canvas: C03 — app/main.tsx
// Purpose: React root, Router, providers, global styles.

import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

// Global styles
import '@styles/tokens.css'
import '@styles/app.css'

// Routes
import Layout from '@/app/routes/_layout'
import LoginPage from '@/app/routes/login/page'
import DashboardPage from '@/app/routes/dashboard/page'
import RoadmapPage from '@/app/routes/dashboard/roadmap/page'
import AuditPage from '@/app/routes/dashboard/audit/page'
import ContentPage from '@/app/routes/dashboard/content/page'
import NewsPage from '@/app/routes/dashboard/news/page'

// Guards / system
import AuthGate from '@/components/AuthGate'
import TerminalBoot from '@/components/TerminalBoot'

// Terminal boot is shown via the root route so hooks work under Router

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
        { path: 'content', element: <ContentPage /> },
        { path: 'news', element: <NewsPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
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

