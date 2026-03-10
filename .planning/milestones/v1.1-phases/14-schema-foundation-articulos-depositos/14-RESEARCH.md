# Phase 14: Schema Foundation + Articulos + Depositos - Research

**Researched:** 2026-03-05
**Domain:** Drizzle ORM schema design, NestJS CRUD modules, Next.js server-side pagination, React Hook Form
**Confidence:** HIGH

## Summary

This phase replaces the v1.0 `products` table with the real business `articulos` model (text PK, ~30 fields across 6 groups), adds a `depositos` table for warehouse management, rewrites seed data, and delivers full CRUD for both entities on the web frontend. It also fixes the Settings RBAC gap (DEBT-01) and cleans unused shared package exports (DEBT-04).

The codebase already has all necessary libraries installed: Drizzle ORM 0.45.1, NestJS 10, React Hook Form 7.71, Zod 4.3, TanStack Table 8.21, and the full shadcn/ui + Form component stack. The existing `ProductsModule` provides a clean reference architecture for controller/service/DTO/module structure. The current `DataTable` component uses client-side pagination and filtering -- this phase must upgrade it (or create a new variant) for server-side pagination and search.

**Primary recommendation:** Follow the existing NestJS module pattern exactly (products module as template), use `numeric(10,2)` for monetary fields on articulos via Drizzle's `numeric()` column type, and build the articulos form as a long scrollable page with React Hook Form + Zod validation. The DataTable needs a server-side pagination variant that passes page/search/filter params to the backend.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Articulos form:** Single long scrollable form with visual section dividers (headers + separators). Sections: Identificacion, Propiedades, Precios, Imagenes, ERP, Origen. Full-page routes: `/articulos/nuevo` and `/articulos/[codigo]/editar`. Required on create: `codigo` + `nombre` only.
- **Detail view:** Sheet/drawer from list row click (read-only), with "Editar" button navigating to full-page form.
- **Monetary fields:** Articulos `precio` and `costo` use `numeric(10,2)`. v1.0 tables stay on `doublePrecision`.
- **Articulos list:** Default columns: codigo, nombre, marca, precio, estado. Server-side search across 5 fields (codigo, SKU, barcode, ERP code, nombre) with ILIKE, debounced 300ms. Server-side pagination with page numbers. Active/inactive filter via segmented control above search.
- **Depositos placement:** Sub-section within Settings. List shows count badges (0/0 until Phase 15). Create/edit via inline dialog (modal) with 3 fields: nombre, direccion, descripcion. Soft-delete with guard on deactivation.

### Claude's Discretion

- Section divider visual treatment (separator line, heading size, spacing)
- Exact column widths and responsive breakpoints
- Loading skeleton design for table and form
- Error state handling (API errors, validation errors)
- Search debounce timing (suggested 300ms but flexible)
- Seed data content and volume for articulos/depositos

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                     | Research Support                                                                                  |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ART-01  | Paginated list with server-side search and filtering                            | Server-side pagination pattern documented; existing `PaginatedResponseDto` reusable               |
| ART-02  | Search by any code (codigo, sku, barcode, erp_codigo) or name from single input | Multi-field ILIKE search pattern in Drizzle documented                                            |
| ART-03  | Create articulo with all fields                                                 | React Hook Form + Zod schema pattern, long scrollable form with sections                          |
| ART-04  | Edit existing articulo                                                          | Same form component with pre-populated `defaultValues` from API fetch                             |
| ART-05  | Toggle active/inactive (soft-delete)                                            | PATCH endpoint toggling `activo` boolean column                                                   |
| ART-06  | Detail view in sheet/drawer with sections                                       | Existing `ProductSheet` pattern to adapt for Articulo                                             |
| ART-07  | Filter list by active/inactive/all                                              | Segmented control sending `status` query param to backend                                         |
| ART-08  | Rich properties (marca, modelo, talle, color, material, presentacion, medida)   | varchar columns in Drizzle schema, all optional                                                   |
| ART-09  | Image URLs and OCR data (JSONB)                                                 | Drizzle `jsonb()` column type for arrays and JSON objects                                         |
| ART-10  | ERP sync fields                                                                 | Standard varchar/numeric/boolean/timestamp columns                                                |
| ART-11  | Origin tracking fields                                                          | Standard varchar/timestamp columns                                                                |
| ART-12  | Text primary key (codigo)                                                       | Drizzle `text('codigo').primaryKey()` -- documented below                                         |
| DEP-01  | View depositos list with stock summary                                          | Count query with LEFT JOIN to existencias (0/0 until Phase 15)                                    |
| DEP-02  | Create deposito (nombre, direccion, descripcion)                                | Dialog form with 3 fields                                                                         |
| DEP-03  | Edit deposito                                                                   | Same dialog, pre-populated                                                                        |
| DEP-04  | Deactivate deposito (soft-delete with guard)                                    | PATCH endpoint, check existencias/inventarios before deactivation                                 |
| MIG-01  | Products table replaced by articulos                                            | New table definition replaces `products` in schema.ts                                             |
| MIG-04  | Depositos table created                                                         | New table definition in schema.ts                                                                 |
| MIG-06  | Seed data rewritten                                                             | New generators for articulos + depositos                                                          |
| MIG-07  | Monetary fields use numeric(10,2)                                               | Drizzle `numeric('col', { precision: 10, scale: 2 })`                                             |
| DEBT-01 | Settings RBAC gap fixed                                                         | Add `@UseGuards(RolesGuard)` + `@Roles('admin')` to PATCH, POST, DELETE in settings.controller.ts |
| DEBT-04 | Unused shared package exports cleaned                                           | Audit and remove from `packages/types/src/index.ts`                                               |

</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library               | Version | Purpose                                | Why Standard                                |
| --------------------- | ------- | -------------------------------------- | ------------------------------------------- |
| drizzle-orm           | ^0.45.1 | Schema definition, queries, migrations | Project ORM, already configured             |
| @nestjs/common        | ^10.0.0 | Backend framework                      | Project framework                           |
| react-hook-form       | ^7.71.1 | Form state management                  | Already used in business-form, profile-form |
| zod                   | ^4.3.6  | Schema validation (frontend)           | Already used with @hookform/resolvers       |
| @tanstack/react-table | ^8.21.3 | Table with column visibility, sorting  | Already used in DataTable                   |
| @faker-js/faker       | ^10.2.0 | Seed data generation                   | Already used in generators                  |
| class-validator       | ^0.14.3 | DTO validation (backend)               | Already used in all DTOs                    |
| class-transformer     | ^0.5.1  | DTO transformation (backend)           | Already used in QueryDto                    |

### Supporting (Already Installed)

| Library             | Version   | Purpose                          | When to Use                     |
| ------------------- | --------- | -------------------------------- | ------------------------------- |
| @hookform/resolvers | ^5.2.2    | Zod resolver for react-hook-form | Every form with validation      |
| date-fns            | ^4.1.0    | Date formatting                  | Table cells, form display       |
| lucide-react        | ^0.563.0  | Icons                            | Buttons, nav, status indicators |
| @objetiva/utils     | workspace | formatCurrency, shared utils     | Price display                   |

### Missing UI Components (Need to Add via shadcn CLI)

| Component  | Purpose                     | Why Needed                                               |
| ---------- | --------------------------- | -------------------------------------------------------- |
| `dialog`   | Depositos create/edit modal | Depositos CRUD uses inline dialog                        |
| `textarea` | Descripcion fields          | Depositos descripcion, articulo observaciones            |
| `switch`   | Active/inactive toggle      | Articulo status toggle (optional, could use Badge+click) |

**Installation (shadcn components):**

```bash
cd apps/web && npx shadcn@latest add dialog textarea switch
```

## Architecture Patterns

### Backend Module Structure (Follow Existing Pattern)

```
apps/backend/src/modules/
├── articulos/
│   ├── articulos.module.ts
│   ├── articulos.controller.ts
│   ├── articulos.service.ts
│   └── dto/
│       ├── articulo-query.dto.ts
│       └── create-articulo.dto.ts
│       └── update-articulo.dto.ts
├── depositos/
│   ├── depositos.module.ts
│   ├── depositos.controller.ts
│   ├── depositos.service.ts
│   └── dto/
│       ├── create-deposito.dto.ts
│       └── update-deposito.dto.ts
```

### Web Frontend Structure

```
apps/web/src/
├── app/(dashboard)/
│   └── articulos/
│       ├── page.tsx                    # Server component, fetches list
│       ├── articulos-client.tsx        # Client component, table + sheet
│       ├── nuevo/
│       │   └── page.tsx               # Create form page
│       └── [codigo]/
│           └── editar/
│               └── page.tsx           # Edit form page
├── components/
│   ├── articulos/
│   │   ├── articulos-columns.tsx      # Column definitions
│   │   ├── articulo-sheet.tsx         # Detail drawer
│   │   ├── articulo-form.tsx          # Shared create/edit form
│   │   └── articulo-status-filter.tsx # Segmented control
│   ├── depositos/
│   │   ├── depositos-list.tsx         # Table within settings
│   │   └── deposito-dialog.tsx        # Create/edit dialog
│   └── tables/
│       └── server-data-table.tsx      # New: server-side pagination variant
├── lib/
│   ├── api.ts                         # Add fetchArticulos, fetchDepositos
│   └── api.client.ts                  # Add articulo/deposito mutations
└── types/
    ├── articulo.ts                    # Articulo type
    └── deposito.ts                    # Deposito type
```

### Pattern 1: Drizzle Schema with Text PK and numeric(10,2)

**What:** Define articulos table with text primary key and proper monetary type.
**When to use:** Articulos table definition.
**Confidence:** HIGH -- verified from Drizzle docs and existing schema patterns.

```typescript
// apps/backend/src/db/schema.ts
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  doublePrecision,
  timestamp,
  index,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'

export const articulos = pgTable(
  'articulos',
  {
    // Identificacion
    codigo: text('codigo').primaryKey(), // ART-12: text PK
    nombre: varchar('nombre', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 50 }),
    codigoBarras: varchar('codigo_barras', { length: 50 }),
    observaciones: text('observaciones'),

    // Propiedades (ART-08)
    marca: varchar('marca', { length: 100 }),
    modelo: varchar('modelo', { length: 100 }),
    talle: varchar('talle', { length: 50 }),
    color: varchar('color', { length: 50 }),
    material: varchar('material', { length: 100 }),
    presentacion: varchar('presentacion', { length: 100 }),
    medida: varchar('medida', { length: 50 }),

    // Precios (MIG-07)
    precio: numeric('precio', { precision: 10, scale: 2 }),
    costo: numeric('costo', { precision: 10, scale: 2 }),

    // Imagenes (ART-09) -- JSONB for arrays
    imagenesProducto: jsonb('imagenes_producto').$type<string[]>().default([]),
    imagenesEtiqueta: jsonb('imagenes_etiqueta').$type<string[]>().default([]),
    etiquetasOcr: jsonb('etiquetas_ocr').$type<string[]>().default([]),
    jsonArticulo: jsonb('json_articulo'),

    // ERP (ART-10)
    erpId: varchar('erp_id', { length: 50 }),
    erpCodigo: varchar('erp_codigo', { length: 50 }),
    erpNombre: varchar('erp_nombre', { length: 255 }),
    erpPrecio: numeric('erp_precio', { precision: 10, scale: 2 }),
    erpCosto: numeric('erp_costo', { precision: 10, scale: 2 }),
    erpUnidades: integer('erp_unidades'),
    erpDatos: jsonb('erp_datos'),
    erpSincronizado: boolean('erp_sincronizado').default(false),
    erpFechaSync: timestamp('erp_fecha_sync'),

    // Origen (ART-11)
    originSource: varchar('origin_source', { length: 50 }),
    originSyncId: varchar('origin_sync_id', { length: 100 }),
    originSyncedAt: timestamp('origin_synced_at'),

    // Estado y timestamps
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('articulos_nombre_idx').on(table.nombre),
    index('articulos_sku_idx').on(table.sku),
    index('articulos_codigo_barras_idx').on(table.codigoBarras),
    index('articulos_erp_codigo_idx').on(table.erpCodigo),
    index('articulos_activo_idx').on(table.activo),
    index('articulos_marca_idx').on(table.marca),
  ]
)

export const depositos = pgTable(
  'depositos',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    direccion: varchar('direccion', { length: 255 }),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('depositos_activo_idx').on(table.activo)]
)

export type Articulo = typeof articulos.$inferSelect
export type NewArticulo = typeof articulos.$inferInsert
export type Deposito = typeof depositos.$inferSelect
export type NewDeposito = typeof depositos.$inferInsert
```

### Pattern 2: Multi-field ILIKE Search in Drizzle

**What:** Search across 5 fields with a single search term using OR + ILIKE.
**When to use:** Articulos findAll service method.
**Confidence:** HIGH -- follows exact pattern from existing `products.service.ts`.

```typescript
if (query.search) {
  const pattern = `%${query.search}%`
  conditions.push(
    or(
      ilike(articulos.codigo, pattern),
      ilike(articulos.nombre, pattern),
      ilike(articulos.sku, pattern),
      ilike(articulos.codigoBarras, pattern),
      ilike(articulos.erpCodigo, pattern)
    )
  )
}
```

### Pattern 3: Server-side Paginated Table Component

**What:** A table component that delegates pagination, sorting, and filtering to the server instead of client-side.
**When to use:** Articulos list (and future tables with 500+ rows).
**Confidence:** HIGH -- uses TanStack Table `manualPagination` + `manualFiltering`.

```typescript
// Key difference from existing DataTable: manual modes
const table = useReactTable({
  data,
  columns,
  pageCount, // from server meta.totalPages
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true, // pagination handled by server
  manualFiltering: true, // filtering handled by server
  manualSorting: true, // sorting handled by server
  onPaginationChange: setPagination,
  state: {
    pagination,
    columnVisibility,
    sorting,
  },
})
```

The component receives `onPageChange`, `onSearchChange`, `onSortChange` callbacks that trigger URL param updates or API refetches.

### Pattern 4: Form with Zod + React Hook Form (Established Pattern)

**What:** Follow the existing `business-form.tsx` pattern for articulo form.
**When to use:** Articulo create/edit form.
**Confidence:** HIGH -- exact pattern already exists in project.

```typescript
const articuloFormSchema = z.object({
  codigo: z.string().min(1, 'El codigo es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  // Everything else optional
  sku: z.string().optional().or(z.literal('')),
  marca: z.string().optional().or(z.literal('')),
  precio: z.string().optional().or(z.literal('')), // string because numeric returns string
  // ... etc
})

const form = useForm<ArticuloFormValues>({
  resolver: zodResolver(articuloFormSchema),
  defaultValues: articulo ?? { codigo: '', nombre: '' },
})
```

### Pattern 5: Settings RBAC Fix (DEBT-01)

**What:** Add role guards to Settings write endpoints.
**Confidence:** HIGH -- exact pattern exists on products controller.

```typescript
// settings.controller.ts -- add to PATCH, POST logo, DELETE logo
@UseGuards(RolesGuard)
@Roles('admin')
@Patch()
update(@Body() dto: UpdateSettingsDto) { ... }
```

### Anti-Patterns to Avoid

- **Client-side filtering for articulos list:** With 500+ articulos, all filtering/pagination/search MUST be server-side. Do NOT load all articulos and filter in the browser.
- **Using `number` type for numeric(10,2) fields in TypeScript:** Drizzle returns `numeric` columns as `string`. Parse with `parseFloat()` on read, send as string to the DB. Do not use Zod `.transform(Number)` on the form schema -- keep as string for the form, convert at API boundary.
- **Integer PK for articulos:** The PK is `codigo` (text), not a serial ID. All API routes use `:codigo` param, not `:id`. URL encoding matters for special characters.
- **Breaking v1.0 table FKs:** Do NOT modify `orderItems.productId`, `saleItems.productId`, or `purchaseItems.productId` in this phase. FK migration is Phase 16. The old `products` table will be removed but the items tables temporarily lose FK integrity until Phase 16.
- **Hardcoding deposito stock counts:** DEP-01 says show stock summary, but existencias table does not exist yet. Return 0/0 via a computed field or placeholder, not a JOIN to a non-existent table.

## Don't Hand-Roll

| Problem           | Don't Build                    | Use Instead                                                                 | Why                                          |
| ----------------- | ------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------- |
| Form state        | Custom useState per field      | react-hook-form + zod                                                       | 30+ fields, validation, error states         |
| Pagination UI     | Custom page buttons            | TanStack Table pagination model                                             | Already handles pageCount, canNextPage, etc. |
| Column visibility | Custom toggle logic            | TanStack Table VisibilityState                                              | Built-in, already used in DataTable          |
| Debounced search  | Custom setTimeout/clearTimeout | `useDebouncedCallback` from use-debounce or inline `useEffect` with cleanup | Cleaner, handles edge cases                  |
| Segmented control | Custom radio group styling     | Radix `@radix-ui/react-toggle-group` or styled radio-group                  | Already have radio-group installed           |
| Dialog component  | Custom modal                   | shadcn `dialog` (needs install)                                             | Accessibility, focus trapping                |

## Common Pitfalls

### Pitfall 1: numeric(10,2) Returns Strings from Drizzle

**What goes wrong:** Code assumes `articulo.precio` is a number, but Drizzle returns it as a string like `"129.99"`.
**Why it happens:** PostgreSQL `numeric` type preserves precision, so Drizzle returns it as string to avoid floating point loss.
**How to avoid:** Always `parseFloat()` when displaying. In the form, keep as string and only convert at the API client layer when needed for display (formatCurrency).
**Warning signs:** `NaN` in price displays, `[object Object]` in table cells.

### Pitfall 2: Text PK URL Encoding

**What goes wrong:** Articulo codigo like `ART/001` or `ABC-123 XL` breaks URL routing.
**Why it happens:** Special characters in path segments need encoding.
**How to avoid:** Use `encodeURIComponent(codigo)` when building URLs, `decodeURIComponent(params.codigo)` when reading them. NestJS auto-decodes `@Param('codigo')`.
**Warning signs:** 404 errors when clicking articulos with special characters in codigo.

### Pitfall 3: Seed Data FK Integrity During Migration

**What goes wrong:** `db:push` drops products table, but `orderItems`, `saleItems`, `purchaseItems` still reference `productId`.
**Why it happens:** Phase 14 removes `products` but Phase 16 migrates the FKs.
**How to avoid:** In the seed, either (a) temporarily drop FK constraints and re-add them, (b) keep a minimal `products` table for seed compatibility, or (c) truncate all tables including items before seeding. Option (c) is cleanest since this is a dev seed, not production migration.
**Warning signs:** Foreign key constraint violations during seed.

### Pitfall 4: Missing Dialog Component

**What goes wrong:** Depositos dialog fails to render because `@/components/ui/dialog` doesn't exist.
**Why it happens:** shadcn components are installed on demand; dialog was never needed before.
**How to avoid:** Install dialog, textarea, and switch components before implementing depositos UI.
**Warning signs:** Module not found errors.

### Pitfall 5: Stale Products References

**What goes wrong:** Dashboard, sidebar, or other pages still import from products-related files that were removed/renamed.
**Why it happens:** Many files reference the old Product type and products endpoints.
**How to avoid:** Search for all imports of `Product`, `products`, `@/types/product`, `fetchProducts` before removing them. Update or stub as needed. Note: Dashboard updates are Phase 16, so the dashboard may temporarily show stale/broken product stats.
**Warning signs:** Build failures from missing imports.

### Pitfall 6: Deposito Deactivation Guard Without Existencias Table

**What goes wrong:** DEP-04 says "cannot delete if referenced by existencias or inventarios", but neither table exists yet.
**Why it happens:** Existencias and inventarios are Phase 15 and 17.
**How to avoid:** Implement the deactivation endpoint now with just the `activo` toggle. Add the existencias/inventarios guard check when those tables are created. For now, allow free deactivation.
**Warning signs:** Queries against non-existent tables.

## Code Examples

### NestJS Create DTO with class-validator (Articulo)

```typescript
// apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator'

export class CreateArticuloDto {
  @IsString()
  @MaxLength(50)
  codigo: string

  @IsString()
  @MaxLength(255)
  nombre: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoBarras?: string

  @IsOptional()
  @IsString()
  marca?: string

  // ... remaining optional fields follow same pattern

  @IsOptional()
  @IsString()
  precio?: string // numeric comes as string

  @IsOptional()
  @IsString()
  costo?: string

  @IsOptional()
  @IsArray()
  imagenesProducto?: string[]

  @IsOptional()
  @IsBoolean()
  erpSincronizado?: boolean
}
```

### Server-side Fetch with Pagination Params (Web)

```typescript
// apps/web/src/lib/api.ts
export async function fetchArticulos(params?: {
  page?: number
  limit?: number
  search?: string
  activo?: boolean | null // true=active, false=inactive, null=all
}): Promise<PaginatedResponse<Articulo>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.activo !== undefined && params?.activo !== null) {
    searchParams.set('activo', params.activo.toString())
  }
  const queryString = searchParams.toString()
  return fetchWithAuth<PaginatedResponse<Articulo>>(
    `/articulos${queryString ? `?${queryString}` : ''}`
  )
}
```

### Deposito Dialog Form

```typescript
// Pattern: Dialog with form for create/edit
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{isEdit ? 'Editar Deposito' : 'Nuevo Deposito'}</DialogTitle>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="nombre" ... />
        <FormField name="direccion" ... />
        <FormField name="descripcion" ... />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>Guardar</Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

## State of the Art

| Old Approach (v1.0)                  | Current Approach (v1.1)                           | Impact                                      |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------- |
| `products` table with serial PK      | `articulos` table with text PK (`codigo`)         | Matches real ERP model, no surrogate key    |
| `doublePrecision` for money          | `numeric(10,2)` for articulos money               | Precise decimal arithmetic, returns strings |
| Client-side filtering (DataTable)    | Server-side pagination + ILIKE search             | Scales to thousands of articulos            |
| Single `inventory` table per product | `depositos` + future `existencias` (per deposito) | Multi-warehouse support                     |
| `status` varchar enum                | `activo` boolean                                  | Simpler, only active/inactive needed        |

## Open Questions

1. **Old products table and dashboard:**
   - What we know: Dashboard queries products for stats. Phase 16 updates dashboard.
   - What's unclear: Should we keep a stub products table for dashboard compatibility, or let dashboard break until Phase 16?
   - Recommendation: Remove products table entirely, accept that dashboard product stats will break until Phase 16. The seed still populates orders/sales/purchases for other dashboard stats. Document this as a known temporary regression.

2. **Sidebar navigation update:**
   - What we know: NAV-01 (sidebar update) is Phase 16. Current sidebar shows "Products" linking to `/articles`.
   - What's unclear: Should Phase 14 update the route from `/articles` to `/articulos` even if sidebar text update is Phase 16?
   - Recommendation: Yes, create the new `/articulos` route now. Update sidebar link to point to `/articulos` but keep text change minimal. Full nav overhaul in Phase 16.

3. **Segmented control component:**
   - What we know: Radix `radio-group` is already installed. There's no dedicated segmented control.
   - What's unclear: Build from styled radio-group or use Radix toggle-group?
   - Recommendation: Style the existing `radio-group` component to look like a segmented control (horizontal, pill-shaped). No need to install toggle-group.

## Sources

### Primary (HIGH confidence)

- **Existing codebase** -- `apps/backend/src/db/schema.ts`, `products.service.ts`, `products.controller.ts`, `business-form.tsx`, `data-table.tsx` examined directly
- **Drizzle ORM docs** -- `numeric()`, `jsonb()`, `boolean()`, `text().primaryKey()` column types verified in drizzle-orm/pg-core exports
- **TanStack Table docs** -- `manualPagination`, `manualSorting`, `manualFiltering` props for server-side control

### Secondary (MEDIUM confidence)

- **React Hook Form + Zod** -- Pattern verified from existing `business-form.tsx` in project, `@hookform/resolvers/zod` already configured

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- all libraries already installed and used in project
- Architecture: HIGH -- follows established patterns from v1.0 modules
- Pitfalls: HIGH -- identified from direct code analysis of existing schema, seed, and component structure
- Schema design: HIGH -- field list from CONTEXT.md requirements, types from Drizzle docs

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable stack, no external dependencies changing)
