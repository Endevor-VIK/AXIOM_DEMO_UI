// AXIOM_DEMO_UI — WEB CORE
// Canvas: C14 — components/AuthGate.tsx
// Purpose: Route guard. Blocks access to protected routes if not authenticated.

import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function isAuthed(): boolean {
  try {
    const raw = localStorage.getItem('axiom.auth');
    if (!raw) return false;
    const data = JSON.parse(raw);
    return typeof data?.login === 'string';
  } catch {
    return false;
  }
}

export default function AuthGate({ children }: PropsWithChildren) {
  const [ok, setOk] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const loc = useLocation();

  useEffect(() => {
    setOk(isAuthed());
    setReady(true);
  }, [loc.key]);

  if (!ready) return null; // optionally render a spinner
  if (!ok) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
