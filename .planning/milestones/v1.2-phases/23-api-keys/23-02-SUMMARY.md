---
phase: 23-api-keys
plan: 02
subsystem: ui
tags: [next.js, shadcn-ui, tabler, api-keys, settings, react]

requires:
  - phase: 23-api-keys-01
    provides: Backend endpoints POST/GET/DELETE /api/api-keys with SHA-256 hashed keys

provides:
  - Settings > API Keys page (server component with admin-only guard)
  - ApiKeysClient component (table + create dialog + revoke dialog)
  - api.client.ts functions fetchApiKeys, createApiKey, revokeApiKey
  - Settings layout upgraded to async server component passing userRole to nav
  - SettingsNav upgraded to conditionally show API Keys item for admin only

affects: [phase-24-webhooks, any future settings pages needing role-based nav items]

tech-stack:
  added: []
  patterns:
    - 'Settings layout as async Server Component fetching user role from Supabase, passed to client nav'
    - 'Two-step dialog flow for sensitive data (form -> reveal with copy, prevent accidental close)'
    - 'Server-side notFound() guard for admin-only pages (viewers get 404, not redirect)'

key-files:
  created:
    - apps/web/src/app/(dashboard)/settings/api-keys/page.tsx
    - apps/web/src/components/settings/api-keys/api-keys-client.tsx
  modified:
    - apps/web/src/lib/api.client.ts
    - apps/web/src/app/(dashboard)/settings/layout.tsx
    - apps/web/src/components/settings/settings-nav.tsx

key-decisions:
  - 'Two-step create dialog: onOpenChange blocked during reveal step to prevent accidental key loss'
  - 'notFound() for viewer on /settings/api-keys (not redirect) — 404 is the correct HTTP semantics for unauthorized resource access'
  - 'Simple HTML table (not TanStack) for API keys — few rows expected, no sorting/pagination needed'

patterns-established:
  - 'Admin-only pages: Server Component checks role -> notFound() if not admin'
  - 'Settings nav items filtered at render time via userRole prop from layout'

requirements-completed: [APIKEY-01, APIKEY-02]

duration: 5min
completed: 2026-03-12
---

# Phase 23 Plan 02: API Keys Frontend Summary

**Admin-only Settings > API Keys page with two-step create dialog (name -> full key reveal + copy) and revoke AlertDialog, guarded server-side with notFound() for non-admin users**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-12T12:39:25Z
- **Completed:** 2026-03-12T12:44:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Settings layout converted to async Server Component that fetches `userRole` from Supabase and passes it to `SettingsNav`
- `SettingsNav` updated to accept `userRole` prop and conditionally show API Keys nav item only for admins
- `/settings/api-keys` server page guards with `notFound()` for non-admin (viewers get 404, unauthenticated get redirect to login)
- `ApiKeysClient` full interactive component: table with name/prefix/createdAt/lastUsedAt/revoke, two-step create dialog, revoke AlertDialog
- Three new `api.client.ts` functions with proper TypeScript interfaces (`ApiKeyItem`, `ApiKeyCreated`)

## Task Commits

Each task was committed atomically:

1. **Task 1: API client functions + Settings nav + layout role prop** - `8835b39` (feat)
2. **Task 2: API Keys page + client component** - `64b58d9` (feat)

## Files Created/Modified

- `apps/web/src/lib/api.client.ts` — Added `ApiKeyItem`, `ApiKeyCreated` interfaces and `fetchApiKeys`, `createApiKey`, `revokeApiKey` functions
- `apps/web/src/app/(dashboard)/settings/layout.tsx` — Converted to async server component, fetches userRole, passes to SettingsNav
- `apps/web/src/components/settings/settings-nav.tsx` — Added `userRole` prop, Key icon import, API Keys nav item with admin-only filter
- `apps/web/src/app/(dashboard)/settings/api-keys/page.tsx` — New: server page with notFound() guard for non-admin
- `apps/web/src/components/settings/api-keys/api-keys-client.tsx` — New: full interactive client component

## Decisions Made

- `onOpenChange` blocked during reveal step to prevent accidental close losing the full key before user copies it
- `notFound()` used instead of redirect for viewer accessing admin page — 404 is correct HTTP semantics
- Plain HTML table (not TanStack Table) for API keys list — low row count, no pagination/sorting needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full API Keys frontend complete (admin CRUD via Settings > API Keys)
- Phase 23 complete — both backend (23-01) and frontend (23-02) shipped
- Ready for Phase 24 (Webhooks) or any follow-on work

---

_Phase: 23-api-keys_
_Completed: 2026-03-12_
