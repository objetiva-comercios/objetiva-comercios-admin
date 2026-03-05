import { Injectable } from '@nestjs/common'
import { ArticulosService } from '../articulos/articulos.service'
import { OrdersService } from '../orders/orders.service'
import { ExistenciasService } from '../existencias/existencias.service'
import { SalesService } from '../sales/sales.service'
import { PurchasesService } from '../purchases/purchases.service'

interface DashboardStats {
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

interface LowStockItem {
  articuloCodigo: string
  articuloNombre: string
  cantidad: number
  stockStatus: string
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
  purchases: {
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

@Injectable()
export class DashboardService {
  constructor(
    private articulosService: ArticulosService,
    private ordersService: OrdersService,
    private existenciasService: ExistenciasService,
    private salesService: SalesService,
    private purchasesService: PurchasesService
  ) {}

  async getKpis(): Promise<DashboardResponse> {
    const [salesStats, orderStats, existenciasStats, articulosResult, purchaseStats, allOrders] =
      await Promise.all([
        this.salesService.getStats(),
        this.ordersService.getStats(),
        this.existenciasService.getKpiStats(),
        this.articulosService.findAll({ page: 1, limit: 1 }),
        this.purchasesService.getStats(),
        this.ordersService.findAll({ page: 1, limit: 5 }),
      ])

    // Get recent orders (last 5)
    const recentOrders = allOrders.data.slice(0, 5).map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }))

    return {
      stats: {
        totalArticulos: articulosResult.meta.total,
        totalOrders: orderStats.total,
        totalRevenue: salesStats.totalRevenue,
        totalSales: salesStats.totalSales,
        pendingOrders: orderStats.byStatus.pending,
        lowStockCount: existenciasStats.stockBajo,
        todaySales: salesStats.todaySales,
        todayRevenue: salesStats.todayRevenue,
        weekSales: salesStats.thisWeekSales,
        weekRevenue: salesStats.thisWeekRevenue,
      },
      purchases: {
        pendingOrders: purchaseStats.pendingOrders,
        pendingValue: purchaseStats.pendingValue,
      },
      lowStockItems: [],
      recentOrders,
    }
  }
}
