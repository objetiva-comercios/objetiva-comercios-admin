import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { WebhooksService } from './webhooks.service'
import { WEBHOOK_EVENTS } from './webhook-events'

@Injectable()
export class WebhooksListener {
  constructor(private readonly webhooksService: WebhooksService) {}

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_CREATED)
  async handleArticuloCreated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_CREATED, payload)
  }

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_UPDATED)
  async handleArticuloUpdated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_UPDATED, payload)
  }

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_DELETED)
  async handleArticuloDeleted(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_DELETED, payload)
  }
}
