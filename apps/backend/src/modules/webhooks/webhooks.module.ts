import { Module } from '@nestjs/common'
import { WebhooksService } from './webhooks.service'
import { WebhooksController } from './webhooks.controller'
import { WebhooksListener } from './webhooks.listener'

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksListener],
  exports: [WebhooksService],
})
export class WebhooksModule {}
