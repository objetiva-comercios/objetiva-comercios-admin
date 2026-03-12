import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DbModule } from './db.module'
import { AuthModule } from './auth/auth.module'
import { OrdersModule } from './modules/orders/orders.module'
import { SalesModule } from './modules/sales/sales.module'
import { PurchasesModule } from './modules/purchases/purchases.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { SettingsModule } from './modules/settings/settings.module'
import { ArticulosModule } from './modules/articulos/articulos.module'
import { DepositosModule } from './modules/depositos/depositos.module'
import { ExistenciasModule } from './modules/existencias/existencias.module'
import { InventariosModule } from './modules/inventarios/inventarios.module'
import { DispositivosModule } from './modules/dispositivos/dispositivos.module'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { CompositeAuthGuard } from './common/guards/composite-auth.guard'

@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: true }),
    DbModule,
    AuthModule,
    OrdersModule,
    SalesModule,
    PurchasesModule,
    DashboardModule,
    SettingsModule,
    ArticulosModule,
    DepositosModule,
    ExistenciasModule,
    InventariosModule,
    DispositivosModule,
    ApiKeysModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CompositeAuthGuard,
    },
  ],
})
export class AppModule {}
