---
phase: 25-wire-frontend-soft-delete-verify
plan: 01
subsystem: ui
tags: [nextjs, soft-delete, webhooks, api-client]

# Dependency graph
requires:
  - phase: 19-articulos-crud-completo
    provides: ArticulosClient, editar/page.tsx, articulos-client.tsx with toggle dialog
  - phase: 24-webhooks
    provides: softDelete() emits articulo.deleted via WebhooksListener

provides:
  - deleteArticulo() exported from api.client.ts (DELETE /api/articulos/:codigo)
  - Conditional soft-delete wiring in articulos-client.tsx handleConfirmToggle
  - Conditional soft-delete + redirect wiring in editar/page.tsx handleConfirmToggle
  - Phase 19 VERIFICATION.md with code evidence for ART-01 through ART-04

affects: [any future phase touching articulos toggle/delete behavior]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DELETE endpoint used for deactivation (emits articulo.deleted), PATCH toggle for reactivation (emits articulo.updated)
    - Toast fires before router.push() to prevent toast loss on unmount

key-files:
  created:
    - .planning/phases/19-articulos-crud-completo/VERIFICATION.md
  modified:
    - apps/web/src/lib/api.client.ts
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx
    - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx

key-decisions:
  - 'deleteArticulo() added to api.client.ts — DELETE endpoint returns 200 with body so response.json() is correct'
  - "Toast fires before router.push('/articulos') in editar/page.tsx to prevent toast loss on component unmount"
  - 'Conditional logic: active articles use DELETE (emits articulo.deleted), inactive use PATCH toggle (emits articulo.updated)'

patterns-established:
  - 'Soft-delete via DELETE endpoint (not PATCH): consistent distinction between delete (activo=false + deleted event) and toggle (flip activo + updated event)'

requirements-completed: [ART-01, ART-02, ART-03, ART-04]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 25 Plan 01: Wire Frontend Soft-Delete + Verify Summary

**`deleteArticulo()` wired in frontend — deactivating articles now calls DELETE /api/articulos/:codigo (triggers articulo.deleted webhook), plus Phase 19 VERIFICATION.md documenting code evidence for ART-01 through ART-04**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T21:25:21Z
- **Completed:** 2026-03-12T21:28:30Z
- **Tasks:** 2
- **Files modified:** 4 (3 frontend + 1 planning doc)

## Accomplishments

- Added `deleteArticulo()` to api.client.ts following the existing `deleteArticuloImagen()` pattern (DELETE with encodeURIComponent, returns body)
- Wired conditional soft-delete in both `articulos-client.tsx` and `editar/page.tsx`: active → DELETE endpoint, inactive → PATCH toggle
- Edit page now redirects to /articulos after deactivation (toast fires before push to avoid unmount loss)
- Created VERIFICATION.md for Phase 19 documenting full code evidence for ART-01 to ART-04, including complete webhook flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire deleteArticulo in api.client.ts and update UI handlers** - `40e9eb4` (feat)
2. **Task 2: Create Phase 19 VERIFICATION.md for ART-01 through ART-04** - `1cf36b4` (docs)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `apps/web/src/lib/api.client.ts` - Added `deleteArticulo()` export (lines 173-180)
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` - Import `deleteArticulo`, conditional in handleConfirmToggle
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` - Import `deleteArticulo`, conditional + redirect in handleConfirmToggle
- `.planning/phases/19-articulos-crud-completo/VERIFICATION.md` - Code evidence for ART-01 through ART-04 with PASSED status

## Decisions Made

- Toast fires before `router.push('/articulos')` in editar/page.tsx — Next.js App Router may unmount the component on navigation, which would prevent toasts shown after push from displaying
- `deleteArticulo()` follows exact pattern of `deleteArticuloImagen()` (no Content-Type header for DELETE, uses `headers` directly)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Soft-delete is now fully wired end-to-end: UI confirmation → DELETE endpoint → softDelete() service → articulo.deleted event → WebhooksListener → dispatchEvent
- Requirements ART-01 through ART-04 are formally verified with code evidence
- Phase 25 plan 01 is the only plan in this phase — phase is complete

---

_Phase: 25-wire-frontend-soft-delete-verify_
_Completed: 2026-03-12_
