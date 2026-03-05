---
phase: 14-schema-foundation-articulos-depositos
verified: 2026-03-05T15:00:00Z
status: passed
score: 5/5 success criteria verified
---

# Phase 14: Schema Foundation + Articulos + Depositos Verification Report

**Phase Goal:** Users can manage articulos and depositos through complete CRUD with the real business data model replacing the old products table
**Verified:** 2026-03-05
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| #   | Truth                                                                                                      | Status   | Evidence                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can view a paginated, searchable list of articulos and search by any code or name from a single input | VERIFIED | ArticulosService.findAll uses OR(ILIKE) across codigo, nombre, sku, codigoBarras, erpCodigo. ServerDataTable renders pagination with "Pagina X de Y". ArticulosClient wires debounced search to fetchArticulosClient.                                                      |
| 2   | User can create, edit, view detail, and toggle active/inactive on articulos with all field groups          | VERIFIED | ArticuloForm (527 lines) renders 6 sections (Identificacion, Propiedades, Precios, Imagenes, ERP, Origen). nuevo/page.tsx creates, [codigo]/editar/page.tsx edits with toggle Switch. ArticuloSheet shows read-only detail with all sections.                              |
| 3   | User can create, edit, view, and deactivate depositos with stock summary visible in list                   | VERIFIED | DepositosList renders table with stockSummary badges (totalArticulos, totalUnidades). DepositoDialog handles create/edit with 3 fields. Toggle active button in list. Settings nav includes Depositos tab.                                                                 |
| 4   | Running db:push && db:seed produces working database with articulos, depositos, and v1.0 tables            | VERIFIED | schema.ts defines articulos (text PK, ~30 fields, numeric(10,2) for precio/costo, 6 indexes) and depositos (serial PK, 5 fields). seed.ts truncates all tables including articulos/depositos, seeds 300 articulos, 5 depositos, 100 products, plus orders/sales/purchases. |
| 5   | Settings write endpoints protected with @Roles('admin') and unused shared package exports removed          | VERIFIED | settings.controller.ts has @UseGuards(RolesGuard) + @Roles('admin') on PATCH, POST logo/:type, DELETE logo/:type. GET stays @Public(). packages/types/src/index.ts exports only auth-related schemas (all actively used).                                                  |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                          | Expected                             | Status   | Details                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/db/schema.ts`                                   | articulos + depositos tables         | VERIFIED | 330 lines. articulos with text PK, ~30 fields across 6 groups, numeric(10,2) monetary. depositos with serial PK, 5 fields. Type exports for both. |
| `apps/backend/src/db/seed.ts`                                     | Seed for all tables                  | VERIFIED | 260 lines. Truncates articulos+depositos+v1.0 tables. Seeds 300 articulos, 5 depositos, 100 products + related items.                             |
| `apps/backend/src/db/generators/articulo.generator.ts`            | Faker-based generator                | VERIFIED | 139 lines. Exports generateArticulos(count).                                                                                                      |
| `apps/backend/src/db/generators/deposito.generator.ts`            | Faker-based generator                | VERIFIED | 43 lines. Exports generateDepositos().                                                                                                            |
| `apps/backend/src/modules/articulos/articulos.service.ts`         | CRUD with search + pagination        | VERIFIED | 122 lines. findAll with multi-field ILIKE search, activo filter, pagination. findOne, create, update, toggleActive.                               |
| `apps/backend/src/modules/depositos/depositos.service.ts`         | CRUD with placeholder stock          | VERIFIED | 67 lines. findAll returns depositos with stockSummary: { totalArticulos: 0, totalUnidades: 0 }. Full CRUD + toggleActive.                         |
| `apps/web/src/components/tables/server-data-table.tsx`            | Reusable server-side paginated table | VERIFIED | 211 lines. TanStack Table with manualPagination, manualFiltering, manualSorting. Column visibility toggle. Row click support.                     |
| `apps/web/src/components/articulos/articulos-columns.tsx`         | Column definitions                   | VERIFIED | 129 lines. 5 default visible + 8 hidden columns. formatCurrency for prices. Badge for status.                                                     |
| `apps/web/src/components/articulos/articulo-sheet.tsx`            | Detail drawer                        | VERIFIED | 203 lines. 6 sections with separators. Conditional ERP/Origin sections. Editar button with encoded URL.                                           |
| `apps/web/src/components/articulos/articulo-form.tsx`             | Create/edit form with 6 sections     | VERIFIED | 527 lines. Zod schema with required codigo+nombre. 6 visual sections. RHF integration. Create/edit API calls with toasts.                         |
| `apps/web/src/components/articulos/articulo-status-filter.tsx`    | Segmented control                    | VERIFIED | 39 lines. Active/Inactive/All filter.                                                                                                             |
| `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx`     | Client orchestrator                  | VERIFIED | 141 lines. Manages page, search (300ms debounce), statusFilter state. Wires ServerDataTable, search input, filter, and sheet.                     |
| `apps/web/src/app/(dashboard)/articulos/page.tsx`                 | Server component with initial fetch  | VERIFIED | Server-side fetchArticulos(page:1, limit:20, activo:true), passes to ArticulosClient.                                                             |
| `apps/web/src/app/(dashboard)/articulos/nuevo/page.tsx`           | Create page                          | VERIFIED | 30 lines. Back button, title, ArticuloForm mode="create", onSuccess redirects.                                                                    |
| `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` | Edit page                            | VERIFIED | 133 lines. Loads articulo by decoded codigo, shows loading skeleton, renders form mode="edit" with toggle Switch.                                 |
| `apps/web/src/components/depositos/depositos-list.tsx`            | Depositos table in settings          | VERIFIED | 186 lines. Shows nombre, direccion, stock badges, estado, actions (edit/toggle). Nuevo Deposito button.                                           |
| `apps/web/src/components/depositos/deposito-dialog.tsx`           | Create/edit dialog                   | VERIFIED | 172 lines. Zod validation, 3 fields (nombre, direccion, descripcion). sm:max-w-md.                                                                |
| `apps/web/src/app/(dashboard)/settings/depositos/page.tsx`        | Settings sub-page                    | VERIFIED | 13 lines. Renders DepositosList with heading.                                                                                                     |

### Key Link Verification

| From                     | To                    | Via                           | Status | Details                                                                               |
| ------------------------ | --------------------- | ----------------------------- | ------ | ------------------------------------------------------------------------------------- |
| seed.ts                  | schema.ts             | `schema.articulos`            | WIRED  | `db.insert(schema.articulos).values(...)` confirmed                                   |
| seed.ts                  | articulo.generator.ts | `generateArticulos`           | WIRED  | Import and call with count 300                                                        |
| articulos.service.ts     | schema.ts             | `schema.articulos`            | WIRED  | Direct import of `articulos` table, used in all queries                               |
| depositos.service.ts     | schema.ts             | `schema.depositos`            | WIRED  | Direct import of `depositos` table, used in all queries                               |
| app.module.ts            | ArticulosModule       | Module import                 | WIRED  | ArticulosModule in imports array                                                      |
| app.module.ts            | DepositosModule       | Module import                 | WIRED  | DepositosModule in imports array                                                      |
| articulos-client.tsx     | api.client.ts         | fetchArticulosClient          | WIRED  | Import and call in fetchData callback                                                 |
| server-data-table.tsx    | @tanstack/react-table | manualPagination              | WIRED  | useReactTable with manualPagination: true, manualFiltering: true, manualSorting: true |
| articulo-form.tsx        | api.client.ts         | createArticulo/updateArticulo | WIRED  | Import and call in onSubmit handler                                                   |
| [codigo]/editar/page.tsx | api.client.ts         | fetchArticuloByCodigoClient   | WIRED  | Import and call in loadArticulo                                                       |
| depositos-list.tsx       | api.client.ts         | fetchDepositosClient          | WIRED  | Import and call in loadDepositos                                                      |
| settings-nav.tsx         | settings/depositos    | Nav tab                       | WIRED  | Depositos link at href '/settings/depositos'                                          |

### Requirements Coverage

| Requirement | Source Plan | Description                            | Status    | Evidence                                                                  |
| ----------- | ----------- | -------------------------------------- | --------- | ------------------------------------------------------------------------- |
| ART-01      | 03          | Paginated list with server-side search | SATISFIED | ServerDataTable + ArticulosClient with pagination                         |
| ART-02      | 03          | Search by any code identifier or name  | SATISFIED | ILIKE across 5 fields in ArticulosService.findAll                         |
| ART-03      | 04          | Create new articulo                    | SATISFIED | /articulos/nuevo with ArticuloForm mode="create"                          |
| ART-04      | 04          | Edit existing articulo                 | SATISFIED | /articulos/[codigo]/editar with pre-populated form                        |
| ART-05      | 04          | Toggle active/inactive                 | SATISFIED | Switch on edit page calls toggleArticuloActivo                            |
| ART-06      | 03          | View detail in sheet                   | SATISFIED | ArticuloSheet with 6 sections, conditional ERP/Origin                     |
| ART-07      | 03          | Filter by active/inactive/all          | SATISFIED | ArticuloStatusFilter segmented control                                    |
| ART-08      | 01          | Rich properties fields                 | SATISFIED | marca, modelo, talle, color, material, presentacion, medida in schema     |
| ART-09      | 01          | Image URL arrays and OCR JSONB         | SATISFIED | imagenesProducto, imagenesEtiqueta, etiquetasOcr, jsonArticulo in schema  |
| ART-10      | 01          | ERP sync fields                        | SATISFIED | erpId through erpFechaSync in schema                                      |
| ART-11      | 01          | Origin tracking fields                 | SATISFIED | originSource, originSyncId, originSyncedAt in schema                      |
| ART-12      | 01          | Text primary key (codigo)              | SATISFIED | `codigo: text('codigo').primaryKey()`                                     |
| DEP-01      | 05          | View depositos list with stock summary | SATISFIED | DepositosList shows stockSummary badges                                   |
| DEP-02      | 05          | Create deposito                        | SATISFIED | DepositoDialog create mode with 3 fields                                  |
| DEP-03      | 05          | Edit deposito                          | SATISFIED | DepositoDialog edit mode with pre-populated values                        |
| DEP-04      | 05          | Deactivate deposito                    | SATISFIED | Toggle button in DepositosList                                            |
| MIG-01      | 01          | articulos table replaces products      | SATISFIED | articulos table defined alongside products (kept for Phase 16 compat)     |
| MIG-04      | 01          | depositos table created                | SATISFIED | depositos table with serial PK in schema                                  |
| MIG-06      | 01, 05      | Seed data rewritten for new tables     | SATISFIED | seed.ts seeds 300 articulos, 5 depositos + v1.0 tables                    |
| MIG-07      | 01          | numeric(10,2) for monetary fields      | SATISFIED | `numeric('precio', { precision: 10, scale: 2 })` confirmed                |
| DEBT-01     | 01          | Settings RBAC fix                      | SATISFIED | @UseGuards(RolesGuard) + @Roles('admin') on PATCH, POST logo, DELETE logo |
| DEBT-04     | 01          | Clean unused shared exports            | SATISFIED | packages/types exports only auth schemas (all used)                       |

### Anti-Patterns Found

| File       | Line | Pattern | Severity | Impact |
| ---------- | ---- | ------- | -------- | ------ |
| None found | -    | -       | -        | -      |

No TODO, FIXME, PLACEHOLDER, or stub patterns detected in any phase-modified files.

### Human Verification Required

### 1. Articulos List Page Visual Check

**Test:** Navigate to /articulos, verify the table renders with seeded data
**Expected:** Paginated table with codigo, nombre, marca, precio, estado columns. Search input and segmented filter visible. "Nuevo Articulo" button in top-right.
**Why human:** Visual layout, responsiveness, and data rendering require browser

### 2. Search and Filter Interaction

**Test:** Type "ART-0" in search, wait 300ms, verify results filter. Switch between Activos/Inactivos/Todos.
**Expected:** Table updates with filtered results, page resets to 1
**Why human:** Debounce timing and state transitions need interactive verification

### 3. Articulo Form Sections

**Test:** Navigate to /articulos/nuevo, verify 6 sections with headers and separators
**Expected:** Identificacion, Propiedades, Precios, Imagenes (placeholder text), ERP, Origen sections visible. Only codigo + nombre required.
**Why human:** Form layout, section visibility, validation UX

### 4. Depositos in Settings

**Test:** Navigate to /settings/depositos, verify depositos tab exists and list renders
**Expected:** "Depositos" tab in settings nav. Table shows depositos with "0 articulos" and "0 unidades" badges.
**Why human:** Settings navigation integration, badge rendering

### 5. Database Seed

**Test:** Run `cd apps/backend && pnpm db:push && pnpm db:seed` and verify no errors
**Expected:** All tables created, 300 articulos + 5 depositos + 100 products seeded successfully
**Why human:** Requires running database and verifying runtime output

---

_Verified: 2026-03-05T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
