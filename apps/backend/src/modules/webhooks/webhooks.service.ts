import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common'
import { createHmac, randomBytes, randomUUID } from 'crypto'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { webhooks, webhookDeliveries } from '../../db/schema'
import { CreateWebhookDto } from './dto/create-webhook.dto'
import { UpdateWebhookDto } from './dto/update-webhook.dto'
import { WebhookEvent, EVENT_TO_DB } from './webhook-events'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(private readonly drizzle: DrizzleService) {}

  private generateSecret(): string {
    const random = randomBytes(32).toString('hex')
    return 'obj_wh_' + random.substring(0, 33)
  }

  async create(dto: CreateWebhookDto) {
    const fullSecret = this.generateSecret()
    const rows = await this.drizzle.db
      .insert(webhooks)
      .values({
        name: dto.name,
        url: dto.url,
        secret: fullSecret,
        events: dto.events,
      })
      .returning()

    const webhook = rows[0]
    return { ...webhook, fullSecret }
  }

  async findAll() {
    const rows = await this.drizzle.db
      .select({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        entity: webhooks.entity,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
        revokedAt: webhooks.revokedAt,
      })
      .from(webhooks)
      .where(isNull(webhooks.revokedAt))
      .orderBy(desc(webhooks.createdAt))

    return rows
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.revokedAt)))

    return rows[0] ?? null
  }

  private async findOneAny(id: number) {
    const rows = await this.drizzle.db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)

    return rows[0] ?? null
  }

  async update(id: number, dto: UpdateWebhookDto) {
    const existing = await this.findOne(id)
    if (!existing) {
      throw new NotFoundException(`Webhook ${id} no encontrado`)
    }

    const updateData: Partial<typeof webhooks.$inferInsert> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.url !== undefined) updateData.url = dto.url
    if (dto.events !== undefined) updateData.events = dto.events

    const rows = await this.drizzle.db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        entity: webhooks.entity,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
        revokedAt: webhooks.revokedAt,
      })

    return rows[0]
  }

  async toggle(id: number) {
    const existing = await this.findOne(id)
    if (!existing) {
      throw new NotFoundException(`Webhook ${id} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(webhooks)
      .set({ active: !existing.active })
      .where(eq(webhooks.id, id))
      .returning({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        entity: webhooks.entity,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
        revokedAt: webhooks.revokedAt,
      })

    return rows[0]
  }

  async revoke(id: number) {
    const existing = await this.findOneAny(id)
    if (!existing) {
      throw new NotFoundException('Webhook no encontrado')
    }
    if (existing.revokedAt !== null) {
      throw new ConflictException('Webhook ya fue revocado')
    }

    await this.drizzle.db.update(webhooks).set({ revokedAt: new Date() }).where(eq(webhooks.id, id))
  }

  async regenerateSecret(id: number) {
    const existing = await this.findOne(id)
    if (!existing) {
      throw new NotFoundException(`Webhook ${id} no encontrado`)
    }

    const fullSecret = this.generateSecret()
    await this.drizzle.db.update(webhooks).set({ secret: fullSecret }).where(eq(webhooks.id, id))

    return { fullSecret }
  }

  async ping(webhookId: number): Promise<{
    success: boolean
    httpStatus: number | null
    durationMs: number
    error?: string
  }> {
    const webhook = await this.findOne(webhookId)
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} no encontrado`)
    }

    const deliveryId = randomUUID()
    const payload = {
      evento: 'ping',
      timestamp: new Date().toISOString(),
      webhook_id: webhookId,
      test: true,
    }

    const body = JSON.stringify(payload)
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex')
    const startTime = Date.now()

    let httpStatus: number | null = null
    let success = false
    let errorMessage: string | undefined

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10_000)
      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Event': 'ping',
            'X-Webhook-Delivery': deliveryId,
          },
          body,
          signal: controller.signal,
        })
        clearTimeout(timer)
        httpStatus = res.status
        success = res.ok
      } finally {
        clearTimeout(timer)
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Network error'
    }

    const durationMs = Date.now() - startTime

    await this.drizzle.db.insert(webhookDeliveries).values({
      webhookId,
      deliveryId,
      eventName: 'ping',
      payload: payload as Record<string, unknown>,
      attempt: 1,
      success,
      httpStatus,
      responseBody: errorMessage ?? null,
      isTest: true,
    })

    return { success, httpStatus, durationMs, error: errorMessage }
  }

  async findDeliveries(
    webhookId: number,
    page = 1,
    limit = 20
  ): Promise<{
    data: (typeof webhookDeliveries.$inferSelect)[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const existing = await this.findOne(webhookId)
    if (!existing) {
      throw new NotFoundException(`Webhook ${webhookId} no encontrado`)
    }

    const offset = (page - 1) * limit

    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))

    const data = await this.drizzle.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return { data, meta: { total, page, limit, totalPages } }
  }

  async resendDelivery(webhookId: number, deliveryId: string) {
    const webhook = await this.findOne(webhookId)
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} no encontrado`)
    }

    const originalRows = await this.drizzle.db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.webhookId, webhookId),
          eq(webhookDeliveries.deliveryId, deliveryId)
        )
      )
      .limit(1)

    const original = originalRows[0]
    if (!original) {
      throw new NotFoundException(`Delivery ${deliveryId} no encontrado`)
    }

    const newDeliveryId = randomUUID()
    // Fire and forget
    this.deliverWithRetry(
      webhookId,
      webhook.secret,
      webhook.url,
      original.eventName,
      original.payload,
      newDeliveryId,
      1
    ).catch((err: unknown) => {
      this.logger.error(`Resend delivery failed for webhook ${webhookId}:`, err)
    })

    return { deliveryId: newDeliveryId, message: 'Reenvío iniciado' }
  }

  async dispatchEvent(eventName: WebhookEvent, payload: unknown): Promise<void> {
    const eventShortName = EVENT_TO_DB[eventName]

    const allWebhooks = await this.drizzle.db
      .select()
      .from(webhooks)
      .where(and(isNull(webhooks.revokedAt), eq(webhooks.active, true)))

    const subscribed = allWebhooks.filter(wh => wh.events.includes(eventShortName))

    for (const webhook of subscribed) {
      const deliveryId = randomUUID()
      // Fire and forget — no await
      this.deliverWithRetry(
        webhook.id,
        webhook.secret,
        webhook.url,
        eventName,
        payload,
        deliveryId,
        1
      ).catch((err: unknown) => {
        this.logger.error(`Initial deliver failed for webhook ${webhook.id}:`, err)
      })
    }
  }

  private async deliverWithRetry(
    webhookId: number,
    secret: string,
    url: string,
    eventName: string,
    payload: unknown,
    deliveryId: string,
    attempt: number,
    maxAttempts = 3
  ): Promise<void> {
    const body = JSON.stringify(payload)
    const signature = createHmac('sha256', secret).update(body).digest('hex')

    let httpStatus: number | null = null
    let success = false
    let responseBody: string | null = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Event': eventName,
            'X-Webhook-Delivery': deliveryId,
          },
          body,
          signal: controller.signal,
        })
        clearTimeout(timeout)
        httpStatus = res.status
        success = res.ok
        if (!res.ok) {
          responseBody = await res.text().catch(() => null)
        }
      } finally {
        clearTimeout(timeout)
      }
    } catch (err) {
      httpStatus = null
      success = false
      responseBody = err instanceof Error ? err.message : 'Network error'
    }

    await this.drizzle.db.insert(webhookDeliveries).values({
      webhookId,
      deliveryId,
      eventName,
      payload: payload as Record<string, unknown>,
      attempt,
      success,
      httpStatus,
      responseBody,
    })

    if (!success && attempt < maxAttempts) {
      const delay = attempt === 1 ? 10_000 : 60_000
      setTimeout(() => {
        this.deliverWithRetry(
          webhookId,
          secret,
          url,
          eventName,
          payload,
          deliveryId,
          attempt + 1,
          maxAttempts
        ).catch(() => {}) // swallow — already logged in DB
      }, delay)
    }
  }
}
