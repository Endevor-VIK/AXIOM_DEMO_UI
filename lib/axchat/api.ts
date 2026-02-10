export type AxchatRef = {
  title: string
  path: string
  route: string
  anchor?: string
  excerpt?: string
  score?: number
}

export type AxchatStatus = {
  model: {
    name: string
    online: boolean
    ready?: boolean
    available?: string[]
  }
  index: {
    ok: boolean
    indexed_at?: string
    version?: string
  }
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!res.ok) {
    let error = 'request_failed'
    let payload: any = null
    try {
      payload = await res.json()
      error = payload?.error || error
    } catch {
      // ignore
    }
    const err: any = new Error(error)
    err.payload = payload
    err.status = res.status
    throw err
  }
  return res.json()
}

export async function fetchAxchatStatus(): Promise<AxchatStatus> {
  return fetchJson<AxchatStatus>('/api/axchat/status', { method: 'GET' })
}

export async function queryAxchat(message: string, mode: 'qa' | 'search' = 'qa') {
  return fetchJson<{ answer_markdown: string; refs: AxchatRef[]; notes?: any }>('/api/axchat/query', {
    method: 'POST',
    body: JSON.stringify({ message, mode }),
  })
}

export async function searchAxchat(query: string) {
  const params = new URLSearchParams({ q: query })
  return fetchJson<{ refs: AxchatRef[] }>('/api/axchat/search?' + params.toString(), { method: 'GET' })
}

export async function reindexAxchat() {
  return fetchJson<{ ok: boolean; indexed_at?: string }>('/api/axchat/reindex', { method: 'POST' })
}

export async function warmupAxchat() {
  return fetchJson<{ ok: boolean; latency_ms?: number }>('/api/axchat/warmup', { method: 'POST' })
}
