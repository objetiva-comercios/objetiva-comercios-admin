# Phase 26: Tech Debt Cleanup v1.2 - Research

**Researched:** 2026-03-12
**Domain:** NestJS service layer — idempotency guards + TypeScript type safety
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Re-revoke responde **409 Conflict** (ConflictException de @nestjs/common) para API keys y webhooks ya revocados
- Mensaje explícito: "API key ya fue revocada" / "Webhook ya fue revocado"
- Patrón: buscar por ID sin filtrar revokedAt, chequear estado, tirar ConflictException si ya revocado
- webhooks.service.findOne actualmente filtra revocados (isNull) — debe cambiarse a búsqueda sin filtro + check explícito
- api-keys.service necesita agregar findById + check de revokedAt antes de actualizar
- Preserva timestamp original de revocación (no sobrescribe revokedAt)
- Frontend: sin cambios — toast genérico ya muestra mensaje del backend
- Constante `WEBHOOK_EVENTS` como `as const` object en `webhooks/webhook-events.ts` dentro del módulo webhooks
- Type `WebhookEvent` derivado del const object
- Mapeo `EVENT_TO_DB` de evento completo a short-form de DB (ej: 'articulo.created' → 'created')
- Solo compile-time — sin validación runtime extra
- Solo backend — el frontend mantiene sus eventos hardcodeados por ahora
- articulos.service importa los eventos desde el módulo webhooks
- dispatchEvent tipado con `WebhookEvent` como parámetro

### Claude's Discretion

- Estructura interna del archivo webhook-events.ts (si incluir helpers adicionales)
- Si webhooks.service necesita un método findOneIncludingRevoked o reusar findOne con parámetro

### Deferred Ideas (OUT OF SCOPE)

- Mover constantes de eventos a @objetiva/types cuando se agreguen más entidades (HOOK-F01, F02, F03)
- Frontend de webhooks importar eventos desde paquete compartido en vez de hardcodear
- precio enableHiding — ya aplicado en commit b7e89c5, fuera de scope
  </user_constraints>

---

## Summary

Esta fase corrige tres defectos puntuales en el backend NestJS: (1) api-keys.service.revoke() no verifica si la key ya fue revocada antes de actualizar, causando que un segundo revoke sobreescriba el revokedAt original silenciosamente; (2) webhooks.service.revoke() usa findOne() que filtra isNull(revokedAt), por lo que un webhook ya revocado devuelve 404 en lugar de 409; (3) dispatchEvent() en webhooks.service usa string splitting frágil (`eventName.split('.')[1]`) para derivar el short-form y acepta `string` sin type safety, permitiendo errores en tiempo de compilación.

Los tres fixes son quirúrgicos y aislados. No hay cambios de esquema de BD, no hay cambios de frontend, no hay nuevas dependencias. Todo el trabajo vive en `apps/backend/src/modules/`.

**Primary recommendation:** Implementar en un solo plan con tres tareas secuenciales: (1) webhook-events.ts, (2) api-keys idempotency, (3) webhooks idempotency + consumo de constantes tipadas.

---

## Standard Stack

### Core (ya instalado — sin nuevas dependencias)

| Library        | Version | Purpose                                          | Why Standard                   |
| -------------- | ------- | ------------------------------------------------ | ------------------------------ |
| @nestjs/common | 10.x    | ConflictException, NotFoundException, Injectable | Ya presente en ambos servicios |
| drizzle-orm    | ^0.30   | eq(), isNull(), and() — query builder            | ORM del proyecto               |
| TypeScript     | 5.x     | `as const`, tipos derivados con `typeof`         | Compilador del monorepo        |

### No se requieren nuevas instalaciones

Todos los tools necesarios (`ConflictException`, `isNull`, `eq`) ya están importados en los servicios o disponibles en los paquetes instalados.

---

## Architecture Patterns

### Estructura de archivos afectados

```
apps/backend/src/modules/
├── webhooks/
│   ├── webhook-events.ts          ← NUEVO: constantes + tipos
│   ├── webhooks.service.ts        ← MODIFICAR: findOne, revoke, dispatchEvent
│   ├── webhooks.listener.ts       ← MODIFICAR: @OnEvent usa constantes
│   └── webhooks.module.ts         ← sin cambios
└── api-keys/
    └── api-keys.service.ts        ← MODIFICAR: revoke() + findById()
└── articulos/
    └── articulos.service.ts       ← MODIFICAR: emit() usa constantes importadas
```

### Pattern 1: Idempotency Guard (buscar sin filtro → chequear → lanzar)

**What:** Buscar la entidad sin filtrar por revokedAt; si existe y ya está revocada, lanzar ConflictException.
**When to use:** Cualquier operación destructiva one-way (revoke, cancel, close) que no debe ejecutarse dos veces.

```typescript
// Source: código real del proyecto + @nestjs/common docs
import { ConflictException, NotFoundException } from '@nestjs/common'

async revoke(id: number) {
  // Buscar sin filtro de revokedAt
  const rows = await this.drizzle.db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1)

  const existing = rows[0]
  if (!existing) {
    throw new NotFoundException(`API key ${id} no encontrada`)
  }
  if (existing.revokedAt !== null) {
    throw new ConflictException('API key ya fue revocada')
  }

  // Solo se llega aquí si está activa
  await this.drizzle.db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
}
```

### Pattern 2: findOne con parámetro opcional para incluir revocados

**What:** Extender findOne con un flag `includeRevoked` en lugar de duplicar la query.
**When to use:** Cuando el mismo método necesita comportarse distinto según el contexto (CRUD normal vs operación de estado).

```typescript
// Opción A: parámetro booleano en findOne existente
async findOne(id: number, includeRevoked = false) {
  const conditions = includeRevoked
    ? [eq(webhooks.id, id)]
    : [eq(webhooks.id, id), isNull(webhooks.revokedAt)]

  const rows = await this.drizzle.db
    .select()
    .from(webhooks)
    .where(and(...conditions))

  return rows[0] ?? null
}

// Opción B: método separado findOneAny (más explícito)
private async findOneAny(id: number) {
  const rows = await this.drizzle.db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
  return rows[0] ?? null
}
```

La discreción de Claude aplica aquí — ambas son válidas. La opción B (método privado separado) es más explícita y no rompe callers de findOne existentes.

### Pattern 3: Constantes `as const` con tipos derivados

**What:** Definir el set de eventos como objeto constante TypeScript; derivar el tipo union del objeto.
**When to use:** Siempre que strings literales se usen en múltiples lugares del codebase (emisor + listener + dispatcher).

```typescript
// Source: TypeScript handbook — const assertions
// apps/backend/src/modules/webhooks/webhook-events.ts

export const WEBHOOK_EVENTS = {
  ARTICULO_CREATED: 'articulo.created',
  ARTICULO_UPDATED: 'articulo.updated',
  ARTICULO_DELETED: 'articulo.deleted',
} as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]
// resultado: 'articulo.created' | 'articulo.updated' | 'articulo.deleted'

// Mapeo de evento completo → short-form de DB
export const EVENT_TO_DB: Record<WebhookEvent, string> = {
  'articulo.created': 'created',
  'articulo.updated': 'updated',
  'articulo.deleted': 'deleted',
}
```

```typescript
// webhooks.service.ts — dispatchEvent tipado
async dispatchEvent(eventName: WebhookEvent, payload: unknown): Promise<void> {
  const eventShortName = EVENT_TO_DB[eventName] // type-safe, sin split()
  // ...resto sin cambios
}
```

```typescript
// articulos.service.ts — import de constantes
import { WEBHOOK_EVENTS } from '../webhooks/webhook-events'

// en create():
this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_CREATED, { articulo })

// en update():
this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_UPDATED, { articulo: rows[0] })

// en softDelete():
this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_DELETED, { articulo })
```

```typescript
// webhooks.listener.ts — @OnEvent usa constantes
import { WEBHOOK_EVENTS } from './webhook-events'

@OnEvent(WEBHOOK_EVENTS.ARTICULO_CREATED)
async handleArticuloCreated(payload: { articulo: unknown }) {
  await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_CREATED, payload)
}
```

### Anti-Patterns a Evitar

- **String splitting frágil:** `eventName.split('.')[1]` no falla en compilación si el string cambia. Reemplazar con `EVENT_TO_DB[eventName]`.
- **Reusar findOne que filtra revokedAt para operaciones de revoke:** Devuelve 404 cuando debería devolver 409.
- **Sobrescribir revokedAt en segundo revoke:** Perder el timestamp original. Siempre chequear antes de actualizar.
- **Importar ciclos:** articulos.service importa de webhooks/ — verificar que webhooks/ no importe de articulos/ para evitar circular dependency.

---

## Don't Hand-Roll

| Problem                              | Don't Build        | Use Instead                                     | Why                                                                                                  |
| ------------------------------------ | ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 409 HTTP response                    | Custom error class | ConflictException (@nestjs/common)              | NestJS mapea automáticamente al status 409 con estructura { statusCode, message }                    |
| Type union de strings                | Enum TypeScript    | `as const` object + `typeof` derivado           | Enums TypeScript tienen overhead de runtime; `as const` es pure compile-time y más composable        |
| Circular import entre módulos NestJS | Re-export manual   | Importar desde archivo de constantes standalone | webhook-events.ts no tiene dependencias, puede ser importado desde cualquier módulo sin circular ref |

**Key insight:** ConflictException ya existe en @nestjs/common — no hay que instalar nada ni crear excepciones custom. `as const` es TypeScript nativo — sin librerías.

---

## Common Pitfalls

### Pitfall 1: Circular dependency articulos ↔ webhooks

**What goes wrong:** articulos.service importa desde `../webhooks/webhook-events`. Si webhooks importa algo de articulos, NestJS lanza circular dependency error en runtime.
**Why it happens:** webhook-events.ts es un archivo de constantes puras — no debería importar nada del módulo articulos, pero hay que verificarlo.
**How to avoid:** Mantener webhook-events.ts como módulo leaf (sin imports de dominio). Solo exporta constantes y tipos.
**Warning signs:** Error de NestJS al arrancar: "A circular dependency has been detected".

### Pitfall 2: findOne usado en update/toggle después del cambio

**What goes wrong:** Al cambiar findOne para incluir revocados (opción A), los callers update(), toggle(), ping(), findDeliveries(), resendDelivery(), regenerateSecret() que llaman findOne() podrían encontrar webhooks revocados cuando antes devolvían 404.
**Why it happens:** findOne tiene múltiples callers con semánticas distintas.
**How to avoid:** Preferir opción B — método privado findOneAny() solo llamado desde revoke(). findOne() pública mantiene comportamiento actual (filtra isNull).
**Warning signs:** Tests o llamadas a update() con webhook revocado que antes fallaban ahora retornan datos.

### Pitfall 3: dispatchEvent caller en webhooks.listener debe pasar WebhookEvent

**What goes wrong:** webhooks.listener.ts llama `this.webhooksService.dispatchEvent('articulo.created', payload)` con string literal. Después del cambio a `WebhookEvent` tipado, TypeScript lo acepta pero si el string no coincide exactamente con el union falla en compilación.
**Why it happens:** Los decoradores @OnEvent aceptan cualquier string; la coherencia entre @OnEvent y dispatchEvent() debe ser explícita.
**How to avoid:** Usar WEBHOOK_EVENTS.ARTICULO_CREATED en ambos @OnEvent y en la llamada a dispatchEvent(). El compilador garantiza consistencia.
**Warning signs:** TypeScript error: "Argument of type 'string' is not assignable to parameter of type 'WebhookEvent'".

### Pitfall 4: api-keys.findAll() ya filtra isNull — solo revoke() necesita cambio

**What goes wrong:** Confundir findAll() (correcto: filtra revocadas para el listado UI) con la lógica interna de revoke().
**Why it happens:** api-keys.service no tiene findOne() equivalente a webhooks.service, solo findByToken() (para auth) y findAll().
**How to avoid:** En api-keys.service, agregar una query inline en revoke() sin crear método público — o un método privado findById() que no filtra revokedAt.

---

## Code Examples

### ConflictException — patrón completo

```typescript
// Source: @nestjs/common — ya instalado en el proyecto
import { ConflictException, NotFoundException } from '@nestjs/common'

// En api-keys.service.ts — revoke() corregido:
async revoke(id: number) {
  const rows = await this.drizzle.db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1)

  const existing = rows[0]
  if (!existing) {
    throw new NotFoundException(`API key ${id} no encontrada`)
  }
  if (existing.revokedAt !== null) {
    throw new ConflictException('API key ya fue revocada')
  }

  await this.drizzle.db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
}
```

### webhook-events.ts completo

```typescript
// apps/backend/src/modules/webhooks/webhook-events.ts
// Sin imports — módulo leaf puro

export const WEBHOOK_EVENTS = {
  ARTICULO_CREATED: 'articulo.created',
  ARTICULO_UPDATED: 'articulo.updated',
  ARTICULO_DELETED: 'articulo.deleted',
} as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]

export const EVENT_TO_DB: Record<WebhookEvent, string> = {
  'articulo.created': 'created',
  'articulo.updated': 'updated',
  'articulo.deleted': 'deleted',
}
```

### webhooks.service — findOneAny privado para revoke

```typescript
// Método privado — no expuesto en controller
private async findOneAny(id: number) {
  const rows = await this.drizzle.db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1)
  return rows[0] ?? null
}

// revoke() corregido
async revoke(id: number) {
  const existing = await this.findOneAny(id)
  if (!existing) {
    throw new NotFoundException(`Webhook ${id} no encontrado`)
  }
  if (existing.revokedAt !== null) {
    throw new ConflictException('Webhook ya fue revocado')
  }
  await this.drizzle.db
    .update(webhooks)
    .set({ revokedAt: new Date() })
    .where(eq(webhooks.id, id))
}
```

---

## State of the Art

| Old Approach                                                              | Current Approach                                  | Impact                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| String splitting `split('.')[1]` para derivar event short-form            | `EVENT_TO_DB` lookup con key tipado               | Errores de typo detectados en compilación en lugar de runtime       |
| revoke() sin check previo — segunda llamada sobreescribe revokedAt        | Check explícito + ConflictException 409           | Idempotencia real; timestamp original preservado                    |
| findOne() con isNull() usado en revoke() — devuelve 404 para ya-revocados | findOneAny() privado sin filtro + check de estado | HTTP semantics correctos: 404 = no existe, 409 = estado conflictivo |

---

## Open Questions

1. **Opción A vs B para findOne en webhooks.service**
   - Que se sabe: callers actuales son update(), toggle(), ping(), findDeliveries(), resendDelivery(), regenerateSecret(), revoke() — todos esperan 404 si revocado, excepto revoke()
   - Que es ambiguo: si hay valor en exponer findOneIncludingRevoked para futuros casos
   - Recomendación: Opción B (findOneAny privado) — menor surface area, callers existentes sin cambio

2. **¿delete en webhooks es semánticamente revoke?**
   - Que se sabe: DELETE /webhooks/:id llama revoke() que setea revokedAt — es soft delete, no hard delete
   - No hay ambigüedad real — el CONTEXT.md lo confirma. El fix de idempotency aplica a revoke().

---

## Validation Architecture

> nyquist_validation key ausente en config.json — tratado como habilitado.

### Test Framework

| Property           | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Framework          | No detectado — no existen archivos .spec.ts en apps/backend  |
| Config file        | ninguno — Wave 0 crearía jest.config si se implementan tests |
| Quick run command  | `cd apps/backend && pnpm test` (si Jest configurado)         |
| Full suite command | `cd apps/backend && pnpm test`                               |

### Phase Requirements → Test Map

Esta fase no tiene requirement IDs asignados (tech debt). Los comportamientos verificables son:

| Behavior                                            | Test Type    | Automated Command            | File Exists? |
| --------------------------------------------------- | ------------ | ---------------------------- | ------------ |
| revoke() API key ya revocada → 409                  | unit         | `pnpm test api-keys.service` | ❌ Wave 0    |
| revoke() webhook ya revocado → 409                  | unit         | `pnpm test webhooks.service` | ❌ Wave 0    |
| dispatchEvent('articulo.created') compila sin error | compile-time | `pnpm tsc --noEmit`          | disponible   |
| dispatchEvent(string-invalido) falla en compilación | compile-time | `pnpm tsc --noEmit`          | disponible   |

### Sampling Rate

- **Por tarea:** `cd apps/backend && pnpm tsc --noEmit` — verificación de compilación TypeScript (costo mínimo, no requiere tests)
- **Por wave merge:** `pnpm tsc --noEmit` + arrancar servidor y verificar manualmente 409 responses
- **Phase gate:** Compilación limpia + verificación manual de comportamientos antes de `/gsd:verify-work`

### Wave 0 Gaps

- El proyecto no tiene suite de tests unitarios configurada — los fixes de idempotency son simples enough para verificar manualmente
- Si se quiere test unitario: necesitaría `jest`, `@nestjs/testing`, configuración de Jest para NestJS
- **Recomendación práctica:** Dado el scope pequeño (3 fixes quirúrgicos), verificar via `tsc --noEmit` + prueba manual con curl/Playwright. No crear infraestructura de tests para esta fase.

---

## Sources

### Primary (HIGH confidence)

- Código fuente directo: `apps/backend/src/modules/api-keys/api-keys.service.ts` — estado actual de revoke()
- Código fuente directo: `apps/backend/src/modules/webhooks/webhooks.service.ts` — findOne con isNull, dispatchEvent con split
- Código fuente directo: `apps/backend/src/modules/webhooks/webhooks.listener.ts` — @OnEvent con string literals
- Código fuente directo: `apps/backend/src/modules/articulos/articulos.service.ts` — emit() con string literals
- CONTEXT.md fase 26 — decisiones locked del usuario

### Secondary (MEDIUM confidence)

- TypeScript handbook — `as const` assertions y tipos derivados con `typeof` (conocimiento del compilador, stable feature desde TS 3.4)
- @nestjs/common API — ConflictException (HTTP 409), ya disponible en el proyecto

### Tertiary (LOW confidence)

- Ninguna — toda la investigación se basa en código fuente real del proyecto

---

## Metadata

**Confidence breakdown:**

- Código existente a modificar: HIGH — leído directamente del filesystem
- Patrones NestJS (ConflictException, guards): HIGH — ya usados en el proyecto
- TypeScript `as const` pattern: HIGH — feature estable del compilador
- Impacto en callers de findOne: HIGH — todos los callers identificados en webhooks.service

**Research date:** 2026-03-12
**Valid until:** Indefinido — fixes quirúrgicos sin dependencias externas cambiantes
