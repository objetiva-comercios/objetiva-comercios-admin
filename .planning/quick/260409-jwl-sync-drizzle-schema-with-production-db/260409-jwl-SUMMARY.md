---
plan: 260409-jwl
one_liner: Synced Drizzle schema with production DB — updated articulos types, added missing columns, created migration SQL for 15+ tables
status: complete
commits:
  - 375014b: 'feat(quick-260409-jwl): update Drizzle schema to match production DB'
  - ee01a8b: 'feat(quick-260409-jwl): fix TypeScript compilation for schema changes'
  - ab23b75: 'feat(quick-260409-jwl): add idempotent production SQL migration'
deviations:
  - 'Auto-fix: dashboard.service.ts LowStockItem.articuloNombre type changed to string|null (nombre now nullable)'
---

# Quick Task 260409-jwl: Sync Drizzle Schema with Production DB

## What Changed

### Task 1: Update Drizzle Schema (375014b)

- `apps/backend/src/db/schema.ts`: Updated articulos table to match production DB
  - Changed all varchar fields to text (production uses text everywhere)
  - Changed jsonb image fields to text[] arrays (matching production)
  - Fixed nombre and activo to be nullable (matching production)
  - Removed numeric precision (production uses numeric without scale)
  - Added 15 missing columns: codigoEquivalencia, nombreCorto, descripcion, descripcionWeb, rubro, subrubro, adjetivo, propAux1-5, unidades, erpCreado, erpActualizado, imagenesProductoProcesadas

### Task 2: Fix TypeScript Compilation (ee01a8b)

- `apps/backend/src/modules/articulos/articulos-imagenes.service.ts`: Updated image array type casts
- `apps/backend/src/modules/articulos/dto/create-articulo.dto.ts`: Added new fields, removed MaxLength decorators
- `apps/backend/src/modules/articulos/dto/update-articulo.dto.ts`: Same updates
- `apps/backend/src/modules/dashboard/dashboard.service.ts`: Fixed LowStockItem type for nullable nombre
- `apps/web/src/types/articulo.ts`: Updated frontend Articulo type with all production fields

### Task 3: Production SQL Migration (ab23b75)

- `apps/backend/src/db/migration-prod.sql`: Idempotent migration script with 68 IF NOT EXISTS statements
  - Creates business_settings table
  - Adds categoria/subcategoria columns to articulos
  - Creates all admin-app tables: orders, sales, purchases (+ items), depositos, existencias, inventarios, api_keys, webhooks, webhook_deliveries

## Pending Actions

- Run migration-prod.sql on production DB
- Rebuild Docker images
- Redeploy containers
