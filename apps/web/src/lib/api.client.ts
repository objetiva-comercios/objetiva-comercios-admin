import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Order } from '@/types/order'
import type { Articulo } from '@/types/articulo'
import type { Deposito } from '@/types/deposito'
import type { Existencia, ExistenciasKpi, ExistenciaMatrixRow } from '@/types/existencia'
import type { BusinessSettings } from '@/types/settings'
import type {
  Inventario,
  InventarioArticulo,
  InventarioArticuloWithDiscrepancy,
  InventarioSector,
} from '@/types/inventario'
import type { DispositivoMovil } from '@/types/dispositivo'

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

export async function createArticulo(data: Record<string, unknown>): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateArticulo(
  codigo: string,
  data: Record<string, unknown>
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
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

export async function fetchDepositosClient(): Promise<Deposito[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function createDeposito(data: {
  nombre: string
  direccion?: string
  descripcion?: string
}): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateDeposito(
  id: number,
  data: Partial<{ nombre: string; direccion: string; descripcion: string }>
): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function toggleDepositoActivo(id: number): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchExistenciasByDepositoClient(
  depositoId: number,
  params?: { page?: number; limit?: number; search?: string; stockStatus?: string }
): Promise<PaginatedResponse<Existencia>> {
  const headers = await getAuthHeaders()
  const searchParams = new URLSearchParams()
  searchParams.set('depositoId', depositoId.toString())

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.stockStatus) searchParams.set('stockStatus', params.stockStatus)

  const url = `${API_BASE_URL}/api/existencias?${searchParams.toString()}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchExistenciasMatrixClient(params?: {
  page?: number
  limit?: number
  search?: string
}): Promise<PaginatedResponse<ExistenciaMatrixRow>> {
  const headers = await getAuthHeaders()
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)

  const queryString = searchParams.toString()
  const url = `${API_BASE_URL}/api/existencias/matrix${queryString ? `?${queryString}` : ''}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchExistenciasKpiClient(): Promise<ExistenciasKpi> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/existencias/kpi`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchExistenciasByArticuloClient(
  articuloCodigo: string
): Promise<Existencia[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/existencias/articulo/${encodeURIComponent(articuloCodigo)}`,
    {
      headers: { 'Content-Type': 'application/json', ...headers },
    }
  )
  await throwIfError(response)
  return response.json()
}

export async function updateExistenciaClient(
  articuloCodigo: string,
  depositoId: number,
  data: { cantidad?: number; stockMinimo?: number; stockMaximo?: number }
): Promise<Existencia> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/existencias/${encodeURIComponent(articuloCodigo)}/${depositoId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    }
  )
  await throwIfError(response)
  return response.json()
}

// --- Inventarios ---

export async function createInventario(data: {
  nombre: string
  fecha: string
  depositoId: number
  descripcion?: string
}): Promise<Inventario> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/inventarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateInventario(
  id: number,
  data: { nombre?: string; descripcion?: string }
): Promise<Inventario> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/inventarios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function transitionInventarioEstado(id: number, estado: string): Promise<Inventario> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/inventarios/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ estado }),
  })
  await throwIfError(response)
  return response.json()
}

export async function addInventarioArticulo(
  inventarioId: number,
  data: {
    articuloCodigo: string
    cantidadContada?: number
    dispositivoId?: number
    sectorId?: number
    observaciones?: string
  }
): Promise<InventarioArticulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/inventarios/${inventarioId}/articulos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateInventarioArticulo(
  inventarioId: number,
  articuloId: number,
  data: { cantidadContada?: number; observaciones?: string }
): Promise<InventarioArticulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/inventarios/${inventarioId}/articulos/${articuloId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    }
  )
  await throwIfError(response)
  return response.json()
}

export async function removeInventarioArticulo(
  inventarioId: number,
  articuloId: number
): Promise<void> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/inventarios/${inventarioId}/articulos/${articuloId}`,
    {
      method: 'DELETE',
      headers: { ...headers },
    }
  )
  await throwIfError(response)
}

// --- Dispositivos ---

export async function createDispositivo(data: {
  nombre: string
  identificador: string
  descripcion?: string
}): Promise<DispositivoMovil> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/dispositivos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateDispositivo(
  id: number,
  data: { nombre?: string; identificador?: string; descripcion?: string }
): Promise<DispositivoMovil> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/dispositivos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function toggleDispositivo(id: number): Promise<DispositivoMovil> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/dispositivos/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

// --- Sectores ---

export async function createSector(
  depositoId: number,
  data: { nombre: string; columnas?: string[] }
): Promise<InventarioSector> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${depositoId}/sectores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updateSector(
  depositoId: number,
  sectorId: number,
  data: { nombre?: string; columnas?: string[] }
): Promise<InventarioSector> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${depositoId}/sectores/${sectorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function deleteSector(depositoId: number, sectorId: number): Promise<void> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${depositoId}/sectores/${sectorId}`, {
    method: 'DELETE',
    headers: { ...headers },
  })
  await throwIfError(response)
}

export async function fetchSectoresClient(depositoId: number): Promise<InventarioSector[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${depositoId}/sectores`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function fetchInventarioArticulosClient(
  inventarioId: number
): Promise<InventarioArticuloWithDiscrepancy[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/inventarios/${inventarioId}/articulos`, {
    headers: { 'Content-Type': 'application/json', ...headers },
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
