export interface SaleItem {
  id: number
  articuloCodigo: string
  // Phase 31 Deploy 2: articuloSku coexiste con articuloCodigo hasta Deploy 3
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
