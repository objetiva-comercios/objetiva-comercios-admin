export interface Inventory {
  id: string
  productId: string
  productName: string
  sku: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  reorderPoint: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  lastRestocked: string
  updatedAt: string
}
