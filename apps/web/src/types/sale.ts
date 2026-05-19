export interface SaleItem {
  id: number
  // Phase 31 Deploy 3 (contract): articuloCodigo eliminado, solo articuloSku
  articuloSku: string
  articuloNombre: string
  quantity: number
  price: number
  subtotal: number
}

export interface Sale {
  id: number
  saleNumber: string
  customerName: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  createdAt: string
}
