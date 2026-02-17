const ADMIN_FORCE_REAUTH_KEY = 'ax_admin_force_reauth_v1'

function withSessionStorage<T>(fallback: T, read: (storage: Storage) => T): T {
  if (typeof window === 'undefined') return fallback
  try {
    return read(window.sessionStorage)
  } catch {
    return fallback
  }
}

export function isAdminForceReauthRequired(): boolean {
  return withSessionStorage(false, (storage) => storage.getItem(ADMIN_FORCE_REAUTH_KEY) === '1')
}

export function markAdminForceReauthRequired(): void {
  withSessionStorage(undefined, (storage) => {
    storage.setItem(ADMIN_FORCE_REAUTH_KEY, '1')
    return undefined
  })
}

export function clearAdminForceReauthRequired(): void {
  withSessionStorage(undefined, (storage) => {
    storage.removeItem(ADMIN_FORCE_REAUTH_KEY)
    return undefined
  })
}

