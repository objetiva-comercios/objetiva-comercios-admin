import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Order } from '@/types/order'
import type { Product } from '@/types/product'
import type { Articulo } from '@/types/articulo'
import type { BusinessSettings } from '@/types/settings'

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return {
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

async function throwIfError(response: Response): Promise<void> {
  if (response.ok) return
  let detail = ''
  try {
    const body = await response.json()
    detail = body.message ?? JSON.stringify(body)
  } catch {
    detail = response.statusText
  }
  throw new Error(detail)
}

export async function updateSettings(
  data: Partial<Pick<BusinessSettings, 'companyName' | 'address' | 'taxId'>>
): Promise<BusinessSettings> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function uploadLogo(
  type: 'square' | 'rectangular',
  file: File
): Promise<BusinessSettings> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/api/settings/logo/${type}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  await throwIfError(response)
  return response.json()
}

export async function deleteLogo(type: 'square' | 'rectangular'): Promise<BusinessSettings> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/settings/logo/${type}`, {
    method: 'DELETE',
    headers,
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchArticulosClient(params?: {
  page?: number
  limit?: number
  search?: string
  activo?: boolean | null
}): Promise<PaginatedResponse<Articulo>> {
  const headers = await getAuthHeaders()
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.activo !== undefined && params?.activo !== null)
    searchParams.set('activo', params.activo.toString())

  const queryString = searchParams.toString()
  const url = `${API_BASE_URL}/api/articulos${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchArticuloByCodigoClient(codigo: string): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function toggleArticuloActivo(codigo: string): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}/toggle`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
    }
  )
  await throwIfError(response)
  return response.json()
}

export async function fetchOrderById(id: number): Promise<Order> {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchProductById(id: number): Promise<Product> {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}
