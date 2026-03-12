import { Module } from '@nestjs/common'
import { ArticulosController } from './articulos.controller'
import { ArticulosService } from './articulos.service'
import { ArticulosImagenesController } from './articulos-imagenes.controller'
import { ArticulosImagenesService } from './articulos-imagenes.service'

@Module({
  controllers: [ArticulosController, ArticulosImagenesController],
  providers: [ArticulosService, ArticulosImagenesService],
  exports: [ArticulosService],
})
export class ArticulosModule {}
