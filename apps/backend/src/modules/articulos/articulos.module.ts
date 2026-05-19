import { Module } from '@nestjs/common'
import { ArticulosController } from './articulos.controller'
import { ArticulosService } from './articulos.service'
import { ArticulosImagenesController } from './articulos-imagenes.controller'
import { ArticulosImagenesService } from './articulos-imagenes.service'
import { ArticulosHelper } from './articulos-helper'

@Module({
  controllers: [ArticulosController, ArticulosImagenesController],
  providers: [ArticulosService, ArticulosImagenesService, ArticulosHelper],
  exports: [ArticulosService, ArticulosHelper],
})
export class ArticulosModule {}
