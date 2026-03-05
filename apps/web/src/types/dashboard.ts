export interface DashboardStats {
  totalArticulos: number
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
  cantidad: number
  stockStatus: string
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
