# Phase 25: Wire Frontend Soft-Delete + Verify Articulos CRUD - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Conectar el frontend al endpoint DELETE /api/articulos/:codigo para soft-delete de artículos y crear verificación independiente de Phase 19 (ART-01 a ART-04). El backend ya tiene el endpoint DELETE y emite articulo.deleted. El frontend necesita la función deleteArticulo() y rewiring de la UI.

</domain>

<decisions>
## Implementation Decisions

### Relación toggle vs DELETE

- DELETE reemplaza toggle para **desactivar**: frontend llama deleteArticulo() → DELETE /api/articulos/:codigo → emite articulo.deleted (dispara webhooks)
- PATCH toggle se mantiene solo para **reactivar**: toggleArticuloActivo() → PATCH /api/articulos/:codigo/toggle → emite articulo.updated
- El backend no cambia — ambos endpoints siguen existiendo, el cambio es solo en qué llama el frontend
- Lógica condicional en UI: si artículo activo → deleteArticulo (DELETE), si inactivo → toggleArticuloActivo (PATCH toggle)

### Punto de disparo en la UI

- **Ambos puntos** (menú contextual ⋮ en tabla + página de edición) llaman DELETE para desactivar
- Texto del AlertDialog **mantiene 'Desactivar'** — el cambio es técnico, no conceptual para el usuario
- Optimistic update igual que hoy: fila desaparece + toast "Artículo desactivado" (sin mención de webhooks)
- **Navegación post-desactivar desde edición:** redirige a /articulos con toast
- **Navegación post-reactivar desde edición:** se queda en la página, actualiza estado + toast "Artículo reactivado"
- Botón contextual: activo → "Desactivar", inactivo → "Reactivar" (ya es así, no cambia UX)
- Edge cases (race conditions, doble-click): el backend maneja idempotentemente, no validar en frontend

### API Client (api.client.ts)

- Nueva función: deleteArticulo(codigo) → DELETE /api/articulos/:codigo
- toggleArticuloActivo() se mantiene, solo se usa para reactivar
- No renombrar toggleArticuloActivo — cambio mínimo

### Verificación ART-\*

- Tipo: revisión de código (no tests automatizados, no checklist manual)
- Se ejecuta DESPUÉS del wiring de soft-delete, para que VERIFICATION.md refleje el estado final completo
- Cubre ART-01 (crear), ART-02 (editar), ART-03 (soft-delete con DELETE), ART-04 (búsqueda)
- Flujo webhook end-to-end verificado trazando código: deleteArticulo → DELETE endpoint → softDelete() → emit articulo.deleted → WebhooksListener → dispatchEvent
- VERIFICATION.md se crea en `.planning/phases/19-articulos-crud-completo/` (es verificación DE Phase 19)

### Claude's Discretion

- Estructura exacta del VERIFICATION.md (formato, nivel de detalle de evidencia)
- Orden de implementación dentro del plan (wiring primero, verificación después)
- Si se necesita refactor menor en articulos-client.tsx para acomodar la lógica condicional

</decisions>

<specifics>
## Specific Ideas

- El flujo desde la perspectiva del usuario no cambia — sigue viendo "Desactivar/Reactivar" con AlertDialog. El cambio es que desactivar ahora dispara webhooks via DELETE
- Mantener consistencia con el patrón de soft-delete de webhooks (Phase 24) y API Keys (Phase 23)

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `deleteArticuloImagen()` en api.client.ts: patrón exacto para función DELETE con encodeURIComponent
- `toggleArticuloActivo()` en api.client.ts: función existente que se mantiene para reactivar
- AlertDialog ya implementado en articulos-client.tsx (línea ~239) y editar/page.tsx (línea ~60)
- Backend DELETE endpoint completo: controller (línea 63-67) + service softDelete (línea 142-158)

### Established Patterns

- API client: async function + getAuthHeaders() + fetch + throwIfError + return json
- Optimistic updates: setState inmediato + rollback on error en articulos-client.tsx
- Toast feedback: useToast() hook para confirmaciones
- Soft-delete: activo=false + evento emitido (articulo.deleted para DELETE, articulo.updated para toggle)

### Integration Points

- `apps/web/src/lib/api.client.ts`: agregar deleteArticulo(), mantener toggleArticuloActivo()
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx`: cambiar handleToggle para activos → deleteArticulo
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`: cambiar toggle para activos → deleteArticulo + redirect
- `.planning/phases/19-articulos-crud-completo/VERIFICATION.md`: crear después del wiring

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 25-wire-frontend-soft-delete-verify_
_Context gathered: 2026-03-12_
