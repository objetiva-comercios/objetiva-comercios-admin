import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { WebhooksService } from './webhooks.service'
import { CreateWebhookDto } from './dto/create-webhook.dto'
import { UpdateWebhookDto } from './dto/update-webhook.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('webhooks')
@UseGuards(RolesGuard)
@Roles('admin')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  findAll() {
    return this.webhooksService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.webhooksService.findOne(+id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(+id, dto)
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.webhooksService.toggle(+id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id') id: string) {
    return this.webhooksService.revoke(+id)
  }

  @Post(':id/regenerate-secret')
  regenerateSecret(@Param('id') id: string) {
    return this.webhooksService.regenerateSecret(+id)
  }

  @Post(':id/ping')
  ping(@Param('id') id: string) {
    return this.webhooksService.ping(+id)
  }

  @Get(':id/deliveries')
  findDeliveries(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.webhooksService.findDeliveries(+id, +page, +limit)
  }

  @Post(':id/deliveries/:deliveryId/resend')
  resend(@Param('id') id: string, @Param('deliveryId') deliveryId: string) {
    return this.webhooksService.resendDelivery(+id, deliveryId)
  }
}
