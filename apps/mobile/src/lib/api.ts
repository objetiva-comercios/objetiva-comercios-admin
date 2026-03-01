import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(`${API_BASE}/api${endpoint}`, { headers })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}
