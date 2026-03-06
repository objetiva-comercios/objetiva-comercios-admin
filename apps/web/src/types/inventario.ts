export interface Inventario {
  id: number
  nombre: string
  fecha: string
  depositoId: number
  depositoNombre?: string
  descripcion: string | null
  estado: 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado'
  totalArticulos?: number
  createdAt: string
  updatedAt: string
}

export interface InventarioArticulo {
  id: number
  inventarioId: number
  articuloCodigo: string
  cantidadContada: number
  dispositivoId: number | null
  sectorId: number | null
  observaciones: string | null
  createdAt: string
  updatedAt: string
}

export interface InventarioArticuloWithDiscrepancy extends InventarioArticulo {
  articuloNombre: string
  stockSistema: number
  diferencia: number
}

export interface InventarioSector {
  id: number
  depositoId: number
  nombre: string
  columnas: string[]
  createdAt: string
  updatedAt: string
}
