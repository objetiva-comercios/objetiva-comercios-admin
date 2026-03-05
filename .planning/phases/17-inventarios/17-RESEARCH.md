# Phase 17: Inventarios - Research

**Researched:** 2026-03-05
**Domain:** Physical inventory count events (schema, backend CRUD, web UI)
**Confidence:** HIGH

## Summary

Phase 17 adds physical inventory counting to the application. This involves four new database tables (inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles), two new backend NestJS modules (inventarios, dispositivos), web UI pages under /articulos/inventarios for event management and counting, a settings subsection for dispositivos moviles, and extension of the depositos module to support sectores.

The domain is well-constrained by CONTEXT.md decisions: web-only counting (no mobile), manual articulo search (no pre-load), finalize locks counts as read-only but does NOT auto-apply to existencias. All patterns needed (NestJS module structure, Drizzle schema, ServerDataTable, inline dialog, settings sub-page, tab navigation) are already established in the codebase from phases 14-16.

**Primary recommendation:** Follow established codebase patterns exactly -- new modules mirror depositos/existencias structure, new pages mirror the articulos tab layout, and new settings pages mirror the depositos settings pattern.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Evento de inventario creacion via dialog inline (like depositos) with fields: nombre, fecha, deposito (select), descripcion
- Lista de eventos in ServerDataTable with columns: nombre, fecha, deposito, estado (badge), articulos contados
- Filtros por estado y fecha in the table
- Status workflow: pendiente -> en_curso -> finalizado (or cancelado)
- State transition buttons on event detail page (not dropdown in table)
- Single button visible based on current state: "Iniciar Conteo" (pendiente->en_curso), "Finalizar" (en_curso->finalizado), "Cancelar" (any->cancelado)
- Finalizar only locks counts as read-only. Does NOT modify existencias (auto-apply is STOK-01, v1.2+)
- Dedicated counting page: /articulos/inventarios/[id]/conteo
- Articulos added to count via manual search (by codigo, nombre, SKU) -- no auto-preload
- Counting table shows: Articulo, Cantidad Contada, Stock Sistema, Diferencia (green=ok, red=faltante, yellow=sobrante)
- Difference column always visible + filter/toggle to show only discrepancies
- Web only in this phase -- no mobile counting
- Sectores are permanent deposito configuration, not per-event
- Sectores managed in Settings > Depositos (each deposito has its sectors)
- A sector groups columns of the physical deposito (nombre + columnas)
- Inventory event inherits sectors from selected deposito
- Dispositivos CRUD in Settings > Dispositivos (subsection of Settings, like Depositos)
- Dispositivos dialog inline for create/edit (nombre, identificador, descripcion)
- No prior device-to-inventory assignment; dispositivo_id recorded per articulo count automatically
- Sub-tab within Articulos: Listado | Existencias | Inventarios
- Routes: /articulos/inventarios (list), /articulos/inventarios/[id] (detail), /articulos/inventarios/[id]/conteo (counting)
- No mobile section for inventarios in this phase

### Claude's Discretion

- Event detail page design (layout, sections)
- Articulo search component in counting page
- Loading skeletons and empty states
- KPI cards in inventory list (if applicable)
- Responsive design of counting table
- Seed data for inventarios, sectores, dispositivos

### Deferred Ideas (OUT OF SCOPE)

- Mobile counting with barcode scanning -- SCAN-01/02, v1.2+
- Auto-apply discrepancies to existencias -- STOK-01, v1.2+
- Mobile inventory view -- when mobile counting is implemented
- Auto-preload deposito articulos when starting count -- possible future improvement
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                      | Research Support                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| MIG-05 | Inventarios model tables created (inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles) | Schema design section below with exact Drizzle table definitions |
| INV-01 | User can create an inventory count event (nombre, fecha, deposito, description)                                  | Inline dialog pattern from depositos, NestJS module pattern      |
| INV-02 | User can define sectors/zones for a count event (nombre, columnas)                                               | Sectores as deposito config, inherited by event                  |
| INV-03 | User can record per-articulo unit counts within an inventory event                                               | Counting page with search + InlineEditCell pattern               |
| INV-04 | User can view discrepancies between counted quantities and system stock                                          | SQL join with existencias for difference calculation             |
| INV-05 | User can finalize/close an inventory event (locks counts as read-only)                                           | Status transition endpoint, UI conditional rendering             |
| INV-06 | User can view inventory event history filtered by date or status                                                 | ServerDataTable with query params                                |
| INV-07 | Inventory events follow status workflow: pendiente -> en_curso -> finalizado (or cancelado)                      | Status enum + backend validation                                 |
| INV-08 | User can manage dispositivos moviles (CRUD) for assignment during counting                                       | Settings sub-page pattern from depositos                         |
| INV-09 | User can assign dispositivos moviles to inventory count records                                                  | dispositivo_id FK on inventarios_articulos                       |

</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Library         | Version           | Purpose                                      | Why Standard                      |
| --------------- | ----------------- | -------------------------------------------- | --------------------------------- |
| Drizzle ORM     | (project version) | Schema definition + queries                  | Already used for all tables       |
| NestJS          | (project version) | Backend modules, controllers, services       | Established module pattern        |
| Next.js 14      | 14.x              | Web UI pages and routing                     | App router with dashboard layout  |
| class-validator | (project version) | DTO validation in NestJS                     | Used by all existing DTOs         |
| TanStack Table  | (project version) | Server-driven data tables                    | Used by ServerDataTable component |
| shadcn/ui       | (project version) | UI components (Badge, Dialog, Button, Input) | Project-wide design system        |
| lucide-react    | (project version) | Icons                                        | Used throughout the app           |

### No New Libraries Needed

This phase uses exclusively existing dependencies. No new npm packages required.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/
├── db/
│   ├── schema.ts                    # ADD: inventarios, inventariosArticulos, inventarioSectores, dispositivosMoviles tables
│   ├── seed.ts                      # ADD: seed calls for new tables
│   └── generators/
│       ├── inventario.generator.ts  # NEW: generates inventory events with counts
│       └── dispositivo.generator.ts # NEW: generates mobile devices
├── modules/
│   ├── inventarios/                 # NEW MODULE
│   │   ├── inventarios.module.ts
│   │   ├── inventarios.controller.ts
│   │   ├── inventarios.service.ts
│   │   └── dto/
│   │       ├── create-inventario.dto.ts
│   │       ├── update-inventario.dto.ts
│   │       ├── inventario-query.dto.ts
│   │       ├── create-inventario-articulo.dto.ts
│   │       └── update-inventario-articulo.dto.ts
│   ├── dispositivos/               # NEW MODULE
│   │   ├── dispositivos.module.ts
│   │   ├── dispositivos.controller.ts
│   │   ├── dispositivos.service.ts
│   │   └── dto/
│   │       ├── create-dispositivo.dto.ts
│   │       └── update-dispositivo.dto.ts
│   └── depositos/                  # EXTEND
│       ├── depositos.controller.ts  # ADD: sector endpoints
│       └── depositos.service.ts     # ADD: sector CRUD methods

apps/web/src/
├── app/(dashboard)/
│   ├── articulos/
│   │   ├── layout.tsx              # MODIFY: add "Inventarios" tab
│   │   └── inventarios/
│   │       ├── page.tsx            # NEW: inventory events list
│   │       ├── [id]/
│   │       │   ├── page.tsx        # NEW: event detail
│   │       │   └── conteo/
│   │       │       └── page.tsx    # NEW: counting page
│   └── settings/
│       └── dispositivos/
│           └── page.tsx            # NEW: dispositivos settings
├── components/
│   ├── inventarios/
│   │   ├── inventario-dialog.tsx   # NEW: create/edit event dialog
│   │   ├── inventario-list.tsx     # NEW: events list with ServerDataTable
│   │   ├── inventario-detail.tsx   # NEW: event detail view
│   │   ├── conteo-table.tsx        # NEW: counting table
│   │   └── articulo-search.tsx     # NEW: articulo search for counting
│   └── dispositivos/
│       ├── dispositivos-list.tsx   # NEW: device list
│       └── dispositivo-dialog.tsx  # NEW: create/edit device dialog
├── lib/
│   ├── api.ts                      # ADD: fetchInventarios, fetchInventario
│   └── api.client.ts               # ADD: client mutation functions
└── types/
    ├── inventario.ts               # NEW: Inventario, InventarioArticulo types
    └── dispositivo.ts              # NEW: DispositivoMovil type
```

### Pattern 1: NestJS Module (Mirror Depositos)

**What:** Controller + Service + DTOs + Module, registered in AppModule
**When to use:** Every new backend domain
**Example:**

```typescript
// inventarios.module.ts
@Module({
  controllers: [InventariosController],
  providers: [InventariosService],
  exports: [InventariosService],
})
export class InventariosModule {}

// Register in app.module.ts imports array
```

### Pattern 2: Drizzle Schema with Foreign Keys

**What:** pgTable with references, indexes, and type exports
**When to use:** All new tables
**Example:**

```typescript
export const inventarios = pgTable(
  'inventarios',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 255 }).notNull(),
    fecha: timestamp('fecha').notNull(),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    descripcion: text('descripcion'),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('inventarios_deposito_id_idx').on(table.depositoId),
    index('inventarios_estado_idx').on(table.estado),
    index('inventarios_fecha_idx').on(table.fecha),
  ]
)
```

### Pattern 3: Inline Dialog (Mirror Deposito Dialog)

**What:** Dialog component with form for create/edit, triggered by button
**When to use:** Simple entity CRUD (inventario creation, dispositivo management)
**Reference:** `apps/web/src/components/depositos/deposito-dialog.tsx`

### Pattern 4: Tab Navigation Extension

**What:** Add tab to existing layout using usePathname-based active detection
**When to use:** Adding "Inventarios" tab to articulos layout
**Example:**

```typescript
const tabs = [
  { label: 'Listado', href: '/articulos' },
  { label: 'Existencias', href: '/articulos/existencias' },
  { label: 'Inventarios', href: '/articulos/inventarios' }, // NEW
]
```

**Note:** The `isActive` logic already handles prefix matching for non-root tabs via `pathname.startsWith(href)`, so `/articulos/inventarios/[id]` and `/articulos/inventarios/[id]/conteo` will correctly highlight the Inventarios tab.

### Pattern 5: Settings Sub-page (Mirror Depositos Settings)

**What:** Nav item in SettingsNav + page.tsx + dedicated component
**When to use:** Dispositivos settings page
**Reference:** `apps/web/src/app/(dashboard)/settings/depositos/page.tsx`

### Pattern 6: Server-Side Paginated List

**What:** ServerDataTable with server-side pagination, filtering, sorting
**When to use:** Inventory events list with status/date filters
**Reference:** Articulos list page uses this pattern

### Pattern 7: Status Badge with Color Mapping

**What:** Badge component with variant based on status value
**When to use:** Inventory event status display

```typescript
const statusVariants: Record<string, string> = {
  pendiente: 'secondary',
  en_curso: 'default',
  finalizado: 'outline', // or success variant
  cancelado: 'destructive',
}
```

### Anti-Patterns to Avoid

- **Don't create separate API routes for status transitions:** Use a single PATCH endpoint with estado field, validate transitions in the service layer
- **Don't pre-load all deposito articulos into the count:** Decision is manual search only -- articulos are added one-by-one
- **Don't compute discrepancies client-side:** Join with existencias table server-side to get stock sistema values
- **Don't allow editing counts on finalized/cancelled events:** Backend must reject mutations when estado is 'finalizado' or 'cancelado'

## Don't Hand-Roll

| Problem                            | Don't Build           | Use Instead                                           | Why                                                        |
| ---------------------------------- | --------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Data table with pagination/filters | Custom table          | ServerDataTable                                       | Already supports server-driven pagination, search, filters |
| Inline editing of count quantities | Custom input handling | InlineEditCell pattern                                | Proven Enter-to-save, blur-to-cancel pattern               |
| Dialog for entity creation         | Custom modal          | shadcn Dialog + form pattern                          | Consistent with deposito-dialog.tsx                        |
| Settings navigation                | Custom nav            | SettingsNav component                                 | Just add entry to settingsNavItems array                   |
| Status badges                      | Custom styled spans   | Badge component with variant map                      | Consistent styling across app                              |
| API auth wrapper                   | Custom fetch          | api.client.ts pattern (getAuthHeaders + throwIfError) | Established pattern with Supabase JWT                      |

**Key insight:** Every UI and backend pattern needed already exists in the codebase from phases 14-16. The implementation is primarily composition of established patterns, not new pattern creation.

## Common Pitfalls

### Pitfall 1: Status Transition Validation

**What goes wrong:** Allowing invalid status transitions (e.g., finalizado -> en_curso, cancelado -> pendiente)
**Why it happens:** No backend validation of transition rules
**How to avoid:** Validate in InventariosService before updating estado. Only allow: pendiente->en_curso, pendiente->cancelado, en_curso->finalizado, en_curso->cancelado
**Warning signs:** Tests or manual testing can transition to invalid states

### Pitfall 2: Count Editing After Finalization

**What goes wrong:** Users can still edit counted quantities after event is finalized
**Why it happens:** No estado check on the inventarios_articulos update endpoint
**How to avoid:** In the inventarios service, check parent inventario estado before allowing any article count mutation. Return 400/403 if estado is 'finalizado' or 'cancelado'
**Warning signs:** Editing controls still active on finalized events in the UI

### Pitfall 3: Discrepancy Calculation Without Existencia Record

**What goes wrong:** NaN or null displayed for difference when an articulo has no existencia record in the event's deposito
**Why it happens:** LEFT JOIN with existencias returns null cantidad
**How to avoid:** COALESCE existencias.cantidad to 0 in the query. A missing existencia means 0 system stock.
**Warning signs:** Blank or NaN in the difference column

### Pitfall 4: Orphaned Sectores When Deposito Is Deactivated

**What goes wrong:** Inventory events reference sectores of a deactivated deposito
**Why it happens:** Sectores are permanent config, not affected by deposito active status
**How to avoid:** This is actually correct behavior per the decision (sectores are permanent). Just ensure the UI shows sector info even if the deposito is inactive. No special handling needed.

### Pitfall 5: Tab Navigation Path Collision

**What goes wrong:** "Inventarios" tab doesn't highlight correctly on sub-pages
**Why it happens:** The isActive function in articulos layout uses startsWith for non-root paths
**How to avoid:** The existing isActive logic already handles this correctly since `/articulos/inventarios` is not the root `/articulos` path. Just ensure the tab href is `/articulos/inventarios`.

### Pitfall 6: Seed Data FK Dependencies

**What goes wrong:** Seed fails because inventarios reference deposito IDs that don't exist yet
**Why it happens:** Seed order matters -- inventarios must come after depositos
**How to avoid:** Seed order: depositos -> dispositivos_moviles -> inventarios -> inventario_sectores -> inventarios_articulos. Use inserted IDs from earlier steps.

## Schema Design

### inventarios Table

```typescript
export const inventarios = pgTable(
  'inventarios',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 255 }).notNull(),
    fecha: timestamp('fecha').notNull(),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    descripcion: text('descripcion'),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('inventarios_deposito_id_idx').on(table.depositoId),
    index('inventarios_estado_idx').on(table.estado),
    index('inventarios_fecha_idx').on(table.fecha),
  ]
)
```

### inventarios_articulos Table

```typescript
export const inventariosArticulos = pgTable(
  'inventarios_articulos',
  {
    id: serial('id').primaryKey(),
    inventarioId: integer('inventario_id')
      .notNull()
      .references(() => inventarios.id, { onDelete: 'cascade' }),
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    cantidadContada: integer('cantidad_contada').notNull().default(0),
    dispositivoId: integer('dispositivo_id').references(() => dispositivosMoviles.id, {
      onDelete: 'set null',
    }),
    observaciones: text('observaciones'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('inv_articulos_inventario_id_idx').on(table.inventarioId),
    index('inv_articulos_articulo_codigo_idx').on(table.articuloCodigo),
    index('inv_articulos_dispositivo_id_idx').on(table.dispositivoId),
  ]
)
```

### inventario_sectores Table

```typescript
export const inventarioSectores = pgTable(
  'inventario_sectores',
  {
    id: serial('id').primaryKey(),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    columnas: jsonb('columnas').$type<string[]>().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('inv_sectores_deposito_id_idx').on(table.depositoId)]
)
```

### dispositivos_moviles Table

```typescript
export const dispositivosMoviles = pgTable(
  'dispositivos_moviles',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    identificador: varchar('identificador', { length: 100 }).notNull().unique(),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('dispositivos_moviles_identificador_idx').on(table.identificador),
    index('dispositivos_moviles_activo_idx').on(table.activo),
  ]
)
```

## API Endpoints Design

### Inventarios Module

| Method | Endpoint                                   | Purpose                                              | Auth  |
| ------ | ------------------------------------------ | ---------------------------------------------------- | ----- |
| GET    | /api/inventarios                           | List events (paginated, filterable by estado/fecha)  | JWT   |
| GET    | /api/inventarios/:id                       | Get event detail with count summary                  | JWT   |
| POST   | /api/inventarios                           | Create new event                                     | admin |
| PATCH  | /api/inventarios/:id                       | Update event (nombre, descripcion)                   | admin |
| PATCH  | /api/inventarios/:id/estado                | Transition event status                              | admin |
| GET    | /api/inventarios/:id/articulos             | Get counted articulos for event (with discrepancies) | JWT   |
| POST   | /api/inventarios/:id/articulos             | Add articulo to count                                | admin |
| PATCH  | /api/inventarios/:id/articulos/:articuloId | Update count quantity                                | admin |
| DELETE | /api/inventarios/:id/articulos/:articuloId | Remove articulo from count                           | admin |

### Dispositivos Module

| Method | Endpoint                     | Purpose              | Auth  |
| ------ | ---------------------------- | -------------------- | ----- |
| GET    | /api/dispositivos            | List all devices     | JWT   |
| GET    | /api/dispositivos/:id        | Get device detail    | JWT   |
| POST   | /api/dispositivos            | Create device        | admin |
| PATCH  | /api/dispositivos/:id        | Update device        | admin |
| PATCH  | /api/dispositivos/:id/toggle | Toggle active status | admin |

### Depositos Extension (Sectores)

| Method | Endpoint                              | Purpose                     | Auth  |
| ------ | ------------------------------------- | --------------------------- | ----- |
| GET    | /api/depositos/:id/sectores           | List sectors for a deposito | JWT   |
| POST   | /api/depositos/:id/sectores           | Create sector               | admin |
| PATCH  | /api/depositos/:id/sectores/:sectorId | Update sector               | admin |
| DELETE | /api/depositos/:id/sectores/:sectorId | Delete sector               | admin |

## Discrepancy Query Pattern

The counting page needs to show discrepancies. The key query joins inventarios_articulos with existencias:

```typescript
// In inventarios.service.ts
async getArticulosWithDiscrepancy(inventarioId: number) {
  const inv = await this.findOne(inventarioId)

  const rows = await this.drizzle.db
    .select({
      id: inventariosArticulos.id,
      articuloCodigo: inventariosArticulos.articuloCodigo,
      articuloNombre: articulos.nombre,
      cantidadContada: inventariosArticulos.cantidadContada,
      stockSistema: sql<number>`COALESCE(${existencias.cantidad}, 0)::int`,
      diferencia: sql<number>`${inventariosArticulos.cantidadContada} - COALESCE(${existencias.cantidad}, 0)::int`,
      dispositivoId: inventariosArticulos.dispositivoId,
      observaciones: inventariosArticulos.observaciones,
    })
    .from(inventariosArticulos)
    .innerJoin(articulos, eq(inventariosArticulos.articuloCodigo, articulos.codigo))
    .leftJoin(
      existencias,
      and(
        eq(existencias.articuloCodigo, inventariosArticulos.articuloCodigo),
        eq(existencias.depositoId, inv.depositoId)
      )
    )
    .where(eq(inventariosArticulos.inventarioId, inventarioId))
    .orderBy(articulos.nombre)

  return rows
}
```

## Code Examples

### Status Transition Validation

```typescript
// In inventarios.service.ts
private validateTransition(current: string, target: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pendiente: ['en_curso', 'cancelado'],
    en_curso: ['finalizado', 'cancelado'],
    finalizado: [],
    cancelado: [],
  }
  return validTransitions[current]?.includes(target) ?? false
}
```

### Count Mutation Guard

```typescript
// In inventarios.service.ts - before any articulo count mutation
async assertEventEditable(inventarioId: number): Promise<void> {
  const inv = await this.findOne(inventarioId)
  if (!inv) throw new NotFoundException(...)
  if (inv.estado === 'finalizado' || inv.estado === 'cancelado') {
    throw new BadRequestException('No se pueden modificar conteos de un inventario finalizado o cancelado')
  }
}
```

### Counting Page Articulo Search

```typescript
// Client-side: reuse fetchArticulosClient with search param
// Filter out articulos already in the count
const searchArticulos = async (query: string) => {
  const result = await fetchArticulosClient({ search: query, limit: 10 })
  const existingCodigos = new Set(countedArticulos.map(a => a.articuloCodigo))
  return result.data.filter(a => !existingCodigos.has(a.codigo))
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact                                                            |
| ------------ | ---------------- | ------------ | ----------------------------------------------------------------- |
| N/A          | N/A              | N/A          | No migrations from old approaches needed -- this is a new feature |

This is a greenfield feature within the existing architecture. All patterns are established from phases 14-16.

## Open Questions

1. **Sector assignment to counted articulos**
   - What we know: Sectores are deposito config, events inherit them
   - What's unclear: Should inventarios_articulos have a sector_id FK to track which sector an articulo was counted in?
   - Recommendation: Add optional sectorId FK on inventarios_articulos. This enables per-sector counting views without adding complexity. If not needed now, the column can be nullable and ignored.

2. **Duplicate articulo counts within an event**
   - What we know: Articulos are added via search to the count
   - What's unclear: Can the same articulo be counted multiple times (e.g., by different devices in different sectors)?
   - Recommendation: Allow multiple records per articulo per event (different sectors/devices may count the same item). The discrepancy calculation should SUM cantidadContada per articuloCodigo. Alternatively, enforce unique articulo per event and update quantity. The simpler approach (unique per event, update quantity) aligns better with the "manual search and add" flow decided in CONTEXT.md.

## Sources

### Primary (HIGH confidence)

- Codebase analysis of existing patterns (schema.ts, seed.ts, depositos module, existencias module, articulos layout, settings nav)
- CONTEXT.md decisions from discuss-phase session
- REQUIREMENTS.md requirement definitions

### Secondary (MEDIUM confidence)

- Drizzle ORM patterns inferred from existing schema usage in the project

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - all patterns established in phases 14-16, this is composition
- Schema design: HIGH - follows exact patterns from existing tables (depositos, existencias)
- Pitfalls: HIGH - based on direct codebase analysis and domain understanding

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- no external dependencies to version-check)
