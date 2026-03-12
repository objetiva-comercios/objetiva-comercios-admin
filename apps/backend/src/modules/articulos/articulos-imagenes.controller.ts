import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ArticulosImagenesService } from './articulos-imagenes.service'
import { UploadImagenDto } from './dto/upload-imagen.dto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new BadRequestException('Tipo de archivo no permitido. Use JPG, PNG o WebP'))
  }
}

@Controller('articulos')
export class ArticulosImagenesController {
  constructor(private readonly articulosImagenesService: ArticulosImagenesService) {}

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':codigo/imagenes')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter,
    })
  )
  uploadImagen(
    @Param('codigo') codigo: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImagenDto
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido')
    }
    return this.articulosImagenesService.uploadImagen(codigo, file.buffer, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':codigo/imagenes/:tipo/:slot')
  deleteImagen(
    @Param('codigo') codigo: string,
    @Param('tipo') tipo: string,
    @Param('slot', ParseIntPipe) slot: number
  ) {
    return this.articulosImagenesService.deleteImagen(codigo, tipo as 'etiqueta' | 'producto', slot)
  }
}
