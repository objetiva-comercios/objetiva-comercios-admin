// Dashboard types
export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  totalSales: number
  pendingOrders: number
  lowStockCount: number
  todaySales: number
  todayRevenue: number
  weekSales: number
  weekRevenue: number
}

export interface LowStockItem {
  id: number
  productId: number
  productName: string
  quantity: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

export interface RecentOrder {
  id: number
  orderNumber: string
  customerName: string
  total: number
  status: 'pending' | 'processing' | 'delivered' | 'cancelled'
  createdAt: string
}

export interface DashboardResponse {
  stats: DashboardStats
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

// Product types
export interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  price: number
  cost: number
  status: 'active' | 'inactive' | 'discontinued'
  createdAt: string
  updatedAt: string
}

// Order types
export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  shippingAddress: string
  createdAt: string
  updatedAt: string
}

// Sale types
export interface SaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Sale {
  id: string
  saleNumber: string
  customerName: string
  customerEmail: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  notes: string
  createdAt: string
}

// Purchase types
export interface PurchaseItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  total: number
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
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  expectedDelivery: string
  receivedAt: string | null
  notes: string
  createdAt: string
}

// Inventory types
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
