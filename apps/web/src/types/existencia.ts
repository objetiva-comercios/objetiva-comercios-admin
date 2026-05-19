export interface Existencia {
  // Phase 31 Deploy 3 (contract): articuloCodigo eliminado, solo articuloSku
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
  // Phase 31 Deploy 3 (contract): articuloCodigo eliminado, agrupador es articuloSku
  articuloSku: string
  articuloNombre: string
  stock: Record<number, number>
  total: number
}
