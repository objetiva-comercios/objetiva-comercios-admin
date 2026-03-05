---
phase: 14-schema-foundation-articulos-depositos
plan: 01
subsystem: database
tags: [drizzle, postgres, schema, articulos, depositos, seed, rbac, numeric]

requires:
  - phase: v1.0
    provides: existing Drizzle schema with products/orders/sales/purchases tables
provides:
  - articulos table definition with text PK and ~30 fields
  - depositos table definition with serial PK
  - Articulo/NewArticulo/Deposito/NewDeposito type exports
  - Seed generators for articulos (300) and depositos (5)
  - Settings RBAC on write endpoints
affects: [14-02, 14-03, 14-04, 14-05, 15, 16]

tech-stack:
  added: [numeric(10, 2), jsonb, boolean from drizzle-orm/pg-core]
  patterns: [text PK for articulos, jsonb arrays for images, batch inserts for large seed data]

key-files:
  created:
    - apps/backend/src/db/generators/articulo.generator.ts
    - apps/backend/src/db/generators/deposito.generator.ts
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/modules/settings/settings.controller.ts
    - packages/types/src/index.ts

key-decisions:
  - 'Text PK (codigo) for articulos matches ERP model — no auto-increment'
  - 'Batch insert articulos in groups of 100 to avoid Postgres parameter limit'
  - 'Removed User and ApiResponse from @objetiva/types (unused exports per DEBT-04)'
  - 'Kept emailSchema and passwordSchema exported — used internally by loginSchema/signupSchema'

patterns-established:
  - 'Text PK pattern: articulos.codigo as text primary key for ERP-compatible entities'
  - 'JSONB arrays: imagenesProducto/imagenesEtiqueta typed as string[] with default []'
  - 'Numeric monetary: numeric(10,2) for precio/costo fields instead of doublePrecision'

requirements-completed:
  [MIG-01, MIG-04, MIG-06, MIG-07, ART-08, ART-09, ART-10, ART-11, ART-12, DEBT-01, DEBT-04]

duration: 5min
completed: 2026-03-05
---

# Phase 14 Plan 01: Schema Foundation Summary

**Drizzle articulos table (text PK, 30+ fields, numeric monetary) and depositos table with seed generators, Settings RBAC fix, and shared types cleanup**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T14:00:43Z
- **Completed:** 2026-03-05T14:05:16Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Articulos table with text PK (codigo), 6 field groups (identification, properties, prices, images, ERP, origin), numeric(10,2) for monetary, 6 indexes
- Depositos table with serial PK, 5 fields, activo index
- Seed generators producing 300 articulos and 5 depositos with realistic Mexican commerce data
- Settings write endpoints (PATCH, POST logo, DELETE logo) secured with @Roles('admin')
- Removed unused User/ApiResponse exports from @objetiva/types

## Task Commits

Each task was committed atomically:

1. **Task 1: Define articulos and depositos tables in Drizzle schema** - `402ff99` (feat)
2. **Task 2: Create generators and rewrite seed for articulos + depositos** - `da7eced` (feat)
3. **Task 3: Fix Settings RBAC and clean unused shared exports** - `717ebce` (fix)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` - Added articulos (text PK, ~30 fields) and depositos tables with type exports
- `apps/backend/src/db/generators/articulo.generator.ts` - Faker-based generator for 300 articulos
- `apps/backend/src/db/generators/deposito.generator.ts` - Static generator for 5 named depositos
- `apps/backend/src/db/seed.ts` - Rewritten to seed articulos/depositos + reduced v1.0 counts
- `apps/backend/src/modules/settings/settings.controller.ts` - Added RBAC guards on write endpoints
- `packages/types/src/index.ts` - Removed unused User interface and ApiResponse generic

## Decisions Made

- Text PK (codigo) for articulos matches ERP model — sequential "ART-001" format for seed data
- Batch insert articulos in groups of 100 to avoid Postgres parameter limit on 30+ column inserts
- Removed User and ApiResponse from @objetiva/types — confirmed unused via codebase-wide grep
- Kept emailSchema/passwordSchema exported since they're consumed internally by loginSchema/signupSchema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema foundation complete for articulos and depositos
- Plan 02 can build CRUD modules on top of these table definitions
- db:push + db:seed will create and populate the new tables (runtime verification in Plan 02)
- Settings endpoints properly secured for Phase 14 and beyond

---

_Phase: 14-schema-foundation-articulos-depositos_
_Completed: 2026-03-05_
