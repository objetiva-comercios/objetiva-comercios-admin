# Phase 24: Webhooks - Research

**Researched:** 2026-03-12
**Domain:** NestJS EventEmitter + Webhook delivery + HMAC-SHA256 + Drizzle ORM schema
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Formulario de creación/edición

- Multi-select de eventos: un webhook puede suscribirse a múltiples eventos (create, update, delete) simultáneamente
- Campo 'Nombre' obligatorio (ej: "Sync ERP", "Notificar Slack") — mismo patrón que API Keys
- Selector de entidad visible pero deshabilitado con "Artículos" preseleccionado
- URL destino: solo HTTPS, formato URL válido. Sin verificación de conectividad al crear
- Edición completa: admin puede cambiar nombre, URL, y eventos de un webhook existente. Mismo Dialog que crear, pre-llenado

#### Toggle activo/inactivo + eliminación

- Doble mecanismo: toggle activo/inactivo + soft-delete con AlertDialog
- Toggle visible directamente en la tabla (badge "Activo" / "Pausa")
- Eliminar: AlertDialog con soft-delete con `revokedAt`, oculto de la tabla

#### Secreto y firma HMAC

- Secreto autogenerado al crear, mostrado UNA vez — mismo flujo de dos pasos que API Keys
- Prefijo: `obj_wh_` + random (~40 chars total)
- Almacenamiento en texto plano en DB (necesario para calcular HMAC)
- Regenerar secreto: botón en vista detalle con AlertDialog
- Header de firma: `X-Webhook-Signature: sha256=<hex>` (compatible con GitHub/Stripe)
- Headers adicionales: `X-Webhook-Event: articulo.created`, `X-Webhook-Delivery: <uuid>`

#### Entrega y reintentos

- Inline async + setTimeout retries (sin cron, sin BullMQ/Redis)
- Flujo: EventEmitter emite evento → WebhooksService busca webhooks suscritos → deliver() async por cada uno
- 3 intentos: POST inmediato → retry a 10s → retry a 60s → marcar como fallido
- Cada intento se registra en DB con status, HTTP code, timestamp
- No bloquea el request original del artículo

#### Log de entregas

- Vista detalle del webhook: click en webhook abre vista con info + tabla de entregas
- Tabla básica: evento, estado (OK/Fail), código HTTP, fecha
- Click en fila expande: intento N/3, payload enviado, response body (si error)
- Últimas 20 entregas con botón "Cargar más"
- Entregas de test ping se registran con tag "(test)"

#### Reenvío manual y test ping

- Botón "Reenviar" en entregas fallidas — crea nueva entrega con mismo payload
- Test ping: payload fijo `{ "evento": "ping", "timestamp": "...", "webhook_id": N, "test": true }`
- Resultado del ping inline: ✔ 200 OK (142ms) o ✘ Fail con código
- Ping firmado con HMAC, headers: `X-Webhook-Event: ping`

### Claude's Discretion

- Schema exacto de tablas (webhooks, webhook_deliveries) — campos, índices, tipos
- Implementación del EventEmitter pattern (módulo, listeners)
- Diseño exacto de la vista detalle del webhook (layout, spacing)
- Cómo manejar errores de red vs errores HTTP en el log
- Componentes UI específicos (tabla expandible, badges de estado)
- Timeout del POST de entrega

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                              | Research Support                                                                       |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| HOOK-01 | Admin can create webhook subscriptions selecting entity + event + destination URL        | Schema `webhooks` table, Create Dialog two-step pattern from API Keys                  |
| HOOK-02 | Admin can edit and delete webhook subscriptions                                          | PATCH endpoint, soft-delete `revokedAt`, toggle `active` field, same Dialog pre-filled |
| HOOK-03 | System delivers webhook payloads asynchronously with 3 retries and exponential backoff   | EventEmitter2 `@OnEvent`, fire-and-forget `deliver()` with setTimeout chain            |
| HOOK-04 | Admin can view delivery log with status (ok/fail), HTTP response code, and timestamp     | `webhook_deliveries` table, paginated GET endpoint, expandable row UI                  |
| HOOK-05 | Admin can send a test ping to a webhook URL to verify connectivity                       | POST `/webhooks/:id/ping` endpoint, inline result display                              |
| HOOK-06 | System signs webhook payloads with HMAC-SHA256, included in X-Signature header           | Node.js `crypto.createHmac('sha256', secret)`, `X-Webhook-Signature: sha256=<hex>`     |
| HOOK-07 | v1.2 supports articulos entity events (create/update/delete), architecture supports more | EventEmitter event naming convention `articulo.created`, extensible listener pattern   |

</phase_requirements>

---

## Summary

Phase 24 implements a webhook system that lets admins subscribe to articulo lifecycle events (create/update/delete) and deliver signed HTTP POST payloads to external URLs with retry logic. The architecture uses NestJS `@nestjs/event-emitter` to decouple the articulos module from webhook delivery, with a `WebhooksService` that acts as the central delivery engine.

The delivery pattern is "fire and forget": when an articulo event fires, the service fetches all active subscribed webhooks and launches an async delivery chain per webhook. Each delivery uses `setTimeout` for retries (10s, 60s) without requiring Redis or BullMQ — appropriate for the low volume (10-50 deliveries/day). Every delivery attempt is recorded in `webhook_deliveries`, giving admins a full audit log.

The UI follows the exact established patterns from Phase 23 (API Keys): two-step create dialog with one-time secret reveal, `AlertDialog` for destructive actions, and a settings page under `/settings/webhooks` accessible only to admins.

**Primary recommendation:** Install `@nestjs/event-emitter`, add two Drizzle tables (`webhooks`, `webhook_deliveries`), build `WebhooksModule` with a listener for `articulo.*` events, and replicate the API Keys UI structure with an added detail view for delivery logs.

---

## Standard Stack

### Core

| Library                      | Version  | Purpose                                   | Why Standard                                                         |
| ---------------------------- | -------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `@nestjs/event-emitter`      | ^3.0.1   | In-process event bus (EventEmitter2)      | Official NestJS package, compatible with NestJS 10, no external deps |
| `eventemitter2`              | ^6.4.9   | Underlying emitter (transitive dep)       | Included automatically with @nestjs/event-emitter                    |
| Node.js `crypto`             | built-in | HMAC-SHA256 signing                       | No additional package needed, same as Phase 23 SHA-256               |
| `drizzle-orm`                | ^0.45.1  | New tables: webhooks + webhook_deliveries | Already in project                                                   |
| `uuid` / `crypto.randomUUID` | built-in | X-Webhook-Delivery header UUIDs           | `crypto.randomUUID()` is available in Node 14.17+                    |

### Supporting

| Library             | Version | Purpose                         | When to Use                               |
| ------------------- | ------- | ------------------------------- | ----------------------------------------- |
| `class-validator`   | ^0.14.3 | DTO validation (IsUrl, IsArray) | Already in project, validate webhook DTOs |
| `class-transformer` | ^0.5.1  | DTO transformation              | Already in project                        |

### Alternatives Considered

| Instead of                   | Could Use             | Tradeoff                                                         |
| ---------------------------- | --------------------- | ---------------------------------------------------------------- |
| @nestjs/event-emitter inline | BullMQ + Redis        | BullMQ is explicitly out of scope per REQUIREMENTS.md            |
| @nestjs/event-emitter inline | @nestjs/schedule cron | Schedule would need separate infra; EVENT model fits better here |
| text().array() for events    | jsonb for events      | text array is cleaner for a fixed set of enum values             |

**Installation:**

```bash
cd apps/backend && pnpm add @nestjs/event-emitter
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/webhooks/
├── webhooks.module.ts          # imports EventEmitterModule (already global)
├── webhooks.service.ts         # CRUD + deliver() + ping()
├── webhooks.listener.ts        # @OnEvent('articulo.*') handlers
├── webhooks.controller.ts      # REST endpoints
└── dto/
    ├── create-webhook.dto.ts
    ├── update-webhook.dto.ts
    └── webhook-query.dto.ts

apps/web/src/app/(dashboard)/settings/webhooks/
└── page.tsx                    # admin-only, uses WebhooksClient

apps/web/src/components/settings/webhooks/
├── webhooks-client.tsx         # main list + create/edit dialogs
└── webhook-detail.tsx          # detail view with delivery log table
```

### Pattern 1: EventEmitter Module Registration

Register `EventEmitterModule` globally once in `AppModule`. The `wildcard: true` option enables `articulo.*` event matching in listeners.

```typescript
// app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter'

@Module({
  imports: [
    // ... existing imports
    EventEmitterModule.forRoot({ wildcard: true }),
    WebhooksModule,
  ],
})
export class AppModule {}
```

**Source:** Official NestJS docs pattern + DeepWiki nestjs/event-emitter (HIGH confidence)

### Pattern 2: Emitting Events from ArticulosService

Inject `EventEmitter2` into `ArticulosService`. Emit after the DB operation returns. Use dot-namespaced event names for wildcard matching.

```typescript
// articulos.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class ArticulosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly eventEmitter: EventEmitter2 // ADD THIS
  ) {}

  async create(dto: CreateArticuloDto) {
    const rows = await this.drizzle.db
      .insert(articulos)
      .values(dto as typeof articulos.$inferInsert)
      .returning()
    const articulo = rows[0]
    // Fire and forget — non-blocking
    this.eventEmitter.emit('articulo.created', { articulo })
    return articulo
  }

  async update(codigo: string, dto: UpdateArticuloDto) {
    const rows = await this.drizzle.db
      .update(articulos)
      .set({ ...(dto as Partial<typeof articulos.$inferInsert>), updatedAt: new Date() })
      .where(eq(articulos.codigo, codigo))
      .returning()
    if (!rows[0]) throw new NotFoundException(`...`)
    this.eventEmitter.emit('articulo.updated', { articulo: rows[0] })
    return rows[0]
  }

  async toggleActive(codigo: string) {
    // ... existing code ...
    const result = rows[0]
    // toggleActive emits updated (state change, not a separate "deleted" concept)
    this.eventEmitter.emit('articulo.updated', { articulo: result })
    return result
  }
}
```

**Note:** `toggleActive` emits `articulo.updated` since it's a field change, not deletion. Soft-delete is covered by `updated`. If the project adds hard-delete later, emit `articulo.deleted`.

### Pattern 3: Listener in WebhooksService

The listener is a method decorated with `@OnEvent`. Using `async` is fine — NestJS handles the returned promise (errors are swallowed unless you configure `ignoreErrors: false`).

```typescript
// webhooks.listener.ts
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
```

**Alternative with wildcard** (if `wildcard: true`):

```typescript
@OnEvent('articulo.*')
async handleAnyArticuloEvent(payload: unknown, eventName: string) {
  // eventName is available as second param with EventEmitter2
}
```

### Pattern 4: Deliver with Inline setTimeout Retries

```typescript
// webhooks.service.ts (deliver method)
private async deliverWithRetry(
  webhookId: number,
  secret: string,
  url: string,
  eventName: string,
  payload: unknown,
  deliveryId: string,
  attempt: number,
  maxAttempts = 3,
): Promise<void> {
  const body = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  const startTime = Date.now()
  let httpStatus: number | null = null
  let success = false
  let responseBody: string | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000) // 10s timeout
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
    // Network error or timeout
    httpStatus = null
    success = false
    responseBody = err instanceof Error ? err.message : 'Network error'
  }

  // Record this attempt
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

  // Retry if failed
  if (!success && attempt < maxAttempts) {
    const delay = attempt === 1 ? 10_000 : 60_000
    setTimeout(() => {
      this.deliverWithRetry(
        webhookId, secret, url, eventName, payload, deliveryId, attempt + 1, maxAttempts
      ).catch(() => {}) // swallow — already logged in DB
    }, delay)
  }
}
```

**Key insight:** `fetch` is available natively in Node.js 18+. NestJS 10 targets Node 18+ so no `node-fetch` needed.

### Pattern 5: HMAC-SHA256 Signing (Node.js built-in crypto)

```typescript
import { createHmac } from 'crypto'

function sign(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
}
```

Same module (`crypto`) as Phase 23's `createHash('sha256')`. No new imports needed.

### Pattern 6: Secret Generation (same as API Keys)

```typescript
import { randomBytes } from 'crypto'

function generateWebhookSecret(): string {
  const random = randomBytes(32).toString('hex')
  return 'obj_wh_' + random.substring(0, 33) // ~40 chars total
}
```

### Pattern 7: Drizzle Schema

```typescript
// schema.ts additions

export const webhooks = pgTable(
  'webhooks',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(), // plaintext — needed for HMAC
    entity: varchar('entity', { length: 50 }).notNull().default('articulo'),
    events: text('events').array().notNull(), // ['created', 'updated', 'deleted']
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'), // soft-delete
  },
  table => [
    index('webhooks_active_idx').on(table.active),
    index('webhooks_revoked_at_idx').on(table.revokedAt),
    index('webhooks_entity_idx').on(table.entity),
  ]
)

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: serial('id').primaryKey(),
    webhookId: integer('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    deliveryId: varchar('delivery_id', { length: 36 }).notNull(), // UUID
    eventName: varchar('event_name', { length: 50 }).notNull(), // 'articulo.created'
    payload: jsonb('payload').notNull(),
    attempt: integer('attempt').notNull().default(1), // 1, 2, or 3
    success: boolean('success').notNull(),
    httpStatus: integer('http_status'), // null on network error
    responseBody: text('response_body'), // error body / null
    isTest: boolean('is_test').notNull().default(false), // test ping tag
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    index('wh_deliveries_webhook_id_idx').on(table.webhookId),
    index('wh_deliveries_delivery_id_idx').on(table.deliveryId),
    index('wh_deliveries_created_at_idx').on(table.createdAt),
    index('wh_deliveries_success_idx').on(table.success),
  ]
)

export type Webhook = typeof webhooks.$inferSelect
export type NewWebhook = typeof webhooks.$inferInsert
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert
```

**Rationale for `text('events').array()`:** Events is a small fixed set (`created`, `updated`, `deleted`). A PostgreSQL text[] column is more expressive than JSONB for this use case and maps directly in Drizzle. The existing schema already uses `jsonb` for dynamic data — arrays are appropriate for enum lists.

### Pattern 8: dispatchEvent (top-level fan-out)

```typescript
async dispatchEvent(eventName: string, payload: unknown): Promise<void> {
  // Find all active, non-revoked webhooks subscribed to this event
  const eventShortName = eventName.split('.')[1] // 'created' from 'articulo.created'
  const allWebhooks = await this.drizzle.db
    .select()
    .from(webhooks)
    .where(and(isNull(webhooks.revokedAt), eq(webhooks.active, true)))

  const subscribed = allWebhooks.filter(wh =>
    wh.events.includes(eventShortName)
  )

  for (const webhook of subscribed) {
    const deliveryId = crypto.randomUUID()
    // Fire and forget — no await
    this.deliverWithRetry(
      webhook.id,
      webhook.secret,
      webhook.url,
      eventName,
      payload,
      deliveryId,
      1,
    ).catch((err: unknown) => {
      this.logger.error(`Initial deliver failed for webhook ${webhook.id}:`, err)
    })
  }
}
```

**Note:** Drizzle does not yet have native array containment operators for `postgres-js` driver in all versions. The filter is done in-memory after fetching active webhooks. Given the expected volume (10-50 webhooks total), this is efficient.

### Pattern 9: Settings Page (Front-end)

Replicates the API Keys page structure exactly:

- `apps/web/src/app/(dashboard)/settings/webhooks/page.tsx` — server component with role check
- `apps/web/src/components/settings/webhooks/webhooks-client.tsx` — client component
- Detail view as an in-page panel (not a separate route) — click row → detail expands or slides in

### Anti-Patterns to Avoid

- **Awaiting deliveries in the request handler:** The articulos controller must not await the EventEmitter emit result. `eventEmitter.emit()` is synchronous — listeners fire async and NestJS does not await them unless you use `emitAsync()`.
- **Using `emitAsync()` for webhook delivery:** This would block the request until all webhooks deliver. Use `emit()` (fire and forget).
- **Hashing the webhook secret:** Unlike API keys where we store only the hash, webhook secrets must be stored in plaintext because they're needed to compute HMAC on every delivery.
- **Storing events as a comma-separated string:** Use PostgreSQL text[] array — it's directly supported by Drizzle and enables proper type inference.
- **Missing AbortController timeout:** Without a timeout, a slow remote URL would hold a connection indefinitely. Use 10s timeout.

---

## Don't Hand-Roll

| Problem         | Don't Build                 | Use Instead                 | Why                                                                 |
| --------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------- |
| Event bus       | Custom EventEmitter wrapper | `@nestjs/event-emitter`     | Built-in NestJS support, decorators, wildcard, NestJS 10 compatible |
| HMAC signing    | Own signing utility         | Node.js `crypto.createHmac` | Built-in, battle-tested, same pattern as GitHub/Stripe              |
| UUID generation | Own random ID               | `crypto.randomUUID()`       | Built-in in Node 18+, no dependency                                 |
| HTTP delivery   | `axios` or `node-fetch`     | Native `fetch`              | Available natively in Node 18+ (NestJS 10 target)                   |

**Key insight:** This phase adds zero new dependencies except `@nestjs/event-emitter`. Everything else uses existing infrastructure.

---

## Common Pitfalls

### Pitfall 1: EventEmitter Wildcard Not Enabled

**What goes wrong:** `@OnEvent('articulo.*')` silently matches nothing.
**Why it happens:** `wildcard: true` is not the default in `EventEmitterModule.forRoot()`.
**How to avoid:** Pass `{ wildcard: true }` to `forRoot()` if using wildcards. Alternatively, use explicit `@OnEvent('articulo.created')` decorators (no wildcard needed).
**Warning signs:** Listener methods never called even though `emit()` fires.

### Pitfall 2: Blocking the Request with emitAsync

**What goes wrong:** API response is delayed by webhook delivery time.
**Why it happens:** Developer uses `await this.eventEmitter.emitAsync(...)` instead of `this.eventEmitter.emit(...)`.
**How to avoid:** Always use `emit()` (sync call, listeners are async but not awaited by the emitter).

### Pitfall 3: Secret Leaked in Delivery Log

**What goes wrong:** Webhook secret appears in logged response body or request body.
**Why it happens:** Logging full request/response objects.
**How to avoid:** Only log `httpStatus`, `success`, and truncated `responseBody`. Never log the secret or the signed request headers.

### Pitfall 4: fetch Not Available

**What goes wrong:** `ReferenceError: fetch is not defined` in NestJS service.
**Why it happens:** Node.js version is < 18 or the project overrides the global.
**How to avoid:** Check `node --version` >= 18. If needed, add `import 'whatwg-fetch'` or use `node-fetch@3`. The docker-compose likely has a Node 18+ image.
**Warning signs:** Runtime error on first webhook delivery attempt.

### Pitfall 5: setTimeout Leak on Unhandled Rejection

**What goes wrong:** Unhandled promise rejections accumulate from retry chain.
**Why it happens:** `deliverWithRetry` throws before recording to DB — retry `setTimeout` never fires correctly.
**How to avoid:** Wrap the entire `deliverWithRetry` in try/catch, always write to DB (even on exception). The `.catch(() => {})` on the setTimeout callback prevents propagation.

### Pitfall 6: Array Containment Query Complexity

**What goes wrong:** Developer tries to use Drizzle SQL to filter `WHERE 'created' = ANY(events)` — Drizzle's support for this is inconsistent with the `postgres` driver.
**Why it happens:** Expecting SQL-level filtering on the array column.
**How to avoid:** Fetch all active webhooks (small set) and filter in-memory with `.filter(wh => wh.events.includes(eventShortName))`. Perfectly efficient at this scale.

### Pitfall 7: Module Circular Dependency

**What goes wrong:** `ArticulosModule` imports `WebhooksModule` to inject `WebhooksService`, and `WebhooksModule` listener imports `ArticulosService`.
**Why it happens:** Direct service injection across modules.
**How to avoid:** Never import `WebhooksModule` into `ArticulosModule`. The coupling goes through `EventEmitter2` only — `ArticulosService` injects `EventEmitter2` (from the globally registered `EventEmitterModule`), and `WebhooksListener` is a separate provider in `WebhooksModule` that subscribes independently.

---

## Code Examples

### REST Endpoints (WebhooksController)

```typescript
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
  async create(@Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(dto)
    // Returns { ...webhook, fullSecret } — secret shown only once
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
    // Returns { fullSecret } — shown once
  }

  @Post(':id/ping')
  ping(@Param('id') id: string) {
    return this.webhooksService.ping(+id)
  }

  @Get(':id/deliveries')
  deliveries(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.webhooksService.findDeliveries(+id, +page, +limit)
  }

  @Post(':id/deliveries/:deliveryId/resend')
  resend(@Param('id') id: string, @Param('deliveryId') deliveryId: string) {
    return this.webhooksService.resendDelivery(+id, deliveryId)
  }
}
```

### DTO Validation

```typescript
// create-webhook.dto.ts
import { IsString, IsUrl, IsArray, ArrayMinSize, IsIn } from 'class-validator'

const VALID_EVENTS = ['created', 'updated', 'deleted'] as const

export class CreateWebhookDto {
  @IsString()
  name: string

  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_EVENTS, { each: true })
  events: string[]
}
```

### Ping Implementation

```typescript
async ping(webhookId: number): Promise<{ success: boolean; httpStatus: number | null; durationMs: number; error?: string }> {
  const webhook = await this.findOne(webhookId)
  if (!webhook) throw new NotFoundException(`Webhook ${webhookId} no encontrado`)

  const deliveryId = crypto.randomUUID()
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

  // Log ping to delivery table
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
```

### API Client Functions (web)

```typescript
// api.client.ts additions

export interface WebhookItem {
  id: number
  name: string
  url: string
  entity: string
  events: string[]
  active: boolean
  createdAt: string
  revokedAt: string | null
}

export interface WebhookCreated extends WebhookItem {
  fullSecret: string
}

export interface WebhookDelivery {
  id: number
  webhookId: number
  deliveryId: string
  eventName: string
  payload: unknown
  attempt: number
  success: boolean
  httpStatus: number | null
  responseBody: string | null
  isTest: boolean
  createdAt: string
}

export async function fetchWebhooks(): Promise<WebhookItem[]> {
  /* ... */
}
export async function createWebhook(data: {
  name: string
  url: string
  events: string[]
}): Promise<WebhookCreated> {
  /* ... */
}
export async function updateWebhook(
  id: number,
  data: Partial<{ name: string; url: string; events: string[] }>
): Promise<WebhookItem> {
  /* ... */
}
export async function toggleWebhook(id: number): Promise<WebhookItem> {
  /* ... */
}
export async function revokeWebhook(id: number): Promise<void> {
  /* ... */
}
export async function regenerateWebhookSecret(id: number): Promise<{ fullSecret: string }> {
  /* ... */
}
export async function pingWebhook(
  id: number
): Promise<{ success: boolean; httpStatus: number | null; durationMs: number; error?: string }> {
  /* ... */
}
export async function fetchWebhookDeliveries(
  id: number,
  page?: number
): Promise<{ data: WebhookDelivery[]; meta: PaginationMeta }> {
  /* ... */
}
export async function resendWebhookDelivery(webhookId: number, deliveryId: string): Promise<void> {
  /* ... */
}
```

---

## State of the Art

| Old Approach              | Current Approach           | When Changed                | Impact                          |
| ------------------------- | -------------------------- | --------------------------- | ------------------------------- |
| `node-fetch` for HTTP     | Native `fetch` in Node 18+ | Node 18 (2022)              | No dependency needed            |
| Separate cron for retries | `setTimeout` inline        | Always valid for low volume | Simpler, no Redis               |
| BullMQ queues             | EventEmitter2 inline       | N/A — scale-dependent       | Appropriate for 10-50/day       |
| `@nestjs/schedule`        | Not needed here            | N/A                         | Decision: setTimeout sufficient |

**Deprecated/outdated:**

- `node-fetch` v2/v3: Not needed when targeting Node 18+ with native fetch

---

## Open Questions

1. **`toggleActive` event semantics**
   - What we know: `toggleActive` changes the `activo` field — it's an update, not a soft-delete
   - What's unclear: Should toggling to `activo: false` emit `articulo.updated` or a separate `articulo.deactivated`?
   - Recommendation: Emit `articulo.updated` — the payload includes the full articulo object, and consumers can inspect `activo` field. Simpler and consistent with the 3-event model.

2. **Array containment query in Drizzle**
   - What we know: Drizzle supports `sql\`'created' = ANY(${webhooks.events})\``but behavior with`postgres-js` driver may vary
   - What's unclear: Whether this creates a proper query plan
   - Recommendation: In-memory filter after fetching active webhooks. At <= 50 webhooks, this is negligible. Document as a future optimization if volume grows.

3. **`fetch` availability in NestJS Docker container**
   - What we know: Node 18+ has native fetch; NestJS 10 targets Node 18+
   - What's unclear: The exact Node version in the project's docker-compose
   - Recommendation: Check `docker-compose.yml` for the Node image version. If Node < 18, add `node-fetch@3`. Based on the docker-compose in git status showing modifications, verify the backend service image.

---

## Validation Architecture

### Test Framework

| Property           | Value                                              |
| ------------------ | -------------------------------------------------- |
| Framework          | None detected (no jest.config, no test/ directory) |
| Config file        | None — Wave 0 gap                                  |
| Quick run command  | `cd apps/backend && pnpm test` (once configured)   |
| Full suite command | `cd apps/backend && pnpm test`                     |

### Phase Requirements → Test Map

| Req ID  | Behavior                    | Test Type            | Notes                             |
| ------- | --------------------------- | -------------------- | --------------------------------- |
| HOOK-01 | Create webhook subscription | manual               | No test infrastructure in project |
| HOOK-02 | Edit/delete webhook         | manual               | Same                              |
| HOOK-03 | Async delivery with retries | manual (integration) | Would need a test HTTP server     |
| HOOK-04 | Delivery log CRUD           | manual               | Same                              |
| HOOK-05 | Test ping                   | manual (integration) | Requires live HTTP target         |
| HOOK-06 | HMAC signature verification | unit                 | High value to test with crypto    |
| HOOK-07 | Articulo event architecture | manual               | EventEmitter wiring               |

### Wave 0 Gaps

- No test infrastructure exists in this project — testing is done manually via the UI and direct API calls
- HMAC signing function is a candidate for a lightweight unit test if tests are added
- Integration tests for delivery would require a mock HTTP server (e.g., `msw` or a local express server)

_(No existing test infrastructure — manual verification is the established pattern across all prior phases)_

---

## Sources

### Primary (HIGH confidence)

- [nestjs/event-emitter GitHub](https://github.com/nestjs/event-emitter) — package identity, latest version 3.0.1, NestJS 10 compatible
- [DeepWiki nestjs/event-emitter installation](https://deepwiki.com/nestjs/event-emitter/1.1-installation-and-setup) — forRoot() API
- [dev.to EventEmitter Architecture](https://dev.to/ezilemdodana/event-driven-architecture-with-nestjs-using-the-eventemitter-module-35fe) — EventEmitter2 injection, @OnEvent decorator
- Node.js built-in `crypto` module — HMAC-SHA256 (same as Phase 23, HIGH confidence from existing codebase)
- Existing codebase: `api-keys.service.ts`, `api-keys.controller.ts`, `api-keys-client.tsx` — established UI and service patterns
- Existing `schema.ts` — Drizzle table patterns, `revokedAt` soft-delete, `jsonb` usage

### Secondary (MEDIUM confidence)

- [drizzle-orm PG column types](https://orm.drizzle.team/docs/column-types/pg) — `text().array()` column support
- [wanago.io arrays with Drizzle](https://wanago.io/2024/07/08/api-nestjs-postgresql-arrays-drizzle-orm/) — practical Drizzle array pattern

### Tertiary (LOW confidence)

- [DEV webhook retry patterns](https://dev.to/juan_castillo/building-a-webhook-systems-with-nestjs-handling-retry-security-dead-letter-queues-and-rate-4nm7) — confirms HMAC pattern; retry via BullMQ (rejected per requirements, but confirms HMAC implementation)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `@nestjs/event-emitter` is official, NestJS 10 compatible; crypto is built-in; all other libs already in project
- Architecture: HIGH — EventEmitter2 + @OnEvent is the canonical NestJS pattern; delivery logic is straightforward async with setTimeout; Drizzle schema follows exact existing patterns
- Pitfalls: HIGH — most pitfalls derived from direct code inspection (circular deps, wildcard config, emitAsync vs emit) + established knowledge of Node.js fetch availability

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable ecosystem — NestJS 10, Drizzle 0.45, EventEmitter2)
