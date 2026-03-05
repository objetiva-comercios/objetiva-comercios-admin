import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DbModule } from './db.module'
import { AuthModule } from './auth/auth.module'
import { ProductsModule } from './modules/products/products.module'
import { OrdersModule } from './modules/orders/orders.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { SalesModule } from './modules/sales/sales.module'
import { PurchasesModule } from './modules/purchases/purchases.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { SettingsModule } from './modules/settings/settings.module'
import { ArticulosModule } from './modules/articulos/articulos.module'
import { DepositosModule } from './modules/depositos/depositos.module'
import { ExistenciasModule } from './modules/existencias/existencias.module'

@Module({
  imports: [
    DbModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    DashboardModule,
    SettingsModule,
    ArticulosModule,
    DepositosModule,
    ExistenciasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
