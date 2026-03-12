import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { WebhooksService } from './webhooks.service'

@Injectable()
export class WebhooksListener {
  constructor(private readonly webhooksService: WebhooksService) {}

  @OnEvent('articulo.created')
  async handleArticuloCreated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent('articulo.created', payload)
  }

  @OnEvent('articulo.updated')
  async handleArticuloUpdated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent('articulo.updated', payload)
  }

  @OnEvent('articulo.deleted')
  async handleArticuloDeleted(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent('articulo.deleted', payload)
  }
}
