# Phase 22: Vista Lista Configurable - Research

**Researched:** 2026-03-12
**Domain:** TanStack Table v8 column visibility + server-side sorting, Drizzle schema migration, React state/persistence patterns
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mecanismo de visibilidad de columnas**

- Unificar en un solo mecanismo: el dropdown "Columnas" en la tabla es el punto principal de control
- Cada toggle en el dropdown persiste inmediatamente en DB (PATCH a business_settings) — sin botón "Guardar"
- La página de Settings/Artículos se mantiene como espejo: muestra los mismos toggles y también permite editarlos
- Ambos puntos (dropdown en tabla y Settings) persisten en DB y se sincronizan
- Invalidar cache de `useArticulosConfig` después de cada cambio
- Eliminar `defaultColumnVisibility` hardcodeado en `articulos-columns.tsx` — la visibilidad viene de DB

**Columnas fijas (no ocultables)**

- `codigo` y `nombre`: siempre visibles, NO aparecen en el dropdown de visibilidad
- `activo` (Estado): siempre visible como badge, no se puede ocultar
- `actions` (menú ⋮): siempre visible, no se puede ocultar

**Columnas disponibles y defaults**

- Visibles por default: codigo*, nombre*, modelo, medida, presentacion, precio, erpUnidades (label: "Unidades"), objeto, activo\*
- Ocultas por default: marca, sku, codigoBarras, talle, color, material, costo, erpCodigo
- (\*) = fijas, no aparecen en el dropdown

**Columnas nuevas a agregar**

- `medida`: varchar, ya existe en schema — agregar columna a la tabla
- `presentacion`: varchar, ya existe en schema — agregar columna a la tabla
- `erpUnidades`: integer, ya existe en schema como `erp_unidades` — agregar columna con header "Unidades"
- `objeto`: varchar NUEVO — crear campo en schema de artículos (texto libre, describe tipo/categoría del artículo)

**Ordenamiento por columnas**

- Click en header de columna para ordenar: sin orden → ascendente → descendente → sin orden
- Indicador visual (flecha ↑↓) en el header activo
- Columnas ordenables: codigo, nombre, precio, costo, createdAt, updatedAt (las 6 que ya soporta el backend)
- Columnas no ordenables: todas las demás (marca, modelo, medida, etc.)
- Sort NO se persiste en DB — solo por sesión, default: createdAt desc
- Al cambiar sort se resetea a página 1
- Sort es server-side (ya implementado en backend) — enviar sortBy + sortOrder como query params

### Claude's Discretion

- Diseño exacto del indicador de sort en los headers (flechas, color, animación)
- Cómo diferenciar visualmente headers ordenables de no ordenables
- Labels exactos en el dropdown de columnas (capitalización, abreviaciones)
- Manejo de errores al persistir visibilidad (retry silencioso, toast de error)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                         | Research Support                                                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VIEW-01 | User can configure which columns are visible in the articulos list (global setting persisted in DB) | `useArticulosConfig` + `updateSettings` + `ServerDataTable` dropdown extension covers this end-to-end                                                                     |
| VIEW-03 | User can sort the articulos list by clicking column headers (asc/desc)                              | Backend `ArticuloQueryDto` already has `sortBy`/`sortOrder`; `ServerDataTable` has `manualSorting: true`; only wire `SortingState` + `fetchArticulosClient` params needed |

</phase_requirements>

---

## Summary

Phase 22 is almost entirely a **wiring and refactoring** phase rather than a greenfield build. The existing codebase already has the backend sorting infrastructure, the TanStack Table component with `manualSorting: true`, a column visibility dropdown, and a settings persistence layer. What's missing is the connection between those pieces.

There are two dual-track concerns: (1) column visibility must move from being a static compile-time `defaultColumnVisibility` object to being DB-driven via `useArticulosConfig`, and the dropdown must fire `PATCH /api/settings` on every toggle; (2) sort state must be lifted from inside `ServerDataTable` (where it currently doesn't exist as controllable state) to `ArticulosClient`, where it can be passed as query params to `fetchArticulosClient`.

The only backend change needed is adding the `objeto` varchar column to the `articulos` table via a Drizzle migration. All other backend sorting/persistence machinery is already in place.

**Primary recommendation:** Work in three logical units — (A) schema + types for new columns, (B) column visibility wiring from DB to dropdown with immediate-persist, (C) sort state lifting and column header UI.

---

## Standard Stack

### Core (already in use, no new installs)

| Library               | Version      | Purpose                                                      | Why Standard                          |
| --------------------- | ------------ | ------------------------------------------------------------ | ------------------------------------- |
| @tanstack/react-table | 8.x (in use) | Column visibility state, sorting state, VisibilityState type | Already driving ServerDataTable       |
| drizzle-orm           | in use       | Schema migration for `objeto` column                         | Project ORM                           |
| lucide-react          | in use       | Sort indicator icons (ArrowUpDown, ArrowUp, ArrowDown)       | Already used in articulos-columns.tsx |

### No new installs needed

All libraries required for this phase are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes touch existing files only:

```
apps/backend/src/
├── db/schema.ts                          # Add objeto varchar
├── modules/settings/articulos-config.ts  # Add erpUnidades, objeto to CamposVisibles
apps/web/src/
├── types/
│   ├── articulo.ts                       # Add objeto field
│   └── articulos-config.ts              # Add erpUnidades, objeto; update DEFAULT + LABELS
├── hooks/
│   └── use-articulos-config.ts          # Expose setCamposVisibles + persistConfig
├── lib/
│   └── api.client.ts                    # Add sortBy/sortOrder to fetchArticulosClient
├── components/
│   ├── tables/server-data-table.tsx     # Add onColumnVisibilityChange callback + sortingState props
│   └── articulos/
│       └── articulos-columns.tsx        # Add 4 new columns, remove defaultColumnVisibility export, add enableSorting per col
└── app/(dashboard)/
    ├── articulos/articulos-client.tsx   # Add sortBy/sortOrder state, pass to fetchData, pass to ServerDataTable
    └── settings/articulos/page.tsx      # Convert from Save button to immediate-persist per toggle
```

### Pattern 1: Immediate-persist column visibility toggle

**What:** Each checkbox toggle in the dropdown (and in Settings page) calls `updateSettings` directly without a "Save" button. The hook cache is invalidated after each call.

**When to use:** When a toggle represents a single atomic preference change with no inter-field dependency.

**Implementation approach:**

```typescript
// In ServerDataTable — new prop
onColumnVisibilityChange?: (columnId: string, visible: boolean) => Promise<void>

// Usage in articulos-client.tsx
async function handleColumnVisibilityChange(columnId: string, visible: boolean) {
  const updated = { ...camposVisibles, [columnId]: visible }
  // optimistic: update local state immediately
  // then persist
  await updateSettings({ articulosConfig: { camposVisibles: updated } })
  invalidateArticulosConfig()
}
```

Key insight: `ServerDataTable` currently handles `VisibilityState` internally. To allow persistence, the `onColumnVisibilityChange` needs to be surfaced as a prop callback so `ArticulosClient` (which has access to `useArticulosConfig`) can intercept toggles.

### Pattern 2: Server-side sort state lifted to ArticulosClient

**What:** `sortBy` and `sortOrder` live as React state in `ArticulosClient`. When changed, they trigger `fetchData` with the new sort params and reset to page 1. `ServerDataTable` receives the current sort state and an `onSortingChange` callback.

**Implementation approach:**

```typescript
// In ArticulosClient
const [sortBy, setSortBy] = useState<string>('createdAt')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

// Pass to fetchData
fetchArticulosClient({ page, search, activo, sortBy, sortOrder })

// Pass to ServerDataTable as controlled sorting
<ServerDataTable
  sortBy={sortBy}
  sortOrder={sortOrder}
  onSortChange={(col, dir) => {
    setSortBy(col)
    setSortOrder(dir)
    setPage(1)
    fetchData(1, search, statusFilter, col, dir)
  }}
/>
```

### Pattern 3: Three-state column sort (none → asc → desc → none)

**What:** Clicking a sortable column header cycles: no-sort → ascending → descending → no-sort. When in no-sort state, falls back to default (createdAt desc).

**Implementation approach in articulos-columns.tsx:**

```typescript
// Header cell for sortable columns
header: ({ column }) => {
  const sorted = column.getIsSorted() // false | 'asc' | 'desc'
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      Codigo
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
      )}
    </Button>
  )
}
```

Non-sortable columns use a plain `<div>` header (no button, no arrow) to visually signal they are not clickable.

### Pattern 4: Syncing CamposVisibles with TanStack VisibilityState

**Critical issue discovered:** The current system uses two parallel visibility mechanisms that must be unified:

1. `getColumns()` in `articulos-columns.tsx` **filters out columns entirely** based on `camposVisibles` — if a campo is false, the ColumnDef is not even returned.
2. TanStack's `VisibilityState` hides columns that are still in the columns array.

These are different mechanisms. The CONTEXT.md decision says to "unify with the mechanism of TanStack VisibilityState" and "eliminate `defaultColumnVisibility` hardcoded".

**The approach:** Keep ALL columns in the `getColumns()` return (stop filtering at column definition time). Instead, derive a `VisibilityState` from `camposVisibles` and pass it to `ServerDataTable` as controlled state. When the user toggles a column in the dropdown, update `camposVisibles` in DB and in local state, which re-derives `VisibilityState`.

```typescript
// In ArticulosClient
const { camposVisibles } = useArticulosConfig()

// Derive TanStack VisibilityState from DB config
const columnVisibility = useMemo(
  () => ({
    marca: camposVisibles.marca,
    modelo: camposVisibles.modelo,
    medida: camposVisibles.medida,
    presentacion: camposVisibles.presentacion,
    erpUnidades: camposVisibles.erpUnidades,
    objeto: camposVisibles.objeto,
    sku: camposVisibles.sku,
    codigoBarras: camposVisibles.codigoBarras,
    talle: camposVisibles.talle,
    color: camposVisibles.color,
    material: camposVisibles.material,
    costo: camposVisibles.costo,
    erpCodigo: camposVisibles.erpCodigo,
    // Fixed columns (not in dropdown) — always true, enableHiding: false
  }),
  [camposVisibles]
)
```

`precio` and `activo` are always visible (not controlled by `camposVisibles` at all — they should not be in `VisibilityState` or the dropdown).

### CamposVisibles key mapping — critical detail

The existing `CamposVisibles` type uses `erp: boolean` and `origen: boolean` as **section flags** (for the form, not the table). The table needs per-column keys: `erpCodigo`, `erpUnidades`, `objeto`.

The phase adds `erpUnidades` and `objeto` as new keys to `CamposVisibles`. `erpCodigo` is already controlled via the existing `erp` section flag (mapped to `erpCodigo` column in `columnConfigMap`). For the table column toggle, we need to decide:

- `erpCodigo` column toggleability: controlled by existing `erp` key (already mapped in `columnConfigMap`)
- `erpUnidades` column: needs new `erpUnidades` key in `CamposVisibles`
- `objeto` column: needs new `objeto` key in `CamposVisibles`

This means `CamposVisibles` gains 2 new fields, and `DEFAULT_ARTICULOS_CONFIG` must set their defaults (`erpUnidades: true`, `objeto: true` per CONTEXT.md decisions).

### Anti-Patterns to Avoid

- **Double-filtering columns:** Don't filter `getColumns()` output AND set `VisibilityState false` for the same column — pick one mechanism (VisibilityState).
- **Saving all camposVisibles on every toggle:** The PATCH should send the full updated `articulosConfig.camposVisibles` object (since it's a JSONB replace), not a partial patch. The backend's `update()` does a set spread, so passing the full object is correct.
- **Resetting sort on visibility change:** Sort state and visibility state are independent — don't reset one when the other changes.
- **Missing `enableSorting: false` on non-sortable columns:** Without this, TanStack Table would try to sort client-side. Always set `enableSorting: false` on non-sortable columns and `enableSorting: true` + `enableHiding: false` on fixed columns.

---

## Don't Hand-Roll

| Problem                      | Don't Build           | Use Instead                                                             | Why                          |
| ---------------------------- | --------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Sort icon tri-state          | Custom icon component | `column.getIsSorted()` returns `false \| 'asc' \| 'desc'` from TanStack | Already handled by the table |
| Column hide/show logic       | Custom filter array   | TanStack `VisibilityState` + `column.getIsVisible()`                    | Already in ServerDataTable   |
| Debounce on sort changes     | Custom debounce       | No debounce needed — sort changes are infrequent, fire immediately      | Over-engineering             |
| Schema migration boilerplate | Manual SQL            | `pnpm db:generate && pnpm db:migrate` from apps/backend/                | Drizzle handles it           |

---

## Common Pitfalls

### Pitfall 1: Loading state race condition on column visibility

**What goes wrong:** `useArticulosConfig` has `isLoading: true` on first render (no cache). If `columnVisibility` is derived from the hook, the table renders with default visibility before the DB config loads, causing a flash.

**Why it happens:** Module-level cache is cold on first page load.

**How to avoid:** Pass `isLoading` from `useArticulosConfig` to `ServerDataTable` and render a skeleton or suppress the visibility flicker. Alternatively, initialize `useState` with a synchronous check of `cachedConfig` before the effect fires — the hook already does this: `useState(cachedConfig ?? DEFAULT_ARTICULOS_CONFIG.camposVisibles)`.

**Warning signs:** Columns flash visible then hidden on page load.

### Pitfall 2: Stale sort state after page change

**What goes wrong:** When `handlePageChange` calls `fetchData`, it may use stale closure values of `sortBy`/`sortOrder` if those are not passed explicitly.

**Why it happens:** `useCallback` captures stale state if dependencies are incomplete.

**How to avoid:** Either pass `sortBy` and `sortOrder` explicitly to `fetchData` as parameters (not via closure), or add them to `useCallback` dependency arrays. The current `fetchData` already takes `fetchPage`, `fetchSearch`, `fetchStatus` as explicit params — extend this pattern to include `fetchSortBy`, `fetchSortOrder`.

### Pitfall 3: `objeto` field missing from Articulo frontend type

**What goes wrong:** After adding `objeto` to the backend schema, the frontend `Articulo` interface still lacks it. Table column definition with `accessorKey: 'objeto'` would return `undefined` silently.

**Why it happens:** Two separate type definitions (backend Drizzle inferred type, frontend manual interface) must be kept in sync manually.

**How to avoid:** Add `objeto: string | null` to `apps/web/src/types/articulo.ts` as part of the same wave that modifies the backend schema.

### Pitfall 4: Settings page out of sync after dropdown toggle

**What goes wrong:** User toggles a column in the table dropdown → DB updates → but the Settings page still shows old state because it fetched once on mount.

**Why it happens:** Settings page does its own `fetchSettingsClient()` on mount, doesn't subscribe to `useArticulosConfig`.

**How to avoid:** Migrate the Settings/Artículos page to use `useArticulosConfig()` for initial state and `updateSettings` + `invalidateArticulosConfig()` for each individual toggle (not a "Save" button). This way both pages share the same module-level cache and invalidation.

### Pitfall 5: Drizzle migration required for `objeto` field

**What goes wrong:** Adding `objeto` to `schema.ts` without running migration causes runtime errors in production. Dev with `db:push` may mask this.

**Why it happens:** `db:push` bypasses migration files; `db:migrate` requires generated migration.

**How to avoid:** After adding `objeto` to schema, run `pnpm db:generate` then `pnpm db:migrate` from `apps/backend/`. Verify migration file is committed.

---

## Code Examples

### Deriving VisibilityState from CamposVisibles

```typescript
// Source: pattern established in articulos-client.tsx — extend this
const columnVisibility = useMemo<VisibilityState>(
  () => ({
    marca: camposVisibles.marca,
    modelo: camposVisibles.modelo,
    medida: camposVisibles.medida,
    presentacion: camposVisibles.presentacion,
    erpUnidades: camposVisibles.erpUnidades, // new field
    objeto: camposVisibles.objeto, // new field
    sku: camposVisibles.sku,
    codigoBarras: camposVisibles.codigoBarras,
    talle: camposVisibles.talle,
    color: camposVisibles.color,
    material: camposVisibles.material,
    costo: camposVisibles.costo,
    erpCodigo: camposVisibles.erp, // mapped from 'erp' section key
  }),
  [camposVisibles]
)
```

### ServerDataTable with controlled visibility + sort callback

```typescript
// New props to add to ServerDataTableProps
interface ServerDataTableProps<TData, TValue> {
  // ... existing props
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void
}
```

### fetchArticulosClient with sort params

```typescript
// Extend existing function signature in api.client.ts
export async function fetchArticulosClient(params?: {
  page?: number
  limit?: number
  search?: string
  activo?: boolean | null
  sortBy?: string // add
  sortOrder?: 'asc' | 'desc' // add
}): Promise<PaginatedResponse<Articulo>> {
  // ...
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  // ...
}
```

### Drizzle schema addition for `objeto`

```typescript
// In apps/backend/src/db/schema.ts — add to articulos table
objeto: varchar('objeto', { length: 100 }),
```

### Sortable column header pattern

```typescript
// In articulos-columns.tsx — for sortable columns
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

{
  accessorKey: 'codigo',
  enableSorting: true,
  enableHiding: false,  // fixed column
  header: ({ column }) => {
    const sorted = column.getIsSorted()
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-sm font-medium"
        onClick={() => column.toggleSorting(sorted === 'asc')}
      >
        Codigo
        {sorted === 'asc' ? (
          <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
        ) : sorted === 'desc' ? (
          <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    )
  },
}

// Non-sortable column — plain header
{
  accessorKey: 'marca',
  enableSorting: false,
  header: 'Marca',
}
```

### Settings page — immediate-persist pattern

```typescript
// Replace handleSave with per-toggle persist in settings/articulos/page.tsx
async function handleChange(campo: keyof CamposVisibles, value: boolean) {
  const updated = { ...config, [campo]: value }
  setConfig(updated) // optimistic
  try {
    await updateSettings({ articulosConfig: { camposVisibles: updated } })
    invalidateArticulosConfig()
  } catch {
    setConfig(prev => ({ ...prev, [campo]: !value })) // rollback
    toast({ title: 'Error al guardar', variant: 'destructive' })
  }
}
// Remove handleSave, remove the "Guardar cambios" Button
```

---

## State of the Art

| Old Approach                                                 | Current Approach                                              | Status                   | Impact                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------ | ------------------------------------------------- |
| `getColumns()` filters column defs based on `camposVisibles` | Derive `VisibilityState` from `camposVisibles`, keep all defs | To be done in this phase | Enables dropdown to control visibility at runtime |
| `defaultColumnVisibility` hardcoded in columns file          | DB-driven visibility from `useArticulosConfig`                | To be done in this phase | Single source of truth                            |
| Settings page has "Guardar cambios" button                   | Per-toggle immediate persist                                  | To be done in this phase | Consistent with dropdown behavior                 |

---

## Open Questions

1. **Column label for `erpCodigo` in the dropdown**
   - What we know: Current header in columns is "ERP Codigo"
   - What's unclear: Should the dropdown label say "ERP Codigo" or "ERP" (matching the Settings section name)?
   - Recommendation: Use "Cod. ERP" for consistency with the existing `erpCodigo` column header; this is Claude's Discretion.

2. **Sort reset behavior when sort is "no sort"**
   - What we know: Default is `createdAt desc`. CONTEXT says "sin orden → ascendente → descendente → sin orden".
   - What's unclear: When user clicks back to "sin orden", should we pass `sortBy=createdAt&sortOrder=desc` or omit sort params entirely?
   - Recommendation: When state is "no sort", omit params from the request (let backend use its defaults: `sortBy='createdAt'`, `sortOrder='desc'`). Store `sortBy: null` as the "no sort" signal.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| Framework          | None detected (no test files, no jest.config, no vitest.config) |
| Config file        | None — Wave 0 gap                                               |
| Quick run command  | N/A                                                             |
| Full suite command | N/A                                                             |

### Phase Requirements → Test Map

| Req ID  | Behavior                                    | Test Type   | Automated Command       | File Exists? |
| ------- | ------------------------------------------- | ----------- | ----------------------- | ------------ |
| VIEW-01 | Column visibility toggles persist in DB     | manual-only | N/A — no test framework | N/A          |
| VIEW-03 | Sort params sent to backend on header click | manual-only | N/A — no test framework | N/A          |

**Manual validation steps (no automated tests available):**

- Toggle a column in the dropdown, reload page — column state should be restored
- Toggle same column in Settings, check table reflects change
- Click a sortable column header — arrow appears, data re-sorts
- Click again — arrow flips direction
- Click a third time — arrow returns to neutral (ArrowUpDown, greyed)

### Wave 0 Gaps

- No test framework exists in the project — testing is manual/E2E via browser

_(No automated test infrastructure to create — project relies on visual verification)_

---

## File Change Summary

| File                                                          | Change Type | What                                                                                                                                                                          |
| ------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/db/schema.ts`                               | Edit        | Add `objeto: varchar('objeto', { length: 100 })` to articulos table                                                                                                           |
| `apps/backend/src/modules/settings/articulos-config.ts`       | Edit        | Add `erpUnidades: boolean`, `objeto: boolean` to `CamposVisibles`; update `DEFAULT_ARTICULOS_CONFIG`                                                                          |
| `apps/web/src/types/articulo.ts`                              | Edit        | Add `objeto: string \| null` field                                                                                                                                            |
| `apps/web/src/types/articulos-config.ts`                      | Edit        | Add `erpUnidades`, `objeto` to `CamposVisibles`; update `DEFAULT_ARTICULOS_CONFIG` and `CAMPOS_LABELS`                                                                        |
| `apps/web/src/lib/api.client.ts`                              | Edit        | Add `sortBy`, `sortOrder` params to `fetchArticulosClient`                                                                                                                    |
| `apps/web/src/components/articulos/articulos-columns.tsx`     | Edit        | Add 4 new columns (medida, presentacion, erpUnidades, objeto); remove `defaultColumnVisibility` export; add `enableSorting` per column; sortable headers with tri-state arrow |
| `apps/web/src/components/tables/server-data-table.tsx`        | Edit        | Accept controlled `columnVisibility` + `onColumnVisibilityChange` prop; accept `sortBy`/`sortOrder`/`onSortChange` props; surface column labels in dropdown                   |
| `apps/web/src/hooks/use-articulos-config.ts`                  | Edit        | No changes needed — `invalidateArticulosConfig()` already exists                                                                                                              |
| `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` | Edit        | Add sort state; wire `columnVisibility` from DB config; pass `onColumnVisibilityChange` to table; pass sort to fetch                                                          |
| `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`    | Edit        | Convert to immediate-persist per-toggle; remove Save button; add erpUnidades + objeto to toggle groups                                                                        |
| Drizzle migration file (auto-generated)                       | New         | Generated by `pnpm db:generate` for `objeto` column                                                                                                                           |

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all file paths and code patterns verified by reading actual source files
- TanStack Table v8 patterns — confirmed via existing usage in `server-data-table.tsx` (manualSorting, VisibilityState, useReactTable)
- Backend ArticuloQueryDto — sortBy/sortOrder validation already in place at `apps/backend/src/modules/articulos/dto/articulo-query.dto.ts`

### Secondary (MEDIUM confidence)

- Drizzle `varchar` addition pattern — consistent with existing schema declarations in `apps/backend/src/db/schema.ts`
- Lucide React ArrowUp/ArrowDown/ArrowUpDown — these icons exist in lucide-react (used across the project)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in use, verified via source files
- Architecture: HIGH — patterns derived directly from existing codebase patterns
- Pitfalls: HIGH — identified from concrete code inspection (dual-visibility mechanism, stale closures, type sync)

**Research date:** 2026-03-12
**Valid until:** Stable — no fast-moving dependencies
