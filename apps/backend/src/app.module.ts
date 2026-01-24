import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { ProductsModule } from './modules/products/products.module'
import { OrdersModule } from './modules/orders/orders.module'
import { InventoryModule } from './modules/inventory/inventory.module'

@Module({
  imports: [AuthModule, ProductsModule, OrdersModule, InventoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
