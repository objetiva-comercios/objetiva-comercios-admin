// Dashboard types
export interface DashboardStats {
  totalArticulos: number
  activeArticulos: number
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
  articuloCodigo: string
  articuloNombre: string
  totalCantidad: number
  minStockMinimo: number
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
  purchases: {
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

// Order types
export interface OrderItem {
  id: number
  articuloCodigo: string
  articuloNombre: string
  quantity: number
  price: number
}

export interface Order {
  id: number
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
  id: number
  articuloCodigo: string
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

// Purchase types
export interface PurchaseItem {
  id: number
  articuloCodigo: string
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
