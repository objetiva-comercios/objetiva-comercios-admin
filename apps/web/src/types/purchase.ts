export interface PurchaseItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface Purchase {
  id: string
  purchaseNumber: string
  supplierName: string
  supplierContact: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  expectedDelivery: string
  receivedAt: string | null
  notes: string
  createdAt: string
}
