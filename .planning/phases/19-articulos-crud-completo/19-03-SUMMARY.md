---
phase: 19-articulos-crud-completo
plan: 03
subsystem: backend, web
tags: [articulos, settings, field-visibility, jsonb, config]

# Dependency graph
requires:
  - phase: 19-articulos-crud-completo
    plan: 01
    provides: getColumns factory pattern for table columns
  - phase: 19-articulos-crud-completo
    plan: 02
    provides: ArticuloSheet and edit page structure
provides:
  - Global field visibility configuration for articulos
  - Settings page at /settings/articulos with 4 toggle groups
  - useArticulosConfig hook with module-level cache
  - All article UI components respect visibility config
affects: [articulo-form, articulo-sheet, articulos-columns, articulos-client, settings]

# Tech tracking
tech-stack:
  added:
    - 'class-transformer (nested DTO validation in NestJS)'
  patterns:
    - 'JSONB config column: store structured config as JSONB with typed defaults'
    - 'Module-level cache hook: avoid SWR dependency with simple Promise cache'
    - 'Conditional field rendering: isCampoVisible() guard on each toggleable field'

key-files:
  created:
    - apps/backend/src/modules/settings/articulos-config.ts
    - apps/web/src/types/articulos-config.ts
    - apps/web/src/hooks/use-articulos-config.ts
    - apps/web/src/app/(dashboard)/settings/articulos/page.tsx
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/modules/settings/dto/update-settings.dto.ts
    - apps/web/src/types/settings.ts
    - apps/web/src/lib/api.client.ts
    - apps/web/src/components/settings/settings-nav.tsx
    - apps/web/src/components/articulos/articulo-form.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx
    - apps/web/src/components/articulos/articulos-columns.tsx
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx

key-decisions:
  - 'Config stored as JSONB in existing business_settings table — no new table needed'
  - 'Hiding fields only affects UI, never deletes data from database'
  - 'Module-level cache instead of SWR — avoids adding dependency, sufficient for config that rarely changes'
  - 'PATCH sends full camposVisibles object (not partial) to avoid deep merge complexity'
  - 'Always-visible fields: codigo, nombre, precioVenta, estado — not toggleable'
  - 'Default OFF: talle, color, material (uncommon fields)'
  - 'getColumns accepts optional camposVisibles to filter columns entirely (not just hide via visibility)'

patterns-established:
  - 'Settings config pattern: JSONB column + typed defaults + nested DTO validation + frontend hook'
  - 'isCampoVisible guard: wrap JSX with conditional check, section-level and field-level'
  - 'invalidateArticulosConfig: manual cache bust after saving settings'

requirements-completed: [ART-01, ART-02, VIEW-01]

# Metrics
duration: ~45min
completed: 2026-03-11
---

# Phase 19 Plan 03: Articulos Field Visibility Configuration

**Added global settings page for toggling article field visibility; config persisted as JSONB in business_settings, consumed by form, sheet, columns, and list via useArticulosConfig hook**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-03-11
- **Tasks:** 12 (4 chunks)
- **Files created:** 4
- **Files modified:** 9
- **Commits:** 8 (98d03d0..dee3281)

## Accomplishments

### Backend

- Created `ArticulosConfig` types and `DEFAULT_ARTICULOS_CONFIG` with 13 toggleable campos
- Added `articulosConfig` JSONB column to `businessSettings` schema with typed default
- Extended `UpdateSettingsDto` with nested `ArticulosConfigDto` using class-validator + class-transformer
- Generated and applied Drizzle migration with UPDATE for existing rows

### Frontend — Infrastructure

- Created frontend types mirroring backend (`CamposVisibles`, `ArticulosConfig`, `CAMPOS_LABELS`)
- Added `articulosConfig` field to `BusinessSettings` type
- Added `fetchSettingsClient()` function to api.client.ts
- Updated `updateSettings()` signature to accept `articulosConfig`
- Created `useArticulosConfig` hook with module-level Promise cache and `invalidateArticulosConfig()` bust

### Frontend — Settings Page

- Created `/settings/articulos` page with 4 toggle groups (Propiedades fisicas, Identificacion, Precios, Secciones)
- Added "Articulos" nav item to settings-nav.tsx with Package icon

### Frontend — Consumers

- ArticuloForm: wraps each toggleable field with `isCampoVisible()`, hides sections when all fields hidden
- ArticuloSheet: hides stat cards, field rows, collapsible sections based on config; conditional SKU in description
- ArticulosColumns: `getColumns` accepts optional `camposVisibles`, filters out disabled columns entirely
- ArticulosClient: passes `camposVisibles` from hook to `getColumns`

## Task Commits

1. `98d03d0` — feat(settings): add ArticulosConfig types and defaults
2. `94e3d8b` — feat(schema): add articulosConfig JSONB column to businessSettings
3. `55f54f7` — feat(settings): extend UpdateSettingsDto with nested articulosConfig validation
4. `6addb44` — feat(web): add ArticulosConfig types and update BusinessSettings
5. `1e5154f` — feat(web): add fetchSettingsClient and update updateSettings signature
6. `a97e217` — feat(web): add useArticulosConfig hook with module-level cache
7. `b27fe25` — feat(settings): add articulos field visibility config page
8. `dee3281` — feat(articulos): apply field visibility config to form, sheet, columns and list

## Decisions Made

- Implemented via superpowers framework (brainstorming → spec → plan → subagent-driven-development), then documented retroactively in GSD
- No SWR/React Query needed — module-level Promise cache is simpler and sufficient for settings that change rarely
- Sections hide entirely when all their fields are disabled (clean UI, no empty containers)

## Deviations from Plan

- Originally planned as part of Phase 22 (Vista Lista Configurable), but user decided to implement during Phase 19 as it affects the full article CRUD experience

## Issues Encountered

None — all 8 commits applied cleanly, build passes.

---

_Phase: 19-articulos-crud-completo_
_Completed: 2026-03-11_
