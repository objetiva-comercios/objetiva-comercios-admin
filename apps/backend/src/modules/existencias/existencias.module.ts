import { Module } from '@nestjs/common'
import { ExistenciasController } from './existencias.controller'
import { ExistenciasService } from './existencias.service'
import { ArticulosModule } from '../articulos/articulos.module'

@Module({
  imports: [ArticulosModule],
  controllers: [ExistenciasController],
  providers: [ExistenciasService],
  exports: [ExistenciasService],
})
export class ExistenciasModule {}
