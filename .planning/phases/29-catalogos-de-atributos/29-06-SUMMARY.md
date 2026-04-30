---
phase: 29-catalogos-de-atributos
plan: 06
type: summary
status: human-verify-pending
---

# Plan 29-06 — Summary

## Objetivo cumplido (parcialmente)

Tres niveles de verificación: (1) component test Vitest del contrato Phase 32 (D-19) — **PASS**. (2) E2E del flujo ABM completo + caso duplicado case-insensitive — **PASS via playwright-cli interactivo** (no spec persistente, ver Deviation #1). (3) Checkpoint humano UI-SPEC compliance — **pending** (este SUMMARY pide approval).

## Deviations principales

### Deviation #1 — `playwright-cli` en vez de `@playwright/test` (Rule 1, blocking)

El plan llamaba a instalar `@playwright/test` y crear `apps/web/e2e/propiedades.spec.ts` + `apps/web/playwright.config.ts`. **El usuario interrumpió la instalación** y pidió usar la skill `playwright-testing` que envuelve `playwright-cli` (CLI separado, no project dep). Memory `feedback_playwright_cli` actualizada para reflejar la regla: nunca instalar `@playwright/test` en este proyecto.

**Trade-offs documentados:**
- ✅ Sin overhead de devDeps (~250 MB ahorrados)
- ✅ Sin config CI ni mantenimiento de specs paralelas
- ✅ Verificación inmediata + diagnóstico interactivo (snapshots, console, network)
- ❌ No queda una "spec storage" reproducible para CI futura — si Phase 32+ pide regression suite, se evalúa instalar entonces
- ❌ Re-correr el E2E requiere repetir comandos `playwright-cli` manualmente (mitigado: la session quedó persistida en `playwright-cli list`)

**Files que NO se crearon (vs plan original):**
- `apps/web/playwright.config.ts` — skipped
- `apps/web/e2e/propiedades.spec.ts` — skipped
- Script `test:e2e` en package.json — skipped

### Deviation #2 — Bug encontrado y fixeado en el E2E

Durante el E2E (intento de duplicar `Shimano_<ts>` → `SHIMANO_<ts>`), el backend devolvió **500 Internal Server Error** en lugar del esperado **409 Conflict + mensaje friendly**. Causa raíz: `Drizzle 0.45` envuelve los errores de `postgres.js` en `DrizzleQueryError`, exponiendo el error original (con `.code = '23505'`, `.constraint_name`, `.detail`) en `.cause`. El helper `handleUniqueViolation` del Plan 29-03 chequeaba `.code` en el wrapper directo y fallaba el match.

**Fix aplicado:** `apps/backend/src/modules/propiedades/propiedades.service.ts` — desempaquetar `error.cause` antes de chequear `.code`. Backend rebuildado (`docker compose build erp-backend`) y restart. E2E re-ejecutado: ahora retorna 409 + FormMessage inline `Ya existe una marca con el nombre "SHIMANO_..."` (CAT-03 cubierto).

Commit: `54c0a9a5` — `fix(29-06): unwrap DrizzleQueryError to detect 23505 in handleUniqueViolation`.

## Tasks ejecutados

| Task | Status | Commit | Detalle |
|------|--------|--------|---------|
| 0: Install jsdom + RTL (sin Playwright) | ✅ | `975d5ea9` | jsdom@29 + 3 testing-library packages |
| 1a: Component test contract Phase 32 | ✅ | `b432e2d6` | 2/2 tests pass; `vitest.config.ts` ajustado (alias `@/`, `esbuild.jsx: 'automatic'`) |
| 1b: E2E via playwright-cli | ✅ | (no commit — interactivo) | Login → /propiedades → 6 tabs → crear con auto-suggest → duplicado case-insensitive → editar → desactivar → toggle inactivos → reactivar → cambio de tab → screenshot |
| 1c: Fix Drizzle wrapper bug | ✅ | `54c0a9a5` | Ver Deviation #2 |
| 2: Checkpoint humano | 🔄 pending | — | Part A grep gates run abajo; Part B pide approval del usuario |

## Verificación E2E (playwright-cli)

URL: `http://erp.sanchezrepuestos.com.ar` (Traefik route, proxy a `erp-web` container).

**Sesión:** `objetiva-comercios-admin` (persistente).

**Flujo verificado paso a paso:**

| Paso | Resultado |
|------|-----------|
| Login con admin (`sanchezrepuestosok@gmail.com`) | ✅ redirect a `/dashboard` |
| Sidebar contiene "Propiedades" | ✅ entre Artículos y Compras |
| Navegación a `/propiedades` | ✅ heading "Propiedades", subtitle "Gestión de propiedades de artículos" |
| 6 tabs visibles (Marcas/Colores/Talles/Materiales/Presentaciones/Objetos) | ✅ Marcas activo por default |
| Empty state | ✅ "Sin marcas. Usá el botón Nueva marca para agregar la primera." |
| Crear con auto-suggest abrev | ✅ "E2EMarca1777587073" → abrev "E2EM" (auto), submit OK |
| Toast "Marca creada correctamente" | ✅ visible |
| Fila aparece en tabla | ✅ ID 5 |
| Crear "Shimano_<ts>" | ✅ ID 6 |
| Crear duplicado "SHIMANO_<ts>" | ✅ rechazado con 409 + FormMessage inline `Ya existe una marca con el nombre "SHIMANO_1777587073"` (CAT-03 cubierto) |
| Editar nombre → "_edit" | ✅ toast "Marca actualizada correctamente", fila renombrada |
| Desactivar → AlertDialog | ✅ title `Desactivar 'E2EMarca…_edit'`, description `Vas a desactivar … ¿Confirmás?`, botón rojo Desactivar |
| Confirmar desactivar | ✅ toast "Marca desactivada", fila desaparece |
| Toggle "Mostrar inactivos" | ✅ fila reaparece con badge "Inactivo" |
| Reactivar (sin AlertDialog) | ✅ flip directo, toast "Marca reactivada", badge → "Activo" |
| Switch a tab Colores | ✅ lazy fetch único a `/api/propiedades/color` (network log confirma sin pre-fetches) |
| Volver a Marcas — datos persisten | ✅ ambas filas siguen activas |
| Screenshot final | ✅ `apps/web/e2e/screenshots/phase29-final.png` |

## Component test (Vitest + jsdom)

```
✓ src/components/propiedades/propiedad-create-dialog.test.tsx (2 tests) 808ms
   ✓ ... > expone la signature de props requerida por Phase 32
   ✓ ... > invoca onCreated con { id, nombre, abrev } al submit exitoso

✓ src/lib/abrev.test.ts (10 tests) 6ms

Test Files  2 passed (2)
     Tests  12 passed (12)
```

## Part A — Grep gates de copywriting

| # | Gate | Resultado | Notas |
|---|------|-----------|-------|
| 1 | `creada correctamente` en `propiedad-create-dialog.tsx` | ✅ PASS | toast post-submit |
| 2 | `actualizada correctamente` en `propiedad-edit-dialog.tsx` | ✅ PASS | toast post-update |
| 3 | `desactivada` en `propiedad-deactivate-dialog.tsx` | ⚠️ FAIL | El toast vive en `propiedad-table.tsx:92` (donde se dispara después de `onConfirm`). Funcionalmente correcto (verificado E2E). El plan tenía el path equivocado del grep — bug del plan, no del código. |
| 4 | `Vas a desactivar` en `propiedad-deactivate-dialog.tsx` | ✅ PASS | description del AlertDialog |

## D-19 verification

```bash
! grep -q "PropiedadCreateDialog" apps/web/src/components/articulos/articulo-form.tsx
```
**Resultado:** ✅ PASS — `articulo-form.tsx` NO importa `PropiedadCreateDialog`. El contract Phase 32 está respetado: `PropiedadCreateDialog` standalone, sin acoplamiento con flow de artículos.

## Builds & type-checks

| Check | Result |
|-------|--------|
| `pnpm --filter @objetiva/web exec tsc --noEmit` | ✅ PASS |
| `pnpm --filter @objetiva/backend exec tsc --noEmit` | ✅ PASS |
| `pnpm --filter @objetiva/web exec vitest run` | ✅ PASS (12/12) |
| `docker compose build erp-backend` | ✅ PASS |
| `docker compose build erp-web` | ✅ PASS |

## Issues identificados (Part B — pendientes de approval humano)

### Bloqueantes funcionales

Ninguno. El flujo CAT-01..04 funciona end-to-end después del fix de Deviation #2.

### Bugs de UX/copywriting (no bloquean Phase 29 cierre, pero requieren decisión)

1. **Bug de género en español (4 tipos):** `color`, `talle`, `material`, `objeto` son sustantivos **masculinos**, pero los componentes muestran "**Nueva** color", "**Nueva** talle", "**Nueva** material", "**Nueva** objeto" en:
   - Botón "Nueva [tipo]" (toolbar)
   - Empty state "Sin [tipos plural]. Usá el botón **Nueva** [tipo singular] para agregar la primera"
   - Toast post-create "[Tipo] **creada** correctamente" (debería ser "creado")
   - Toast deactivate "[Tipo] **desactivada**" (debería ser "desactivado")

   **Causa raíz:** `propiedad-table.tsx` y `propiedad-create-dialog.tsx` usan plantillas hardcoded en femenino. La estructura `PROP_LABELS` no incluye género gramatical.

   **Fix propuesto (no aplicado, espera decisión del usuario):** agregar campo `gender: 'f' | 'm'` a `PROP_LABELS` y usar en plantillas (`Nuevo|Nueva`, `creado|creada`, `desactivado|desactivada`, `reactivado|reactivada`, etc.). Pequeño refactor, ~15 líneas.

   **Affected:** afecta 4/6 tipos. Para `marca` y `presentación` (femeninos) la copy actual es correcta.

2. **A11y warning:** `DialogContent` de PropiedadCreateDialog no tiene `Description` — Radix advierte en consola durante el component test. No bloquea. Se resuelve agregando `<DialogDescription>` (visualmente oculto si no se quiere mostrar).

3. **Cleanup E2E rows en DB:** las filas creadas (`E2EMarca…_edit`, `Shimano_…`) quedaron en la DB local. Phase 29 no expone DELETE endpoint, así que requiere SQL manual o esperar la skill de cleanup. Documentado como Pending Action.

### Otras observaciones

- El plan llamaba a un Switch para activar/desactivar **dentro** del Edit dialog. La implementación final tiene el toggle solamente vía DropdownMenu (Desactivar/Reactivar). Discutir si es deviation aceptable o si requiere fix.

## Pending Actions

1. **Decisión del usuario sobre el bug de género** (issue #1 arriba). Si se aprueba el fix, se hace en una pasada antes de cerrar Phase 29 o se difiere a un quick task.
2. **Cleanup de filas E2E** (`E2EMarca…_edit` ID 5, `Shimano_…` ID 6 en `prop_marca`) — manual via SQL.
3. **Decidir si el A11y warning del DialogContent es bloqueante** (probablemente no, es trivial).
4. **Confirmar que el toggle activo solo via DropdownMenu (sin Switch en Edit dialog) es deseado** — vs reabrir Plan 29-05.

## Resume signal

User responde:
- `"approved"` → cerrar Phase 29, ir a verification
- `"fix género"` → aplico el fix antes de cerrar
- `"fix a11y"` → agrego `DialogDescription`
- Lista de issues a addresar antes de cerrar
- `"cleanup E2E rows"` → corro SQL para borrar las 2 filas test

## Next

Verificar approval humano y proceder a `code_review_gate` → `regression_gate` → `verify_phase_goal` → `update_roadmap`.
