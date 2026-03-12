# Phase 25: Wire Frontend Soft-Delete + Verify Articulos CRUD - Research

**Researched:** 2026-03-12
**Domain:** Frontend API client wiring, React conditional logic, optimistic updates, VERIFICATION.md authoring
**Confidence:** HIGH

## Summary

Esta fase tiene complejidad baja-media con cambios quirurgicos en 3 archivos del frontend mas la creacion de un VERIFICATION.md. El backend ya esta completo: DELETE /api/articulos/:codigo existe, emite articulo.deleted, y el WebhooksListener lo captura y lo despacha. El frontend actualmente llama `toggleArticuloActivo()` (PATCH toggle) para ambas operaciones (desactivar y reactivar). El cambio es introducir `deleteArticulo()` en api.client.ts y usarla condicionalmente para desactivar (activo=true), manteniendo toggle solo para reactivar (activo=false).

Los dos puntos de disparo en la UI (menú contextual en tabla y botón en página de edición) ya tienen AlertDialog implementado y funcionando. Los cambios son mínimos: reemplazar la llamada a la API en `handleConfirmToggle` con lógica condicional. La navegación post-desactivar desde edición agrega un redirect a /articulos. La verificación ART-\* es revisión de código, no tests automatizados — VERIFICATION.md se crea en `.planning/phases/19-articulos-crud-completo/`.

**Primary recommendation:** Implementar en 2 planes: Plan 01 — wiring de soft-delete en api.client.ts + articulos-client.tsx + editar/page.tsx. Plan 02 — crear VERIFICATION.md de Phase 19 cubriendo ART-01 a ART-04 con evidencia de código.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- DELETE reemplaza toggle para **desactivar**: frontend llama deleteArticulo() → DELETE /api/articulos/:codigo → emite articulo.deleted (dispara webhooks)
- PATCH toggle se mantiene solo para **reactivar**: toggleArticuloActivo() → PATCH /api/articulos/:codigo/toggle → emite articulo.updated
- El backend no cambia — ambos endpoints siguen existiendo, el cambio es solo en qué llama el frontend
- Lógica condicional en UI: si artículo activo → deleteArticulo (DELETE), si inactivo → toggleArticuloActivo (PATCH toggle)
- **Ambos puntos** (menú contextual ⋮ en tabla + página de edición) llaman DELETE para desactivar
- Texto del AlertDialog **mantiene 'Desactivar'** — el cambio es técnico, no conceptual para el usuario
- Optimistic update igual que hoy: fila desaparece + toast "Artículo desactivado" (sin mención de webhooks)
- **Navegación post-desactivar desde edición:** redirige a /articulos con toast
- **Navegación post-reactivar desde edición:** se queda en la página, actualiza estado + toast "Artículo reactivado"
- Botón contextual: activo → "Desactivar", inactivo → "Reactivar" (ya es así, no cambia UX)
- Edge cases (race conditions, doble-click): el backend maneja idempotentemente, no validar en frontend
- Nueva función: deleteArticulo(codigo) → DELETE /api/articulos/:codigo
- toggleArticuloActivo() se mantiene, solo se usa para reactivar
- No renombrar toggleArticuloActivo — cambio mínimo
- Verificación ART-\*: revisión de código (no tests automatizados, no checklist manual)
- Se ejecuta DESPUÉS del wiring de soft-delete
- Cubre ART-01 (crear), ART-02 (editar), ART-03 (soft-delete con DELETE), ART-04 (búsqueda)
- Flujo webhook end-to-end verificado trazando código: deleteArticulo → DELETE endpoint → softDelete() → emit articulo.deleted → WebhooksListener → dispatchEvent
- VERIFICATION.md se crea en `.planning/phases/19-articulos-crud-completo/`

### Claude's Discretion

- Estructura exacta del VERIFICATION.md (formato, nivel de detalle de evidencia)
- Orden de implementación dentro del plan (wiring primero, verificación después)
- Si se necesita refactor menor en articulos-client.tsx para acomodar la lógica condicional

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                        | Research Support                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART-01 | User can create a new articulo filling all ~30 fields grouped efficiently (frequent fields on top) | Backend POST /api/articulos existe con CreateArticuloDto. ArticuloForm en frontend completo. Evidencia de código disponible en Phase 19.            |
| ART-02 | User can edit an existing articulo with the same form, pre-populated with current data             | Backend PATCH /api/articulos/:codigo existe. ArticuloForm con mode="edit" en editar/page.tsx. Evidencia en Phase 19.                                |
| ART-03 | User can soft-delete an articulo (toggle activo/inactivo) with confirmation dialog                 | Backend DELETE existe (softDelete() en service, líneas 142-158). Frontend necesita deleteArticulo() + lógica condicional. El AlertDialog ya existe. |
| ART-04 | User can search/filter articulos in the list with debounce (real-time as they type)                | Debounce 300ms implementado en articulos-client.tsx (líneas 104-119). Backend acepta query param `search`. Evidencia de código disponible.          |

</phase_requirements>

## Standard Stack

### Core — Ya instalado en el proyecto

| Library    | Version | Purpose                                        | Status       |
| ---------- | ------- | ---------------------------------------------- | ------------ |
| Next.js 14 | 14.x    | App Router, page.tsx y client components       | Ya instalado |
| React      | 18.x    | 'use client' components, useState, useCallback | Ya instalado |
| shadcn/ui  | latest  | AlertDialog, Button, Badge, useToast           | Ya instalado |
| TypeScript | 5.x     | Tipado estático en api.client.ts               | Ya instalado |

### No hay dependencias nuevas en esta fase

Esta fase es puro wiring de código existente. No se instala nada nuevo.

## Architecture Patterns

### Patron establecido: API client function DELETE

El proyecto tiene dos ejemplos exactos del patrón DELETE en api.client.ts:

**deleteArticuloImagen** (líneas 196-211) — patron exacto para deleteArticulo():

```typescript
// apps/web/src/lib/api.client.ts
export async function deleteArticuloImagen(
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}/imagenes/${tipo}/${slot}`,
    {
      method: 'DELETE',
      headers,
    }
  )
  await throwIfError(response)
  return response.json()
}
```

**Nueva función deleteArticulo()** — modelada exactamente igual:

```typescript
export async function deleteArticulo(codigo: string): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}`, {
    method: 'DELETE',
    headers,
  })
  await throwIfError(response)
  return response.json()
}
```

Notar: el backend DELETE /api/articulos/:codigo retorna el articulo (HttpCode OK con body), no 204 — por eso `return response.json()` es correcto.

### Patron establecido: Logica condicional en handleConfirmToggle

**Actual** (articulos-client.tsx, línea 239):

```typescript
await toggleArticuloActivo(target.codigo)
toast({ title: target.activo ? 'Articulo desactivado' : 'Articulo activado', ... })
```

**Nuevo** — reemplazar solo la llamada API, mantener toda la logica de optimistic update:

```typescript
// Import: agregar deleteArticulo al import existente
import {
  fetchArticulosClient,
  toggleArticuloActivo,
  deleteArticulo,
  updateSettings,
} from '@/lib/api.client'

// En handleConfirmToggle — solo cambia la llamada API:
if (target.activo) {
  await deleteArticulo(target.codigo) // DELETE — emite articulo.deleted
} else {
  await toggleArticuloActivo(target.codigo) // PATCH toggle — emite articulo.updated
}
toast({
  title: target.activo ? 'Articulo desactivado' : 'Articulo activado',
  description: `"${target.nombre}" fue ${target.activo ? 'desactivado' : 'activado'} correctamente.`,
})
```

Todo lo demas en handleConfirmToggle (optimistic update, rollback, fetchData) se mantiene igual.

### Patron establecido: handleConfirmToggle en editar/page.tsx

**Actual** (editar/page.tsx, líneas 56-73):

```typescript
async function handleConfirmToggle() {
  if (!articulo) return
  setShowToggleDialog(false)
  try {
    const updated = await toggleArticuloActivo(articulo.codigo)
    setArticulo(updated)
    toast({ title: updated.activo ? 'Articulo activado' : 'Articulo desactivado', ... })
  } catch (err) { ... }
}
```

**Nuevo** — lógica condicional + redirect solo para desactivar:

```typescript
async function handleConfirmToggle() {
  if (!articulo) return
  setShowToggleDialog(false)
  try {
    if (articulo.activo) {
      // Desactivar: DELETE → emite articulo.deleted → redirect
      await deleteArticulo(articulo.codigo)
      toast({ title: 'Articulo desactivado', description: `"${articulo.nombre}" fue desactivado.` })
      router.push('/articulos')
    } else {
      // Reactivar: PATCH toggle → emite articulo.updated → queda en página
      const updated = await toggleArticuloActivo(articulo.codigo)
      setArticulo(updated)
      toast({ title: 'Articulo reactivado', description: `"${articulo.nombre}" fue reactivado.` })
    }
  } catch (err) {
    toast({
      title: 'Error al cambiar el estado',
      description: err instanceof Error ? err.message : 'Error desconocido',
      variant: 'destructive',
    })
  }
}
```

Import a agregar en editar/page.tsx:

```typescript
import { fetchArticuloByCodigoClient, toggleArticuloActivo, deleteArticulo } from '@/lib/api.client'
```

### Patron establecido: VERIFICATION.md

El proyecto tiene SUMMARY.md por plan pero no tiene VERIFICATION.md de fase previo (Phase 19 los tiene solo PLAN y SUMMARY). La estructura para VERIFICATION.md en `.planning/phases/19-articulos-crud-completo/VERIFICATION.md` debe documentar código existente como evidencia de cada requisito ART-\*.

**Estructura recomendada para VERIFICATION.md:**

```markdown
# Phase 19: Articulos CRUD - Verification

**Verified:** [fecha]
**Status:** PASSED

## ART-01: Crear articulo

**Requirement:** User can create a new articulo filling all ~30 fields grouped efficiently

### Evidence

- Backend: POST /api/articulos en controller línea X, servicio create() línea Y
- Frontend: ArticuloForm con mode="create", fields agrupados en secciones
- Route: /articulos/nuevo → page.tsx → ArticuloForm
- Verified via: code review

## ART-02: Editar articulo

...

## ART-03: Soft-delete con DELETE

... (incluye el flujo webhook end-to-end: deleteArticulo → DELETE → softDelete() → emit articulo.deleted → WebhooksListener → dispatchEvent)

## ART-04: Busqueda con debounce

...
```

## Don't Hand-Roll

| Problem                            | Don't Build                      | Use Instead                                          | Why                                                  |
| ---------------------------------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Confirmacion de accion destructiva | Modal custom                     | AlertDialog (ya existe en ambos puntos)              | Ya implementado con texto contextual correcto        |
| Feedback al usuario                | Custom toast                     | useToast() hook (patrón establecido)                 | Consistente con Phase 24 y todo el proyecto          |
| Encode de codigo en URL            | encodeURIComponent manual ad-hoc | encodeURIComponent() ya usado en todas las funciones | Patron establecido, incluido en deleteArticuloImagen |

**Key insight:** Esta fase no requiere nuevos componentes ni dependencias. Todo el andamiaje existe — solo se conectan los cables.

## Common Pitfalls

### Pitfall 1: Olvidar encodeURIComponent en deleteArticulo

**What goes wrong:** El código de artículo puede contener caracteres especiales (espacios, /, etc.). Sin encode el fetch falla con 404.
**Why it happens:** Se modela la función apresuradamente sin mirar los ejemplos existentes.
**How to avoid:** Usar exactamente el mismo patrón de `deleteArticuloImagen()` con `encodeURIComponent(codigo)`.
**Warning signs:** 404 en artículos con códigos que contengan `/`, `+`, espacios.

### Pitfall 2: Doble redirect en editar/page.tsx

**What goes wrong:** Si el toast se lanza DESPUES del router.push, en Next.js App Router puede que el componente ya no esté montado y el toast no aparezca.
**Why it happens:** router.push hace navegacion inmediata.
**How to avoid:** Lanzar toast ANTES de router.push(). El toast persiste en el provider mientras navega.

### Pitfall 3: Import faltante de deleteArticulo en los archivos consumidores

**What goes wrong:** TypeScript error o runtime error si se olvida agregar `deleteArticulo` al import de api.client en articulos-client.tsx y editar/page.tsx.
**How to avoid:** Actualizar el import al mismo tiempo que se usa la función.

### Pitfall 4: VERIFICATION.md confunde softDelete con toggleActive

**What goes wrong:** ART-03 dice "toggle activo/inactivo" pero la implementacion final usa DELETE para desactivar y PATCH toggle para reactivar. El VERIFICATION.md debe reflejar la implementacion FINAL de Phase 25, no el toggle original de Phase 19.
**How to avoid:** Crear VERIFICATION.md DESPUES de completar el wiring (order correcto por decisión).

## Code Examples

### Backend DELETE endpoint — ya funciona, referencia para VERIFICATION.md

```typescript
// apps/backend/src/modules/articulos/articulos.controller.ts líneas 61-67
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':codigo')
@HttpCode(HttpStatus.OK)
softDelete(@Param('codigo') codigo: string) {
  return this.articulosService.softDelete(codigo)
}
```

```typescript
// apps/backend/src/modules/articulos/articulos.service.ts líneas 142-158
async softDelete(codigo: string) {
  const existing = await this.findOne(codigo)
  if (!existing) throw new NotFoundException(...)
  const rows = await this.drizzle.db.update(articulos)
    .set({ activo: false, updatedAt: new Date() })
    .where(eq(articulos.codigo, codigo))
    .returning()
  const articulo = rows[0]
  this.eventEmitter.emit('articulo.deleted', { articulo })
  return articulo
}
```

### WebhooksListener — articulo.deleted handler existe

```typescript
// apps/backend/src/modules/webhooks/webhooks.listener.ts líneas 19-22
@OnEvent('articulo.deleted')
async handleArticuloDeleted(payload: { articulo: unknown }) {
  await this.webhooksService.dispatchEvent('articulo.deleted', payload)
}
```

### Articulos-client.tsx — estado actual del import y handleConfirmToggle

Línea 27 actual:

```typescript
import { fetchArticulosClient, toggleArticuloActivo, updateSettings } from '@/lib/api.client'
```

Línea 27 nueva:

```typescript
import {
  fetchArticulosClient,
  toggleArticuloActivo,
  deleteArticulo,
  updateSettings,
} from '@/lib/api.client'
```

handleConfirmToggle actual (líneas 224-254): usa `await toggleArticuloActivo(target.codigo)` para ambas operaciones. El optimistic update (líneas 229-236) y el rollback (línea 247) se mantienen inalterados.

### Editar/page.tsx — import actual

Línea 9 actual:

```typescript
import { fetchArticuloByCodigoClient, toggleArticuloActivo } from '@/lib/api.client'
```

Línea 9 nueva:

```typescript
import { fetchArticuloByCodigoClient, toggleArticuloActivo, deleteArticulo } from '@/lib/api.client'
```

## State of the Art

| Aspecto                   | Estado actual (Phase 19)                | Estado final (Phase 25)                            |
| ------------------------- | --------------------------------------- | -------------------------------------------------- |
| Desactivar articulo       | PATCH toggle → emite articulo.updated   | DELETE → emite articulo.deleted                    |
| Reactivar articulo        | PATCH toggle → emite articulo.updated   | PATCH toggle → emite articulo.updated (sin cambio) |
| Webhook en desactivación  | No dispara articulo.deleted             | Si dispara articulo.deleted end-to-end             |
| Post-desactivar en editar | Queda en la página con badge "Inactivo" | Redirige a /articulos con toast                    |
| Verificación ART-\*       | No existe VERIFICATION.md               | VERIFICATION.md creado en phases/19/               |

## Open Questions

No hay preguntas abiertas. Todo está verificado en el código existente:

- Backend DELETE retorna 200 con body (confirmado: `@HttpCode(HttpStatus.OK)` + `return articulo`)
- WebhooksListener tiene handler para articulo.deleted (confirmado: líneas 19-22)
- ArticulosColumns ya tiene lógica condicional de texto "Desactivar"/"Reactivar" (línea 46)
- AlertDialog existe en ambos puntos de disparo

## Validation Architecture

> `workflow.nyquist_validation` no está presente en config.json — se trata como habilitado.

### Test Framework

| Property           | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| Framework          | No detectado — esta fase es cambios frontend + documento de verificación |
| Config file        | none                                                                     |
| Quick run command  | `pnpm --filter web build` (type-check implícito)                         |
| Full suite command | `pnpm --filter web build`                                                |

### Phase Requirements → Test Map

| Req ID | Behavior                                | Test Type   | Automated Command | File Exists? |
| ------ | --------------------------------------- | ----------- | ----------------- | ------------ |
| ART-01 | Crear articulo con ~30 campos           | manual-only | n/a               | n/a          |
| ART-02 | Editar articulo con form pre-poblado    | manual-only | n/a               | n/a          |
| ART-03 | Soft-delete via DELETE con confirmación | manual-only | n/a               | n/a          |
| ART-04 | Búsqueda con debounce 300ms             | manual-only | n/a               | n/a          |

**Justificación manual-only:** El proyecto no tiene suite de tests (ni jest, ni vitest, ni playwright configurado para CI). La verificación de ART-\* es code review explícito según la decisión del usuario — VERIFICATION.md es el artefacto de evidencia. El type-check vía `pnpm build` es la única validación automatizada aplicable.

### Sampling Rate

- **Per task commit:** `pnpm --filter web build` (verifica TypeScript sin errores)
- **Per wave merge:** `pnpm --filter web build`
- **Phase gate:** Build verde + VERIFICATION.md creado antes de `/gsd:verify-work`

### Wave 0 Gaps

None — no hay infraestructura de testing que crear. El artefacto de verificación es el VERIFICATION.md de Phase 19.

## Sources

### Primary (HIGH confidence)

- Código fuente leído directamente: `apps/web/src/lib/api.client.ts` — funciones deleteArticuloImagen y toggleArticuloActivo como referencia de patron
- Código fuente leído directamente: `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` — handleConfirmToggle actual, imports, optimistic update
- Código fuente leído directamente: `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — handleConfirmToggle actual, AlertDialog existente
- Código fuente leído directamente: `apps/backend/src/modules/articulos/articulos.controller.ts` — DELETE endpoint con @HttpCode(HttpStatus.OK)
- Código fuente leído directamente: `apps/backend/src/modules/articulos/articulos.service.ts` — softDelete() con eventEmitter.emit
- Código fuente leído directamente: `apps/backend/src/modules/webhooks/webhooks.listener.ts` — @OnEvent('articulo.deleted') handler
- Código fuente leído directamente: `apps/web/src/components/articulos/articulos-columns.tsx` — RowActions con onToggle handler

### Secondary (MEDIUM confidence)

- `.planning/phases/25-wire-frontend-soft-delete-verify/25-CONTEXT.md` — decisiones de implementación con detalles de flujo
- `.planning/STATE.md` — decisión documentada "softDelete always sets activo=false and emits articulo.deleted"

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — todo el stack ya está en uso, no hay dependencias nuevas
- Architecture: HIGH — patrones leídos directamente del código fuente, no inferidos
- Pitfalls: HIGH — identificados del código actual y decisiones de contexto
- Verificación: HIGH — estructura decidida en CONTEXT.md, solo queda elegir formato

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (código es estable, no hay librerías externas que cambien)
