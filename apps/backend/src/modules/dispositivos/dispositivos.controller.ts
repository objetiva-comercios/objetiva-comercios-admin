import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { DispositivosService } from './dispositivos.service'
import { CreateDispositivoDto } from './dto/create-dispositivo.dto'
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('dispositivos')
export class DispositivosController {
  constructor(private readonly dispositivosService: DispositivosService) {}

  @Get()
  findAll() {
    return this.dispositivosService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const dispositivo = await this.dispositivosService.findOne(id)
    if (!dispositivo) {
      throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
    }
    return dispositivo
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDispositivoDto) {
    return this.dispositivosService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDispositivoDto) {
    return this.dispositivosService.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/toggle')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.dispositivosService.toggleActive(id)
  }
}
