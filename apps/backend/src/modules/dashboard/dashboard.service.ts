import { Injectable } from '@nestjs/common'
import { ProductsService } from '../products/products.service'
import { OrdersService } from '../orders/orders.service'
import { InventoryService } from '../inventory/inventory.service'
import { SalesService } from '../sales/sales.service'

interface DashboardStats {
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

interface LowStockItem {
  id: number
  productId: number
  productName: string
  quantity: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface RecentOrder {
  id: number
  orderNumber: string
  customerName: string
  total: number
  status: 'pending' | 'processing' | 'delivered' | 'cancelled'
  createdAt: string
}

interface DashboardResponse {
  stats: DashboardStats
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

@Injectable()
export class DashboardService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private inventoryService: InventoryService,
    private salesService: SalesService
  ) {}

  getKpis(): DashboardResponse {
    const salesStats = this.salesService.getStats()
    const orderStats = this.ordersService.getStats()
    const inventoryStats = this.inventoryService.getStats()
    const productStats = this.productsService.getStats()

    // Get recent orders (last 5)
    const allOrders = this.ordersService.findAll({})
    const recentOrders = allOrders.data.slice(0, 5).map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }))

    // Get low stock items
    const lowStockItems = inventoryStats.lowStockItems.slice(0, 5).map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      status: item.status,
    }))

    return {
      stats: {
        totalProducts: productStats.total,
        totalOrders: orderStats.total,
        totalRevenue: salesStats.totalRevenue,
        totalSales: salesStats.totalSales,
        pendingOrders: orderStats.byStatus.pending,
        lowStockCount: inventoryStats.byStatus.low_stock,
        todaySales: salesStats.todaySales,
        todayRevenue: salesStats.todayRevenue,
        weekSales: salesStats.thisWeekSales,
        weekRevenue: salesStats.thisWeekRevenue,
      },
      lowStockItems,
      recentOrders,
    }
  }
}
