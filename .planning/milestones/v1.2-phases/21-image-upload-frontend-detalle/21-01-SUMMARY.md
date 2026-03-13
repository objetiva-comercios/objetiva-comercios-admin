---
phase: 21-image-upload-frontend-detalle
plan: 01
subsystem: ui
tags: [react, nextjs, drag-and-drop, file-upload, articulos, imagen]

requires:
  - phase: 20-image-upload-backend
    provides: POST /api/articulos/:codigo/imagenes and DELETE /api/articulos/:codigo/imagenes/:tipo/:slot endpoints returning updated Articulo

provides:
  - ImagenSlot component with HTML5 DnD, click-to-upload, skeleton feedback, thumbnail preview, and delete
  - ImagenSlotGrid wrapper (3 etiqueta + 6 producto slots)
  - uploadArticuloImagen and deleteArticuloImagen API client functions
  - Edit page with functional image grids replacing ImagePlaceholderGrid

affects:
  - 21-02 (lightbox/preview — onPreview callback already wired as noop)
  - articulo-form.tsx (depends on Articulo type having nullable image arrays)

tech-stack:
  added: []
  patterns:
    - HTML5 DnD handlers with child-element false-positive guard on onDragLeave using e.currentTarget.contains(e.relatedTarget)
    - Thumb URL derived by string convention (_detail.webp → _thumb.webp) without extra API call
    - Optimistic state refresh via onUpdated={setArticulo} — backend returns full updated Articulo on every upload/delete

key-files:
  created:
    - apps/web/src/components/articulos/imagen-slot.tsx
    - apps/web/src/components/articulos/imagen-slot-grid.tsx
  modified:
    - apps/web/src/types/articulo.ts
    - apps/web/src/lib/api.client.ts
    - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx

key-decisions:
  - 'Slot labels hardcoded in SLOT_LABELS map for both tipos — avoids runtime string generation'
  - "Input ref reset after file selection (e.target.value = '') to allow re-selecting same file"
  - 'onPreview wired as noop (_index => {}) in edit page — lightbox deferred to Plan 02'

patterns-established:
  - 'ImagenSlot: upload replaces directly without confirmation (per user decision)'
  - 'Delete uses e.stopPropagation() to prevent triggering image preview click'
  - 'API client upload: no Content-Type header — browser sets multipart boundary automatically'

requirements-completed: [IMG-01, IMG-02, IMG-04]

duration: 15min
completed: 2026-03-12
---

# Phase 21 Plan 01: Image Upload Frontend — ImagenSlot + ImagenSlotGrid Summary

**Drag-and-drop image slot grid with upload, thumbnail preview, and delete for 9 articulo image slots (6 producto + 3 etiqueta) wired to Phase 20 backend endpoints**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-12T01:49:00Z
- **Completed:** 2026-03-12T02:04:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `ImagenSlot` component with HTML5 DnD (drag-over highlight, drop upload), click-to-open-file-picker, skeleton+spinner during upload, thumbnail display with label overlay, and delete button with hover reveal
- Created `ImagenSlotGrid` wrapper rendering a labeled grid of 3 or 6 `ImagenSlot` components depending on `tipo`
- Added `uploadArticuloImagen` and `deleteArticuloImagen` to `api.client.ts` following the existing `uploadLogo` pattern (no Content-Type header for multipart)
- Updated `Articulo` type `imagenesProducto/Etiqueta` from `string[]` to `(string | null)[]` to correctly represent sparse slot arrays
- Replaced `ImagePlaceholderGrid` placeholder in edit page with two functional `ImagenSlotGrid` instances

## Task Commits

Each task was committed atomically:

1. **Task 1: API client functions + Articulo type fix + ImagenSlot + ImagenSlotGrid components** - `3450489` (feat)
2. **Task 2: Integrate image grid into edit page replacing ImagePlaceholderGrid** - `4461007` (feat)

## Files Created/Modified

- `apps/web/src/types/articulo.ts` - imagenesProducto/Etiqueta changed to `(string | null)[]`
- `apps/web/src/lib/api.client.ts` - Added uploadArticuloImagen and deleteArticuloImagen functions
- `apps/web/src/components/articulos/imagen-slot.tsx` - Individual slot with DnD, upload, preview, delete (created)
- `apps/web/src/components/articulos/imagen-slot-grid.tsx` - Grid wrapper component (created)
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` - Replaced placeholder with functional grids

## Decisions Made

- `onPreview` wired as noop in the edit page (`_index => {}`) — lightbox deferred to Plan 02 as planned
- `SLOT_LABELS` map hardcoded for both tipos rather than generating strings at runtime — cleaner and avoids string computation on every render
- Input `ref.current.value = ''` reset in onChange handler so users can re-select the same file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Functional image upload/delete working in edit page with toast feedback
- `onPreview` callback already wired and ready for Plan 02 lightbox implementation
- TypeScript compiles clean with no errors

---

_Phase: 21-image-upload-frontend-detalle_
_Completed: 2026-03-12_
