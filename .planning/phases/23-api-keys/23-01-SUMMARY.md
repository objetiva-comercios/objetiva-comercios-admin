---
phase: 23-api-keys
plan: 01
subsystem: auth
tags: [api-keys, jwt, nestjs, drizzle, postgres, bearer-token, sha256]

# Dependency graph
requires:
  - phase: 20-image-upload-backend
    provides: DrizzleService global module (DbModule @Global)
  - phase: 01-foundation
    provides: JwtAuthGuard, AuthenticatedUser types, @Public decorator, RolesGuard
provides:
  - apiKeys Drizzle table with keyHash, prefix, lastUsedAt, revokedAt
  - ApiKeysService (create, findAll, revoke, findByToken, updateLastUsed)
  - ApiKeysController with POST/GET/DELETE /api/api-keys (admin-only, JWT-only)
  - CompositeAuthGuard as global guard via APP_GUARD (JWT + API key)
affects: [23-api-keys-frontend, 24-webhooks]

# Tech tracking
tech-stack:
  added: [multer (runtime, was types-only)]
  patterns:
    [
      APP_GUARD provider pattern for DI-injected global guards,
      SHA-256 hashing for API key storage,
      fire-and-forget updateLastUsed via void promise,
    ]

key-files:
  created:
    - apps/backend/src/db/schema.ts (apiKeys table added)
    - apps/backend/src/modules/api-keys/api-keys.service.ts
    - apps/backend/src/modules/api-keys/api-keys.controller.ts
    - apps/backend/src/modules/api-keys/api-keys.module.ts
    - apps/backend/src/modules/api-keys/dto/create-api-key.dto.ts
    - apps/backend/src/common/guards/composite-auth.guard.ts
  modified:
    - apps/backend/src/main.ts (removed useGlobalGuards)
    - apps/backend/src/app.module.ts (added APP_GUARD + ApiKeysModule)

key-decisions:
  - 'API keys stored as SHA-256 hash of full key — plaintext never persisted'
  - 'Key format: obj_sk_{33 random hex chars}, prefix: obj_sk_...{last 4} for display'
  - 'CompositeAuthGuard tries JWT first, falls back to API key — preserves all existing JWT auth'
  - "API key auth sets userId='apikey:{name}' — allows controller to detect and block key escalation"
  - 'APP_GUARD (not useGlobalGuards) required for DI injection of ApiKeysService into guard'
  - 'lastUsedAt updated fire-and-forget (void promise) — never blocks request'

patterns-established:
  - 'APP_GUARD pattern: guards that need DI must use { provide: APP_GUARD, useClass: GuardClass } not app.useGlobalGuards()'
  - 'Composite guard: try JWT, catch silently, try API key, throw UnauthorizedException if both fail'
  - "Anti-escalation: userId.startsWith('apikey:') check in sensitive controllers"

requirements-completed: [APIKEY-01, APIKEY-02, APIKEY-03, APIKEY-04]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 23: API Keys Backend Summary

**NestJS API Keys module with SHA-256 hashing, CRUD endpoints, and CompositeAuthGuard replacing JwtAuthGuard as global guard via APP_GUARD**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T12:28:42Z
- **Completed:** 2026-03-12T12:36:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Drizzle schema extended with `api_keys` table (keyHash unique index, revokedAt index)
- ApiKeysService implements key generation (obj*sk* prefix + SHA-256 hashing), findByToken, fire-and-forget updateLastUsed
- ApiKeysController exposes POST/GET/DELETE /api/api-keys (admin-only + blocks API key escalation)
- CompositeAuthGuard registered as APP_GUARD — tries JWT verification, falls back to API key lookup
- Backend boots without errors, all 70+ routes registered including new /api/api-keys endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + ApiKeys module (service, controller, DTO)** - `b3788d4` (feat)
2. **Task 2: CompositeAuthGuard + guard migration from main.ts to APP_GUARD** - `bb2717e` (feat)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` - Added apiKeys table definition with indexes and type exports
- `apps/backend/src/modules/api-keys/api-keys.service.ts` - Key gen, hashing, CRUD, lookup, lastUsedAt
- `apps/backend/src/modules/api-keys/api-keys.controller.ts` - POST/GET/DELETE with anti-escalation check
- `apps/backend/src/modules/api-keys/api-keys.module.ts` - Module exporting ApiKeysService
- `apps/backend/src/modules/api-keys/dto/create-api-key.dto.ts` - CreateApiKeyDto with class-validator
- `apps/backend/src/common/guards/composite-auth.guard.ts` - JWT + API key composite global guard
- `apps/backend/src/main.ts` - Removed useGlobalGuards(JwtAuthGuard) line
- `apps/backend/src/app.module.ts` - Added APP_GUARD provider + ApiKeysModule import

## Decisions Made

- APP_GUARD used instead of `app.useGlobalGuards()` because CompositeAuthGuard needs `ApiKeysService` injected via DI — manual instantiation cannot resolve DI dependencies
- API key format `obj_sk_{33 hex chars}` gives ~40 chars total; prefix `obj_sk_...{last 4}` is display-only and NOT unique (as intended by plan)
- `updateLastUsed` is truly fire-and-forget: synchronous method returns void immediately, async operation runs in background with error logging

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict class property initialization error in DTO**

- **Found during:** Task 1 (after running pnpm build)
- **Issue:** `name: string` without initializer causes TS2564 in strict mode
- **Fix:** Added definite assignment assertion `name!: string`
- **Files modified:** `apps/backend/src/modules/api-keys/dto/create-api-key.dto.ts`
- **Verification:** Build succeeded after fix
- **Committed in:** b3788d4 (Task 1 commit)

**2. [Rule 3 - Blocking] Installed missing multer runtime dependency**

- **Found during:** Task 2 (backend startup test)
- **Issue:** `Cannot find module 'multer'` at runtime — package.json had `@types/multer` but not `multer` itself
- **Fix:** `pnpm add multer` in apps/backend
- **Files modified:** `apps/backend/package.json`, `apps/web/package.json` (workspace lockfile)
- **Verification:** Backend starts successfully after install
- **Committed in:** bb2717e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes required for build/startup. No scope creep.

## Issues Encountered

- `pnpm db:push` interactive prompt couldn't be answered non-interactively (no `--yes` flag) — used psql directly to create the table with equivalent DDL. Table created successfully with correct schema.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API Keys backend fully functional: table created, CRUD endpoints live, CompositeAuthGuard active
- Ready for Plan 23-02: API Keys frontend (admin UI for managing keys)
- JWT auth preserved unchanged — existing Supabase login flow unaffected

---

_Phase: 23-api-keys_
_Completed: 2026-03-12_
