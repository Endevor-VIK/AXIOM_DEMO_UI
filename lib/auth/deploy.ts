export type DeployTarget = 'local' | 'ghpages'

export function resolveDeployTarget(): DeployTarget {
  const envTarget = (import.meta as any).env?.VITE_AX_DEPLOY_TARGET as string | undefined
  if (envTarget === 'local' || envTarget === 'ghpages') {
    return envTarget
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.endsWith('github.io')) {
      return 'ghpages'
    }
  }
  return 'local'
}
