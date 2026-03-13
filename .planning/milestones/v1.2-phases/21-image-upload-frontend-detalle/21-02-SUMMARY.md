---
phase: 21-image-upload-frontend-detalle
plan: 02
subsystem: ui
tags: [react, nextjs, radix-ui, lightbox, dialog, image-preview]

# Dependency graph
requires:
  - phase: 21-image-upload-frontend-detalle
    plan: 01
    provides: ImagenSlotGrid with onPreview callback, Articulo type with imagenesProducto/imagenesEtiqueta arrays

provides:
  - ImagenLightbox component with Radix Dialog, keyboard arrow navigation, position indicator
  - Edit page wired with per-type lightbox (etiqueta/producto filtered independently)
  - ArticuloSheet images section showing thumbnails, separated by type, clickable to lightbox
  - Empty state for articles without images (grey placeholder grid)

affects:
  - Future phases using image preview or lightbox patterns
  - ArticuloSheet consumers expecting images section

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Lightbox controlled by { images, initialIndex } | null state — null means closed
    - URL filtering by type before passing to lightbox ensures type-scoped navigation
    - detail URL → thumb URL derived by string convention (_detail.webp → _thumb.webp)
    - Visually-hidden DialogTitle via sr-only class for Radix Dialog accessibility

key-files:
  created:
    - apps/web/src/components/articulos/imagen-lightbox.tsx
  modified:
    - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx

key-decisions:
  - 'Lightbox navigation scoped by type (etiqueta vs producto) — parent filters before passing images array'
  - 'sr-only class used for visually-hidden DialogTitle instead of @radix-ui/react-visually-hidden (not in deps)'
  - 'ArticuloSheet shows only occupied image slots filtered with u != null'

patterns-established:
  - 'Lightbox state pattern: { images: string[], initialIndex: number } | null — null=closed, object=open'
  - 'getThumbUrl(detailUrl) helper: replace _detail.webp with _thumb.webp'
  - "API_BASE_URL constant: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'"

requirements-completed: [VIEW-02]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 21 Plan 02: Image Upload Frontend — Lightbox + Sheet Summary

**Fullscreen image lightbox with keyboard navigation and type-scoped arrows, plus read-only images section in ArticuloSheet showing thumbnails grouped by Etiquetas/Productos**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T02:07:19Z
- **Completed:** 2026-03-12T02:10:44Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- ImagenLightbox component: Radix Dialog fullscreen, keyboard ArrowLeft/ArrowRight navigation, position indicator (N/M), Escape via Radix native
- Edit page: lightbox wired per slot type — clicking a producto/etiqueta thumbnail opens lightbox with only that type's images
- ArticuloSheet: images section after stat cards showing compact 4-col thumbnail grid, separated into Etiquetas and Productos subsections; empty state with grey placeholder icons when no images

## Task Commits

1. **Task 1: ImagenLightbox + edit page wiring** - `16b3d9a` (feat)
2. **Task 2: ArticuloSheet images section** - `2c178f6` (feat)

## Files Created/Modified

- `apps/web/src/components/articulos/imagen-lightbox.tsx` - Reusable lightbox with Dialog, keyboard nav, position indicator
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` - openLightbox helper, ImagenLightbox rendered, onPreview wired
- `apps/web/src/components/articulos/articulo-sheet.tsx` - Images section with thumbnails by type, lightbox state and ImagenLightbox rendered

## Decisions Made

- `@radix-ui/react-visually-hidden` is not in project dependencies — used `sr-only` Tailwind class on `DialogTitle` instead (same accessibility result, no new dep)
- Lightbox images array passed from parent already filtered by type (null slots removed), keeping ImagenLightbox purely presentational
- ArticuloSheet `openLightboxForType` takes the clicked detail URL directly and finds its index among non-null URLs of that type

## Deviations from Plan

None - plan executed exactly as written (one minor adaptation: sr-only instead of VisuallyHidden from missing package, equivalent outcome).

## Issues Encountered

- `@radix-ui/react-visually-hidden` not installed — used `className="sr-only"` on DialogTitle instead. Same accessibility behavior (visually hidden, accessible to screen readers).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 21 complete: image upload frontend (slot grid + lightbox + sheet integration) fully functional
- Lightbox pattern established for reuse in future image-heavy features
- TypeScript clean (0 errors), ESLint + Prettier passing (enforced by pre-commit hook)

---

_Phase: 21-image-upload-frontend-detalle_
_Completed: 2026-03-12_

## Self-Check: PASSED

- `apps/web/src/components/articulos/imagen-lightbox.tsx` — FOUND
- Commit `16b3d9a` — FOUND
- Commit `2c178f6` — FOUND
- TypeScript: 0 errors
