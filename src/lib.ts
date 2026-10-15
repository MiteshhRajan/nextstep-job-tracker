import type { Application, Interview } from '../shared/schema'

export async function api<Result>(path: string, options: RequestInit = {}): Promise<Result> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Tracker-Request': '1', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Request failed (${response.status}). Please try again.`)
  }
  if (response.status === 204) return undefined as Result
  return response.json()
}

export async function fetchWorkspace(signal?: AbortSignal) {
  const [applications, interviews] = await Promise.all([
    api<Application[]>('/applications', { signal }),
    api<Interview[]>('/interviews', { signal }),
  ])
  return { applications, interviews }
}

export function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatDate(value: string, full = false) {
  if (!value) return 'Not set'
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(full ? { year: 'numeric' } : {}) })
}

export function formatSalary(application: Application) {
  if (application.salary === null) return 'Not mentioned'
  return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: application.currency, maximumFractionDigits: 2 }).format(application.salary)} / ${application.salaryPeriod}`
}

export function isActive(application: Application) {
  return ['Applied', 'Interviewing', 'Offer'].includes(application.status)
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}