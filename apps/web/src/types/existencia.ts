export interface Existencia {
  articuloCodigo: string
  // Phase 31 Deploy 2: articuloSku es NOT NULL (era string | null en Deploy 1)
  articuloSku: string
  depositoId: number
  cantidad: number
  stockMinimo: number
  stockMaximo: number
  updatedAt: string
  articuloNombre?: string
  depositoNombre?: string
}

export type StockStatus = 'normal' | 'bajo' | 'sin_stock'

export function getStockStatus(cantidad: number, stockMinimo: number): StockStatus {
  if (cantidad === 0) return 'sin_stock'
  if (stockMinimo > 0 && cantidad <= stockMinimo) return 'bajo'
  return 'normal'
}

export interface ExistenciasKpi {
  totalArticulos: number
  totalConStock: number
  totalUnidades: number
  stockBajo: number
  sinStock: number
}

export interface ExistenciaMatrixRow {
  articuloCodigo: string
  articuloNombre: string
  stock: Record<number, number>
  total: number
}
