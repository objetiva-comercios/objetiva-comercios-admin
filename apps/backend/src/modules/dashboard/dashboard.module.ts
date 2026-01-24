import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { ProductsModule } from '../products/products.module'
import { OrdersModule } from '../orders/orders.module'
import { InventoryModule } from '../inventory/inventory.module'
import { SalesModule } from '../sales/sales.module'
import { PurchasesModule } from '../purchases/purchases.module'

@Module({
  imports: [ProductsModule, OrdersModule, InventoryModule, SalesModule, PurchasesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
