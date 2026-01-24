import { Injectable } from '@nestjs/common'
import { ProductsService } from '../products/products.service'
import { OrdersService } from '../orders/orders.service'
import { InventoryService } from '../inventory/inventory.service'
import { SalesService } from '../sales/sales.service'
import { PurchasesService } from '../purchases/purchases.service'

interface DashboardKpis {
  revenue: {
    total: number
    today: number
    thisWeek: number
    averageOrderValue: number
  }
  orders: {
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
  }
  inventory: {
    totalItems: number
    lowStock: number
    outOfStock: number
    lowStockItems: Array<{
      id: number
      productId: number
      productName: string
      sku: string
      quantity: number
      minStock: number
      maxStock: number
      location: string
      lastRestocked: string
      status: 'in_stock' | 'low_stock' | 'out_of_stock'
    }>
  }
  sales: {
    total: number
    today: number
    thisWeek: number
    byPaymentMethod: {
      cash: number
      card: number
      transfer: number
      credit: number
    }
  }
  purchases: {
    pendingOrders: number
    pendingValue: number
  }
  categories: number
}

@Injectable()
export class DashboardService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private inventoryService: InventoryService,
    private salesService: SalesService,
    private purchasesService: PurchasesService
  ) {}

  getKpis(): DashboardKpis {
    const salesStats = this.salesService.getStats()
    const orderStats = this.ordersService.getStats()
    const inventoryStats = this.inventoryService.getStats()
    const purchaseStats = this.purchasesService.getStats()
    const categories = this.productsService.getCategories()

    return {
      revenue: {
        total: salesStats.totalRevenue,
        today: salesStats.todayRevenue,
        thisWeek: salesStats.thisWeekRevenue,
        averageOrderValue: salesStats.averageOrderValue,
      },
      orders: {
        total: orderStats.total,
        pending: orderStats.byStatus.pending,
        processing: orderStats.byStatus.processing,
        shipped: orderStats.byStatus.shipped,
        delivered: orderStats.byStatus.delivered,
      },
      inventory: {
        totalItems: inventoryStats.totalItems,
        lowStock: inventoryStats.byStatus.low_stock,
        outOfStock: inventoryStats.byStatus.out_of_stock,
        lowStockItems: inventoryStats.lowStockItems.slice(0, 5), // Top 5 alerts
      },
      sales: {
        total: salesStats.totalSales,
        today: salesStats.todaySales,
        thisWeek: salesStats.thisWeekSales,
        byPaymentMethod: salesStats.byPaymentMethod,
      },
      purchases: {
        pendingOrders: purchaseStats.pendingOrders,
        pendingValue: purchaseStats.pendingValue,
      },
      categories: categories.length,
    }
  }
}
