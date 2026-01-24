// Mock data entity type definitions

export interface Product {
  id: number
  sku: string // Format: "SKU-XXXXXXXX"
  name: string
  description: string
  price: number // Retail price, 2 decimal places
  cost: number // Purchase cost, 2 decimal places, always < price
  category: string
  stock: number // Current inventory
  imageUrl: string
  status: 'active' | 'inactive' | 'discontinued'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface OrderItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: number
  orderNumber: string // Format: "ORD-XXXXXXXX"
  customerId: number
  customerName: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface InventoryItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  minStock: number // Reorder threshold
  maxStock: number
  location: string // Warehouse location code
  lastRestocked: string // ISO 8601
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

export interface SaleItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export interface Sale {
  id: number
  saleNumber: string // Format: "SALE-XXXXXXXX"
  customerId: number
  customerName: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface PurchaseItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface Purchase {
  id: number
  purchaseNumber: string // Format: "PO-XXXXXXXX"
  supplierId: number
  supplierName: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  expectedDelivery: string // ISO 8601
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
