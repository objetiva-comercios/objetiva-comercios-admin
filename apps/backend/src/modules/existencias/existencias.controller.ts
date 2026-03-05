import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { ExistenciasService } from './existencias.service'
import { ExistenciaQueryDto } from './dto/existencia-query.dto'
import { CreateExistenciaDto } from './dto/create-existencia.dto'
import { UpdateExistenciaDto } from './dto/update-existencia.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('existencias')
export class ExistenciasController {
  constructor(private readonly existenciasService: ExistenciasService) {}

  @Get()
  findByDeposito(@Query() query: ExistenciaQueryDto) {
    const depositoId = query.depositoId
    if (!depositoId) {
      return this.existenciasService.findByDeposito(0, query)
    }
    return this.existenciasService.findByDeposito(depositoId, query)
  }

  @Get('matrix')
  findMatrix(@Query() query: ExistenciaQueryDto) {
    return this.existenciasService.findMatrix(query)
  }

  @Get('kpi')
  getKpiStats() {
    return this.existenciasService.getKpiStats()
  }

  @Get('articulo/:articuloCodigo')
  findByArticulo(@Param('articuloCodigo') articuloCodigo: string) {
    return this.existenciasService.findByArticulo(articuloCodigo)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  upsert(@Body() dto: CreateExistenciaDto) {
    return this.existenciasService.upsert(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':articuloCodigo/:depositoId')
  update(
    @Param('articuloCodigo') articuloCodigo: string,
    @Param('depositoId', ParseIntPipe) depositoId: number,
    @Body() dto: UpdateExistenciaDto
  ) {
    return this.existenciasService.update(articuloCodigo, depositoId, dto)
  }
}
