# Phase 24: Webhooks - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Administradores pueden configurar suscripciones webhook que notifican eventos de artículos (create/update/delete) a URLs externas con entrega confiable (retry + firma HMAC). Incluye CRUD de webhooks, log de entregas, test ping, y regeneración de secretos. v1.2 solo artículos, arquitectura extensible a más entidades.

</domain>

<decisions>
## Implementation Decisions

### Formulario de creación/edición

- Multi-select de eventos: un webhook puede suscribirse a múltiples eventos (create, update, delete) simultáneamente
- Campo 'Nombre' obligatorio (ej: "Sync ERP", "Notificar Slack") — mismo patrón que API Keys
- Selector de entidad visible pero deshabilitado con "Artículos" preseleccionado — deja claro que la arquitectura soportará más entidades
- URL destino con validación: solo HTTPS, formato URL válido. Sin verificación de conectividad al crear (el test ping es para eso)
- Edición completa: admin puede cambiar nombre, URL, y eventos de un webhook existente. Mismo Dialog que crear, pre-llenado

### Toggle activo/inactivo + eliminación

- Doble mecanismo: toggle activo/inactivo para pausar temporalmente + soft-delete con AlertDialog para eliminar definitivamente
- Toggle visible directamente en la tabla de webhooks (badge "Activo" / "Pausa")
- Eliminar: AlertDialog con mensaje "El webhook dejará de recibir eventos inmediatamente. Las entregas pendientes se cancelarán." Soft-delete con revokedAt, oculto de la tabla
- Patrón consistente con API Keys (Phase 23) y artículos (Phase 19)

### Secreto y firma HMAC

- Secreto autogenerado al crear, mostrado UNA vez con botón copiar + warning "No se mostrará de nuevo" — mismo flujo de dos pasos que API Keys
- Prefijo: `obj_wh_` + random (~40 chars total)
- Almacenamiento en texto plano en DB (necesario para calcular HMAC en cada entrega, no se puede hashear)
- Regenerar secreto: botón en vista detalle con AlertDialog "El secreto anterior dejará de funcionar inmediatamente"
- Header de firma: `X-Webhook-Signature: sha256=<hex>` (compatible con GitHub/Stripe pattern)
- Headers adicionales en cada entrega: `X-Webhook-Event: articulo.created`, `X-Webhook-Delivery: <uuid>`

### Entrega y reintentos

- Inline async + setTimeout retries (sin cron, sin BullMQ/Redis)
- Flujo: EventEmitter emite evento → WebhooksService busca webhooks suscritos → deliver() async por cada uno
- 3 intentos: POST inmediato → retry a 10s → retry a 60s → marcar como fallido
- Cada intento se registra en DB con status, HTTP code, timestamp
- No bloquea el request original del artículo

### Log de entregas

- Vista detalle del webhook: click en webhook de la tabla abre vista con info del webhook + tabla de entregas abajo
- Tabla básica: evento, estado (OK/Fail), código HTTP, fecha
- Click en fila expande: intento N/3, payload enviado, response body (si error)
- Últimas 20 entregas con botón "Cargar más" para paginar
- Sin retención/cleanup por ahora — volumen bajo (~18K registros/año), trivial para PostgreSQL
- Entregas de test ping se registran en el log con tag "(test)"

### Reenvío manual y test ping

- Botón "Reenviar" visible en entregas fallidas (fila expandida) — crea nueva entrega con mismo payload
- Test ping: botón en vista detalle, envía payload fijo `{ "evento": "ping", "timestamp": "...", "webhook_id": N, "test": true }`
- Resultado del ping inline: ✔ 200 OK (142ms) o ✘ Fail con código
- Ping firmado con HMAC igual que entregas reales, headers: `X-Webhook-Event: ping`

### Claude's Discretion

- Schema exacto de tablas (webhooks, webhook_deliveries) — campos, índices, tipos
- Implementación del EventEmitter pattern (módulo, listeners)
- Diseño exacto de la vista detalle del webhook (layout, spacing)
- Cómo manejar errores de red vs errores HTTP en el log
- Componentes UI específicos (tabla expandible, badges de estado)
- Timeout del POST de entrega

</decisions>

<specifics>
## Specific Ideas

- El flujo de "mostrar secreto una vez" debe ser idéntico al de API Keys: Dialog de creación → segundo paso con secreto + warning + botón copiar + "Entendido"
- AlertDialog de eliminación consistente con Phase 19 (artículos) y Phase 23 (API Keys)
- Headers de entrega siguen convención de la industria: GitHub/Stripe webhook patterns
- La tabla de webhooks muestra: Nombre, URL (truncada), Eventos (badges), Estado (toggle), Acciones (⋮ con editar/eliminar)
- Estética Tabler del proyecto: border-radius reducido, alturas compactas, text-sm base

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- API Keys module (`apps/backend/src/modules/api-keys/`): patrón exacto para CRUD, soft-delete, guards, DTOs
- CompositeAuthGuard: ya maneja JWT + API key, webhooks CRUD protegido con `@Roles('admin')`
- API Keys UI (`apps/web/src/components/settings/api-keys/api-keys-client.tsx`): patrón de Dialog dos pasos, AlertDialog, tabla compacta
- Settings nav (`apps/web/src/components/settings/settings-nav.tsx`): agregar item "Webhooks" con icono
- Drizzle schema (`apps/backend/src/db/schema.ts`): agregar tablas webhooks y webhook_deliveries

### Established Patterns

- Soft-delete con `revokedAt` timestamp, filtro `isNull(revokedAt)` en queries
- Dialog de creación en dos pasos (form → reveal secret) — API Keys Phase 23
- Secciones admin-only: `notFound()` para viewers en páginas restringidas
- Fire-and-forget updates (patrón de `updateLastUsed` en API Keys)
- Settings layout con role prop para control de acceso

### Integration Points

- `ArticulosController` (create/update/toggleActive): emitir eventos de webhook
- `settings-nav.tsx`: agregar "Webhooks" como 8vo item
- `apps/web/src/app/(dashboard)/settings/webhooks/`: nueva ruta
- `apps/web/src/lib/api.client.ts`: funciones para webhooks API
- `apps/backend/src/app.module.ts`: registrar WebhooksModule + EventEmitterModule

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 24-webhooks_
_Context gathered: 2026-03-12_
