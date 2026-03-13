---
phase: 19-articulos-crud-completo
plan: 02
subsystem: web
tags: [articulos, edit-page, sheet, alert-dialog, collapsible, jsonb]

# Dependency graph
requires:
  - phase: 19-articulos-crud-completo
    plan: 01
    provides: AlertDialog toggle pattern established in table
provides:
  - Edit page uses AlertDialog for toggle (consistent with table)
  - Detail sheet shows JSONB data (erpDatos, jsonArticulo) in collapsible section
  - Detail sheet shows etiquetasOcr as badge chips
affects: [articulo-sheet, edit-page]

# Tech tracking
tech-stack:
  added:
    - '@radix-ui/react-collapsible (shadcn collapsible component)'
  patterns:
    - 'Collapsible section for raw data: ChevronRight rotation on open, max-height scroll'
    - 'Conditional JSONB rendering: only show sections when data is non-null'

key-files:
  created:
    - apps/web/src/components/ui/collapsible.tsx
  modified:
    - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx

key-decisions:
  - 'Replaced Switch with AlertDialog on edit page for UX consistency with table toggle'
  - 'JSONB sections (erpDatos, jsonArticulo) rendered as formatted JSON in collapsible, not parsed into fields'
  - 'etiquetasOcr shown as Badge chips with outline variant'
  - 'Collapsible starts closed to avoid visual noise from raw data'

patterns-established:
  - 'CollapsibleSection pattern: ChevronRight icon rotates 90deg on open via data-state attribute'
  - 'Raw data display: pre tag with bg-muted, max-h-48 overflow-y-auto'

requirements-completed: [ART-01, ART-02, ART-03]

# Metrics
duration: ~15min
completed: 2026-03-10
---

# Phase 19 Plan 02: Edit Page AlertDialog + Sheet JSONB Sections

**Replaced Switch toggle on edit page with AlertDialog confirmation; added collapsible JSONB sections and etiquetasOcr chips to detail sheet**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-10
- **Tasks:** 2
- **Files modified:** 3 (+ 1 created)

## Accomplishments

- Installed shadcn Collapsible component (`apps/web/src/components/ui/collapsible.tsx`)
- Replaced Switch + Loader2 toggle on edit page with Button + AlertDialog (contextual Desactivar/Reactivar messages)
- Removed `toggling` state, added `showToggleDialog` state
- Added etiquetasOcr section to ArticuloSheet — renders tags as `Badge variant="outline"` chips in flex-wrap
- Added "Datos crudos" collapsible section to ArticuloSheet — formatted JSON for erpDatos and jsonArticulo
- Both JSONB sections only render when data is present (non-null)
- Collapsible uses ChevronRight with CSS rotation on `[data-state=open]`

## Task Commits

1. **Task 1: Replace Switch with AlertDialog + install Collapsible** — `d2a36a4`
2. **Task 2: Add JSONB sections to ArticuloSheet** — `d2a36a4` (same commit)

## Files Created/Modified

- `apps/web/src/components/ui/collapsible.tsx` — New shadcn Collapsible component
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — AlertDialog replaces Switch for toggle
- `apps/web/src/components/articulos/articulo-sheet.tsx` — etiquetasOcr chips + collapsible JSONB sections

## Decisions Made

- Both tasks committed together as they were implemented in a single pass
- Collapsible starts closed by default — raw JSON is useful but secondary information

## Deviations from Plan

None significant — both tasks in plan implemented as specified.

## Issues Encountered

None.

---

_Phase: 19-articulos-crud-completo_
_Completed: 2026-03-10_
