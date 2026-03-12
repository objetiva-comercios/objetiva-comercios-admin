# Phase 26: Tech Debt Cleanup v1.2 - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Corregir 3 defectos identificados en el milestone audit v1.2: idempotencia de re-revoke en API keys y webhooks, y acoplamiento implícito de event names en el sistema de webhooks. El fix de precio enableHiding ya fue aplicado (commit b7e89c5) y queda fuera de scope.

</domain>

<decisions>
## Implementation Decisions

### Re-revoke idempotency (API Keys + Webhooks)

- Ambos servicios responden **409 Conflict** cuando se intenta revocar algo ya revocado
- Mensaje explícito: "API key ya fue revocada" / "Webhook ya fue revocado"
- Patrón: buscar por ID sin filtrar revokedAt, chequear estado, tirar ConflictException si ya revocado
- webhooks.service necesita cambiar findOne (actualmente filtra revocados → 404) a búsqueda sin filtro + check explícito
- api-keys.service necesita agregar findById + check de revokedAt antes de actualizar
- Preserva timestamp original de revocación (no sobrescribe)
- Frontend: sin cambios — el toast genérico de error ya muestra el mensaje del backend

### Type safety de eventos webhook

- Constante `WEBHOOK_EVENTS` como `as const` object en `webhooks/webhook-events.ts` dentro del módulo webhooks
- Type `WebhookEvent` derivado del const object
- Mapeo `EVENT_TO_DB` de evento completo a short-form de DB (ej: 'articulo.created' → 'created')
- Solo compile-time — sin validación runtime extra
- Solo backend — el frontend mantiene sus eventos hardcodeados por ahora
- articulos.service importa los eventos desde el módulo webhooks
- dispatchEvent tipado con `WebhookEvent` como parámetro

### Precio enableHiding (RESUELTO)

- Ya aplicado en commit b7e89c5 — fuera de scope de esta fase
- Success criteria #1 del roadmap ya se cumple

### Claude's Discretion

- Estructura interna del archivo webhook-events.ts (si incluir helpers adicionales)
- Si webhooks.service necesita un método findOneIncludingRevoked o reusar findOne con parámetro

</decisions>

<specifics>
## Specific Ideas

No specific requirements — fixes técnicos guiados por el audit report.

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ConflictException` de @nestjs/common — disponible para 409 responses
- `isNull()` de drizzle-orm — ya usado en ambos servicios para filtrar revocados
- Patrón `findOne` en webhooks.service — base para el check de estado

### Established Patterns

- Guards/exceptions de NestJS: NotFoundException ya usado en webhooks.service
- Event emitter: `@OnEvent` decorators en webhooks.listener.ts con handlers explícitos por evento
- Drizzle query builder: pattern consistente de select/update/where en ambos servicios

### Integration Points

- `articulos.service.ts` emite eventos → importará constantes de webhooks module
- `webhooks.listener.ts` escucha eventos → usará constantes para @OnEvent decorators
- `webhooks.service.ts dispatchEvent` → tipará parámetro como WebhookEvent, usará EVENT_TO_DB para matching

</code_context>

<deferred>
## Deferred Ideas

- Mover constantes de eventos a @objetiva/types cuando se agreguen más entidades (HOOK-F01, F02, F03)
- Frontend de webhooks importar eventos desde paquete compartido en vez de hardcodear

</deferred>

---

_Phase: 26-tech-debt-cleanup-v12_
_Context gathered: 2026-03-12_
