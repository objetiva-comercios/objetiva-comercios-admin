export interface SaleItem {
  id: number
  productId: number
  productName: string
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
