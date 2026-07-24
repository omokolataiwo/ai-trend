const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail || `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export type HeadlineMetric = {
  id: string
  value: string
  unit: string
  label: string
}

export type ComputePoint = {
  year: number
  label: string
  flop: number
}

export type ModelRow = {
  id: string
  name: string
  org: string
  year: number
  flop: number | null
  domain: string
}

export type InsightResponse = {
  question: string
  insight: string
  model: string
  cached: boolean
  created_at: string | null
}

export type HealthResponse = {
  status: string
  database: string
  ollama: string
  ollama_model: string
}

export function fetchMetrics() {
  return request<HeadlineMetric[]>('/metrics')
}

export function fetchComputeSeries() {
  return request<ComputePoint[]>('/compute-series')
}

export function fetchModels(domain?: string) {
  const query =
    domain && domain !== 'All' ? `?domain=${encodeURIComponent(domain)}` : ''
  return request<ModelRow[]>(`/models${query}`)
}

export function fetchHealth() {
  return request<HealthResponse>('/health')
}

export function generateInsight(question: string) {
  return request<InsightResponse>('/insights', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

/** Clean scientific notation for UI (e.g. 3.1e23). */
export function formatFlop(flop: number | null): string {
  if (flop === null) return 'Unpublished'
  const exp = Math.floor(Math.log10(flop))
  const coef = flop / 10 ** exp
  return `${coef % 1 === 0 ? coef.toFixed(0) : coef.toFixed(1)}e${exp}`
}
