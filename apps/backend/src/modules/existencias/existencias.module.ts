import { Module } from '@nestjs/common'
import { ExistenciasController } from './existencias.controller'
import { ExistenciasService } from './existencias.service'

@Module({
  controllers: [ExistenciasController],
  providers: [ExistenciasService],
  exports: [ExistenciasService],
})
export class ExistenciasModule {}
