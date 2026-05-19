import { Module } from '@nestjs/common'
import { InventariosController } from './inventarios.controller'
import { InventariosService } from './inventarios.service'
import { ArticulosModule } from '../articulos/articulos.module'

@Module({
  imports: [ArticulosModule],
  controllers: [InventariosController],
  providers: [InventariosService],
  exports: [InventariosService],
})
export class InventariosModule {}
