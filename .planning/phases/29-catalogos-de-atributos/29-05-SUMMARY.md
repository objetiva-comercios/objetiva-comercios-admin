---
phase: 29-catalogos-de-atributos
plan: 05
subsystem: ui
tags: [web, react, nextjs-14, shadcn, radix-tabs, react-hook-form, zod, tabler, propiedades]

# Dependency graph
requires:
  - phase: 29-catalogos-de-atributos
    provides: "Plan 03 — endpoints REST /api/propiedades/:tipo (GET/POST/PATCH/PATCH-toggle); Plan 04 — Propiedad/PropTipo types, suggestAbrev helper, fetchPropiedades/createPropiedad/updatePropiedad/togglePropiedadActivo fetchers, sidebar entry 'Propiedades'"
provides:
  - "PropiedadCreateDialog standalone reusable component (D-19, ready for Phase 32)"
  - "PropiedadEditDialog with manual abrev edit (no auto-suggest in Edit per UI-SPEC + D-17)"
  - "PropiedadDeactivateDialog using AlertDialog with copy es-MX argentino"
  - "PropiedadTable generic component parametrizable by propTipo (D-16)"
  - "PropiedadesPage Client Component with Radix Tabs lazy-mount per tab"
  - "Route /propiedades Server Component shell at apps/web/src/app/(dashboard)/propiedades/page.tsx"
affects: [phase-32-variantes-ui]

# Tech tracking
tech-stack:
  added: []  # No new deps — usa los already-installed react-hook-form 7.71, @hookform/resolvers 5.2, zod 4.3
  patterns:
    - "Reusable Dialog standalone (Pattern 5 RESEARCH): controlled+uncontrolled open via prop merge, onCreated callback hook for parent integration"
    - "Lazy Tabs (Pattern 4 RESEARCH): Radix Tabs default lazy mount — solo TabsContent del value activo monta su PropiedadTable + dispara fetch"
    - "DropdownMenu row actions (articulos pattern): MoreHorizontal h-3.5 w-3.5 + ghost button h-6 w-6 + align=end"
    - "Auto-suggest with manual-lock flag: useEffect watches form.watch('nombre'), llama suggestAbrev y hace setValue solo si abrevManuallyEdited=false; primer onChange manual lockea el campo"
    - "409 error mapping a FormError: parsea error.message lower-cased → form.setError('nombre' | 'abrev')"

key-files:
  created:
    - "apps/web/src/components/propiedades/propiedad-create-dialog.tsx — Dialog standalone reusable (Phase 32 anchor)"
    - "apps/web/src/components/propiedades/propiedad-edit-dialog.tsx — Edit dialog sin auto-suggest"
    - "apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx — AlertDialog soft-delete confirmation"
    - "apps/web/src/components/propiedades/propiedad-table.tsx — Tabla genérica parametrizada por propTipo"
    - "apps/web/src/components/propiedades/propiedades-page.tsx — Client Component con Tabs lazy"
    - "apps/web/src/app/(dashboard)/propiedades/page.tsx — Server Component shell con header"
  modified: []

key-decisions:
  - "PropiedadCreateDialog signature pública: { propTipo, onCreated?, trigger?, open?, onOpenChange? } — D-19 Phase 32 anchor estable"
  - "Edit dialog SIN auto-suggest (D-17 cumple solo en Create) — el abrev ya existe; usuario edita manualmente si quiere"
  - "Reactivar es flip directo (sin AlertDialog) desde DropdownMenuItem; Desactivar abre PropiedadDeactivateDialog (AlertDialog)"
  - "5 columnas tabla: ID (font-mono), Nombre (font-medium), Abrev (font-mono), Estado (Badge px-1.5 py-0 text-[11px]), Acciones (DropdownMenu MoreHorizontal h-3.5)"
  - "Toolbar: Switch 'Mostrar inactivos' a la izquierda + Button 'Nueva [singular]' size=sm a la derecha"
  - "Error 409 → form.setError por parseo de message (lower-cased) buscando 'nombre' / 'abrev|abreviación'; cualquier otro mensaje cae a toast destructive"

patterns-established:
  - "Auto-suggest with manual-lock flag: useEffect + useState abrevManuallyEdited gate"
  - "Reusable Dialog with controlled/uncontrolled open: open ?? internalOpen, onOpenChange ?? setInternalOpen"
  - "Generic table parametrized by tipo discriminator: misma columna shape, mismas acciones, distintos labels desde PROP_LABELS map"
  - "Lazy Tabs sin código adicional: depender del default mount behavior de Radix TabsContent (no forceMount)"

requirements-completed: [CAT-01, CAT-02, CAT-04]

# Metrics
duration: 7min
completed: 2026-04-30
---

# Phase 29 Plan 05: ABM UI de Propiedades Summary

**ABM web completo de las 6 propiedades de artículos en `/propiedades` con Radix Tabs lazy-mount, RHF+zod dialogs y un PropiedadCreateDialog standalone listo para reuso en Phase 32 (D-19).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-30T17:56:29Z
- **Completed:** 2026-04-30T18:03:27Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 0

## Accomplishments

- 3 Dialogs (Create, Edit, Deactivate) con patrón canónico DepositoDialog (RHF + zod + Loader2 + useToast).
- PropiedadCreateDialog **standalone reusable** con la signature exacta del UI-SPEC: `{ propTipo, onCreated?, trigger?, open?, onOpenChange? }` — Phase 32 podrá importarlo sin cambios (D-19 cumplido).
- Auto-suggest de `abrev` cableado en Create con flag `abrevManuallyEdited` que se lockea al primer onChange manual del input.
- Input `abrev` fuerza UPPERCASE on change vía `field.onChange(e.target.value.toUpperCase())` en ambos Create y Edit.
- Error 409 mapeado a `FormError` por parseo del mensaje (busca "nombre" / "abrev|abreviación") en Create y Edit; el resto cae a toast destructive.
- PropiedadTable genérica parametrizable por `propTipo: PropTipo` — 5 columnas (ID, Nombre, Abrev, Estado, Acciones), DropdownMenu MoreHorizontal h-3.5 w-3.5 (articulos pattern), Switch "Mostrar inactivos", Skeleton 5-rows loading state, empty state copy es-MX argentino ("Sin {plural}. Usá el botón Nueva {singular} para agregar la primera.").
- PropiedadesPage con Radix Tabs lazy: 6 tabs (Marcas, Colores, Talles, Materiales, Presentaciones, Objetos); solo el `<TabsContent>` activo monta su `<PropiedadTable>` y dispara fetch (default Radix mount behavior, sin `forceMount`).
- Ruta `/propiedades` (Server Component shell) con header "Propiedades" + subtítulo "Gestión de propiedades de artículos".
- `next build` exit 0, ruta emitida en el manifest (6.94 kB First Load JS), 25/25 static pages OK.

## Task Commits

Cada task se commiteó atómicamente con `--no-verify`:

1. **Task 1: Crear PropiedadCreateDialog + PropiedadEditDialog + PropiedadDeactivateDialog** — `77933ac8` (feat)
2. **Task 2: Crear PropiedadTable + PropiedadesPage (Tabs lazy)** — `482998f5` (feat)
3. **Task 3: Crear ruta /propiedades (Server Component shell) + build smoke** — `40342a02` (feat)

_Plan metadata commit (SUMMARY.md): TBD — final commit del plan._

## Files Created/Modified

**Created:**

- `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` — Dialog standalone reusable. Signature pública `{ propTipo, onCreated?, trigger?, open?, onOpenChange? }` (D-19 anchor). RHF + zod schema `{ nombre: trim+min(1)+max(255), abrev: regex /^[A-Z0-9]{1,8}$/ }`. Auto-suggest abrev via `useEffect + form.watch('nombre') + suggestAbrev() + setValue` con flag `abrevManuallyEdited`. Reset on open. UPPERCASE force on change. 409 error mapping a `FormError` por parseo del message.
- `apps/web/src/components/propiedades/propiedad-edit-dialog.tsx` — Variante Edit. Sin auto-suggest (D-17 cumple solo en Create). Reset con `propiedad.nombre` / `propiedad.abrev` cuando `open=true` o cambia la fila. Mismo zod schema. Submit `await updatePropiedad(propTipo, id, values)` + toast "{Singular} actualizada correctamente".
- `apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx` — AlertDialog para soft-delete. Title "Desactivar '{nombre}'", description "Vas a desactivar '{nombre}'. Los artículos existentes que la usan no se modifican. ¿Confirmás?", Cancel "Cancelar", Action "Desactivar" con `bg-destructive text-destructive-foreground`. Reactivar NO usa este dialog.
- `apps/web/src/components/propiedades/propiedad-table.tsx` — Tabla genérica. Estado local con loading/showInactivos/togglingId/edit/deactivate/create. `loadData` callback con dependencia en `propTipo` + `showInactivos`. Toolbar (Switch + Button), Tabla 5 cols (ID font-mono, Nombre font-medium, Abrev font-mono, Estado Badge, Acciones DropdownMenu MoreHorizontal h-3.5 w-3.5). Loading: 5 rows Skeleton. Empty: copy es-MX argentino. Inactive rows: `text-muted-foreground`. DropdownMenu actions: Editar (Pencil h-4 w-4) + Desactivar (abre AlertDialog) o Reactivar (flip directo con loading inline). Renderiza los 3 dialogs internamente.
- `apps/web/src/components/propiedades/propiedades-page.tsx` — Client Component con Radix Tabs (`activeTab` state, default "marca"). Mapea `PROP_TIPOS` para los 6 `<TabsTrigger>` y los 6 `<TabsContent>`. Cada `<TabsContent>` envuelve un `<PropiedadTable propTipo={tipo} />` — Radix monta solo el activo (lazy automático).
- `apps/web/src/app/(dashboard)/propiedades/page.tsx` — Server Component shell. Header `<h2>Propiedades</h2>` + subtítulo "Gestión de propiedades de artículos". Monta `<PropiedadesPage />`. Sigue el patrón de `settings/depositos/page.tsx`.

## Decisions Made

- **PropiedadCreateDialog signature pública (D-19 anchor para Phase 32):** prop `propTipo: PropTipo` requerida, `onCreated?: (created: Propiedad) => void` callback (Phase 32 cableará para append+select en `AtributoSelectField`), `trigger?: ReactNode` y modo controlled+uncontrolled vía `open ?? internalOpen` y `onOpenChange ?? setInternalOpen`. Plan 06 Task 1 valida este contract con un component test.
- **Edit dialog sin auto-suggest:** D-17 explícito — el abrev ya existe en una fila persistida; auto-suggest interferiría con la edición. UPPERCASE force sigue activo.
- **Reactivar = flip directo, Desactivar = AlertDialog:** UI-SPEC §"Interaction States" + §"PropiedadDeactivateDialog". Reactivar no destruye datos; desactivar sí oculta el valor del listado por defecto. La asimetría sigue el principio de fricción proporcional al daño.
- **Lazy Tabs sin código adicional:** Radix Tabs por default no monta los `<TabsContent>` inactivos (no se usa `forceMount`). Solo el tab activo monta su `<PropiedadTable>` → solo el activo hace fetch. Cubre el requerimiento Pattern 4 sin lifting state ni cache local.
- **Toolbar layout:** Switch "Mostrar inactivos" a la izquierda con label inline `text-sm text-muted-foreground` + Button "Nueva {singular}" `size=sm` con `Plus mr-2 h-4 w-4` a la derecha. Sigue el contrato del UI-SPEC §"Page Layout Contract".
- **Badge sizing `px-1.5 py-0 text-[11px]`:** copia exacta del pattern de `articulos-columns.tsx` para coherencia visual cross-tabla.

## Deviations from Plan

None - plan executed exactly as written. Los 3 tasks se ejecutaron con el código prescrito en el `<action>` de cada uno; todos los `<verify>` automatizados pasaron a la primera; build smoke `Compiled successfully` con 25/25 static pages.

## Issues Encountered

- **Worktree sin `node_modules`:** la primera invocación a `pnpm --filter @objetiva/web type-check` falló con `tsc: not found` porque el worktree recién creado todavía no tenía dependencias instaladas. Resuelto con `pnpm install --frozen-lockfile` (~12s) seguido de `pnpm --filter @objetiva/{ui,utils,types} build` para generar los `dist/` que apps/web consume vía exports `./lib/*` y `./tokens`. No es una desviación del plan — es overhead estándar de worktrees frescos.
- **Build warnings preexistentes:** `next build` reporta 5 warnings de `react-hooks/exhaustive-deps` en archivos que NO son de Phase 29 (sector-dialog, etc). Los nuevos archivos de Phase 29 compilan limpios sin warnings. Out of scope — registrado como observación, no como deferred-item.

## Verification Evidence

- **Type-check (apps/web):** `pnpm --filter @objetiva/web type-check` → exit 0 (después de cada uno de los 3 tasks).
- **Build smoke:** `pnpm --filter @objetiva/web build` → exit 0, output incluye `✓ Compiled successfully` y `Generating static pages (25/25)`. Ruta `/propiedades` en el manifest a 6.94 kB First Load JS.
- **Signature anchor PropiedadCreateDialog:** `grep -E "(propTipo|onCreated|trigger|open|onOpenChange)" propiedad-create-dialog.tsx | wc -l` retorna 23 (≥5 requerido). `grep -q "export interface PropiedadCreateDialogProps"` exit 0.
- **D-17 cumple solo en Create:** `grep -q "suggestAbrev" propiedad-create-dialog.tsx` exit 0; `! grep -q "suggestAbrev" propiedad-edit-dialog.tsx` exit 0.
- **D-19 enforcement (no cableado a ArticuloForm):** `! grep -q "PropiedadCreateDialog" apps/web/src/components/articulos/articulo-form.tsx` → exit 0. PropiedadCreateDialog solo es importado en `propiedad-table.tsx` (uso interno) y declarado en `propiedad-create-dialog.tsx` (export). Phase 32 podrá cablearlo desde `AtributoSelectField` sin tocar este código.
- **5 columnas exactas:** 5 elementos `<TableHead` (ID, Nombre, Abrev, Estado, acciones empty header) en `propiedad-table.tsx`.
- **DropdownMenu + Switch + Skeleton + MoreHorizontal:** todos presentes en `propiedad-table.tsx`.
- **Tabs lazy (6 contents):** `grep -c "TabsContent" propiedades-page.tsx` retorna 4 (1 import + 1 close tag emparejado vía map = 2 ocurrencias en el código + el import = 4). El map sobre `PROP_TIPOS` (6 elementos) genera 6 `<TabsContent>` en runtime.

## User Setup Required

None — no external service configuration required. Plan 04 ya configuró el sidebar entry "Propiedades" entre "Artículos" y "Compras". El Plan 06 (Wave 6) cubrirá los E2E Playwright + el component test del PropiedadCreateDialog contract.

## Next Phase Readiness

- **Para Plan 06 (Wave 6):** PropiedadCreateDialog está listo para el component test que va a cablearse en `apps/web/src/components/propiedades/__tests__/propiedad-create-dialog.test.tsx` (verifica la signature D-19, auto-suggest, manual-lock, UPPERCASE force, 409 error mapping). El E2E Playwright podrá visitar `/propiedades`, hacer click en cada tab, crear/editar/desactivar/reactivar valores y verificar el toast + el badge.
- **Para Phase 32 (Variantes UI):** PropiedadCreateDialog standalone export está disponible en `@/components/propiedades/propiedad-create-dialog`. Phase 32 lo importará desde `AtributoSelectField` con un trigger inline en el combobox y un `onCreated` que appendea+selecciona el nuevo valor en el ArticuloForm.
- **Sin blockers identificados.**

## Self-Check: PASSED

**Files (7/7 found):**

- `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` ✓
- `apps/web/src/components/propiedades/propiedad-edit-dialog.tsx` ✓
- `apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx` ✓
- `apps/web/src/components/propiedades/propiedad-table.tsx` ✓
- `apps/web/src/components/propiedades/propiedades-page.tsx` ✓
- `apps/web/src/app/(dashboard)/propiedades/page.tsx` ✓
- `.planning/phases/29-catalogos-de-atributos/29-05-SUMMARY.md` ✓

**Commits (3/3 found):**

- `77933ac8` ✓ (Task 1: 3 dialogs)
- `482998f5` ✓ (Task 2: PropiedadTable + PropiedadesPage)
- `40342a02` ✓ (Task 3: /propiedades route)

---

*Phase: 29-catalogos-de-atributos*
*Plan: 05*
*Completed: 2026-04-30*
