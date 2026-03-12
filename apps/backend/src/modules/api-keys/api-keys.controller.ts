import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common'
import { ApiKeysService } from './api-keys.service'
import { CreateApiKeyDto } from './dto/create-api-key.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuthenticatedRequest } from '../../auth/auth.types'

@Controller('api-keys')
@UseGuards(RolesGuard)
@Roles('admin')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  private ensureNotApiKeyAuth(request: AuthenticatedRequest): void {
    if (request.user?.userId?.startsWith('apikey:')) {
      throw new ForbiddenException('Las API keys no pueden gestionar API keys')
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateApiKeyDto) {
    this.ensureNotApiKeyAuth(req)
    const { key, fullKey } = await this.apiKeysService.create(dto.name)
    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      createdAt: key.createdAt,
      fullKey,
    }
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    this.ensureNotApiKeyAuth(req)
    const keys = await this.apiKeysService.findAll()
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    }))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.ensureNotApiKeyAuth(req)
    await this.apiKeysService.revoke(Number(id))
  }
}
