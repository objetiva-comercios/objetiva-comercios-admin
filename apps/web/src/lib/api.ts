import type { DashboardResponse } from '@/types/dashboard'
import type { Product } from '@/types/product'
import type { Order } from '@/types/order'
import type { Sale } from '@/types/sale'
import type { Purchase } from '@/types/purchase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

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

export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetchWithAuth<DashboardResponse>('/dashboard')
}

export async function fetchProducts(params?: {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: string
}): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const endpoint = `/products${queryString ? `?${queryString}` : ''}`

  return fetchWithAuth<PaginatedResponse<Product>>(endpoint)
}

export async function fetchOrders(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<PaginatedResponse<Order>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const endpoint = `/orders${queryString ? `?${queryString}` : ''}`

  return fetchWithAuth<PaginatedResponse<Order>>(endpoint)
}

export async function fetchSales(params?: {
  page?: number
  limit?: number
  status?: string
  paymentMethod?: string
}): Promise<PaginatedResponse<Sale>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.status) searchParams.set('status', params.status)
  if (params?.paymentMethod) searchParams.set('paymentMethod', params.paymentMethod)

  const queryString = searchParams.toString()
  const endpoint = `/sales${queryString ? `?${queryString}` : ''}`

  return fetchWithAuth<PaginatedResponse<Sale>>(endpoint)
}

export async function fetchPurchases(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<PaginatedResponse<Purchase>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const endpoint = `/purchases${queryString ? `?${queryString}` : ''}`

  return fetchWithAuth<PaginatedResponse<Purchase>>(endpoint)
}
