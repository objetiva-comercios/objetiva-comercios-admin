import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { DepositosService } from './depositos.service'
import { CreateDepositoDto } from './dto/create-deposito.dto'
import { UpdateDepositoDto } from './dto/update-deposito.dto'
import { CreateSectorDto } from './dto/create-sector.dto'
import { UpdateSectorDto } from './dto/update-sector.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('depositos')
export class DepositosController {
  constructor(private readonly depositosService: DepositosService) {}

  @Get()
  findAll() {
    return this.depositosService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const deposito = await this.depositosService.findOne(id)
    if (!deposito) {
      throw new NotFoundException(`Deposito con ID ${id} no encontrado`)
    }
    return deposito
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDepositoDto) {
    return this.depositosService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepositoDto) {
    return this.depositosService.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.depositosService.toggleActive(id)
  }

  // ─── Sectores ──────────────────────────────────────────────────────────────

  @Get(':id/sectores')
  findSectores(@Param('id', ParseIntPipe) id: number) {
    return this.depositosService.findSectores(id)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/sectores')
  createSector(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSectorDto) {
    return this.depositosService.createSector(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/sectores/:sectorId')
  updateSector(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectorId', ParseIntPipe) sectorId: number,
    @Body() dto: UpdateSectorDto
  ) {
    return this.depositosService.updateSector(id, sectorId, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/sectores/:sectorId')
  deleteSector(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectorId', ParseIntPipe) sectorId: number
  ) {
    return this.depositosService.deleteSector(id, sectorId)
  }
}
