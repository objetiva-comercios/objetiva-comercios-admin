import type { DashboardResponse } from '@/types/dashboard'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Generic fetch helper with error handling
 */
async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch dashboard KPIs, low stock items, and recent orders
 */
export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetchWithAuth<DashboardResponse>('/dashboard')
}

/**
 * Fetch products list with optional filters
 */
export async function fetchProducts(params?: {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: string
}) {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const endpoint = `/products${queryString ? `?${queryString}` : ''}`

  return fetchWithAuth(endpoint)
}
