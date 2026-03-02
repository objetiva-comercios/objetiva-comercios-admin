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
  purchases: {
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}
