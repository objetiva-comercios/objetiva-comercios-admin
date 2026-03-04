import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { Public } from '../../common/decorators/public.decorator'
import { SettingsService } from './settings.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'

const LOGO_TYPES = ['square', 'rectangular'] as const
type LogoType = (typeof LOGO_TYPES)[number]

const fieldMap: Record<LogoType, 'logoSquare' | 'logoRectangular'> = {
  square: 'logoSquare',
  rectangular: 'logoRectangular',
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  get() {
    return this.settingsService.get()
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto)
  }

  @Post('logo/:type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('type') type: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(png|jpeg|webp|svg\+xml)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    if (!LOGO_TYPES.includes(type as LogoType)) {
      throw new BadRequestException('Tipo de logo inválido. Usar "square" o "rectangular".')
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const filename = `logo-${uniqueSuffix}${extname(file.originalname)}`
    await writeFile(join(process.cwd(), 'uploads', filename), file.buffer)

    return this.settingsService.updateLogo(fieldMap[type as LogoType], filename)
  }

  @Delete('logo/:type')
  deleteLogo(@Param('type') type: string) {
    if (!LOGO_TYPES.includes(type as LogoType)) {
      throw new BadRequestException('Tipo de logo inválido. Usar "square" o "rectangular".')
    }

    return this.settingsService.deleteLogo(fieldMap[type as LogoType])
  }
}
