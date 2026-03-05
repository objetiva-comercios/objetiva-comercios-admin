import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { ArticulosModule } from '../articulos/articulos.module'
import { OrdersModule } from '../orders/orders.module'
import { ExistenciasModule } from '../existencias/existencias.module'
import { SalesModule } from '../sales/sales.module'
import { PurchasesModule } from '../purchases/purchases.module'

@Module({
  imports: [ArticulosModule, OrdersModule, ExistenciasModule, SalesModule, PurchasesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
