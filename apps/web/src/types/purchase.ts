export interface PurchaseItem {
  id: number
  // Phase 31 Deploy 3 (contract): articuloCodigo eliminado, solo articuloSku
  articuloSku: string
  articuloNombre: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface Purchase {
  id: number
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
