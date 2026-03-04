import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Order } from '@/types/order'
import type { Product } from '@/types/product'
import type { BusinessSettings } from '@/types/settings'

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
