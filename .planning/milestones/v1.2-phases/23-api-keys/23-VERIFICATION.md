---
phase: 23-api-keys
verified: 2026-03-12T13:00:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 23: API Keys — Verification Report

**Phase Goal:** API keys — CRUD de API keys para acceso programático + guard dual (JWT o API key)
**Verified:** 2026-03-12
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths — Plan 23-01 (Backend)

| #   | Truth                                                                          | Status   | Evidence                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | POST /api/api-keys creates a key and returns the full key exactly once         | VERIFIED | `api-keys.controller.ts` returns `{ id, name, prefix, createdAt, fullKey }` from service; fullKey generated in memory, never stored in DB                                            |
| 2   | GET /api/api-keys returns active keys with name, prefix, createdAt, lastUsedAt | VERIFIED | `findAll()` selects where `revokedAt IS NULL`, controller maps to `{ id, name, prefix, createdAt, lastUsedAt }`                                                                      |
| 3   | DELETE /api/api-keys/:id soft-revokes a key (sets revokedAt)                   | VERIFIED | `revoke(id)` sets `revokedAt: new Date()` via Drizzle update                                                                                                                         |
| 4   | Bearer token with a valid API key authenticates and sets user identity         | VERIFIED | `CompositeAuthGuard.canActivate()` calls `findByToken(token)`, sets `request.user = { userId: 'apikey:{name}', email: '', role: 'admin' }`                                           |
| 5   | Bearer token with a revoked API key returns 401                                | VERIFIED | `findByToken()` returns null when `found.revokedAt !== null`; guard throws `UnauthorizedException` when both JWT and API key fail                                                    |
| 6   | Existing JWT authentication still works unchanged                              | VERIFIED | CompositeAuthGuard tries JWT first via `jwtVerify` with same issuer/audience; on success sets `request.user` from payload and returns true without touching API key path             |
| 7   | lastUsedAt updates on each API key authenticated request                       | VERIFIED | `void this.apiKeysService.updateLastUsed(found.id)` called fire-and-forget in guard; `updateLastUsed` is synchronous return-void with async DB update in background with error catch |

### Observable Truths — Plan 23-02 (Frontend)

| #   | Truth                                                                      | Status   | Evidence                                                                                                                                                       |
| --- | -------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------- |
| 8   | Admin sees 'API Keys' in Settings sidebar navigation                       | VERIFIED | `settings-nav.tsx` includes API Keys item; filter `item.href !== '/settings/api-keys'                                                                          |     | userRole === 'admin'` passes for admin |
| 9   | Viewer does NOT see 'API Keys' in Settings sidebar                         | VERIFIED | Same filter excludes the item when `userRole !== 'admin'`                                                                                                      |
| 10  | Admin can create a key with a name and sees the full key once              | VERIFIED | Two-step dialog: form step calls `createApiKey(newKeyName)`, reveal step shows `createdKey.fullKey` in `<code>` block; dialog close blocked during reveal step |
| 11  | Admin can copy the full key to clipboard                                   | VERIFIED | `handleCopy()` calls `navigator.clipboard.writeText(createdKey.fullKey)`, sets `copied` state for 2s feedback                                                  |
| 12  | Admin sees a table of active keys with name, prefix, createdAt, lastUsedAt | VERIFIED | Table columns: Nombre, Key (prefix in `font-mono`), Creada (`toLocaleDateString('es-MX')`), Último uso (same format or `—` if null), Acción                    |
| 13  | Admin can revoke a key with confirmation dialog                            | VERIFIED | `setRevokeTarget(key)` opens AlertDialog; confirmation calls `revokeApiKey(revokeTarget.id)`                                                                   |
| 14  | Revoked key disappears from the table                                      | VERIFIED | `setKeys(prev => prev.filter(k => k.id !== revokeTarget.id))` after successful revoke                                                                          |
| 15  | Direct navigation to /settings/api-keys by viewer redirects away           | VERIFIED | `page.tsx` calls `notFound()` when `role !== 'admin'`; unauthenticated users get `redirect('/login')`                                                          |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact                                                        | Expected                                            | Status   | Details                                                                                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/db/schema.ts`                                 | apiKeys table definition                            | VERIFIED | `api_keys` table with all 7 fields, `uniqueIndex('api_keys_key_hash_idx')`, `index('api_keys_revoked_at_idx')`, `ApiKey` and `NewApiKey` type exports |
| `apps/backend/src/modules/api-keys/api-keys.service.ts`         | Key generation, hashing, CRUD, lookup               | VERIFIED | 5 methods: `create`, `findAll`, `revoke`, `findByToken`, `updateLastUsed` — all substantive                                                           |
| `apps/backend/src/modules/api-keys/api-keys.controller.ts`      | REST endpoints for api-keys CRUD                    | VERIFIED | POST/GET/DELETE with `@UseGuards(RolesGuard) @Roles('admin')` and `ensureNotApiKeyAuth()` escalation check                                            |
| `apps/backend/src/common/guards/composite-auth.guard.ts`        | JWT + API key composite authentication              | VERIFIED | Tries JWT first, falls back to API key, throws UnauthorizedException if both fail; DI-injected `ApiKeysService`                                       |
| `apps/web/src/app/(dashboard)/settings/api-keys/page.tsx`       | Server component with admin-only guard              | VERIFIED | Contains `notFound` call when role !== 'admin'; `redirect('/login')` for unauthenticated                                                              |
| `apps/web/src/components/settings/api-keys/api-keys-client.tsx` | Client component with table + create/revoke dialogs | VERIFIED | `'use client'` directive, full state machine, Dialog + AlertDialog, table with all required columns                                                   |
| `apps/web/src/lib/api.client.ts`                                | API client functions for api-keys CRUD              | VERIFIED | `fetchApiKeys`, `createApiKey`, `revokeApiKey` with `ApiKeyItem` and `ApiKeyCreated` interfaces                                                       |

---

### Key Link Verification

| From                      | To                        | Via                                               | Status   | Details                                                                                                                                    |
| ------------------------- | ------------------------- | ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---------------------- |
| `composite-auth.guard.ts` | `api-keys.service.ts`     | DI injection — `findByToken` and `updateLastUsed` | WIRED    | `apiKeysService.findByToken(token)` at line 62; `void this.apiKeysService.updateLastUsed(found.id)` at line 69                             |
| `app.module.ts`           | `composite-auth.guard.ts` | APP_GUARD provider registration                   | WIRED    | `{ provide: APP_GUARD, useClass: CompositeAuthGuard }` in providers array; `ApiKeysModule` in imports                                      |
| `main.ts`                 | (removed useGlobalGuards) | Guard migration from main.ts to APP_GUARD         | VERIFIED | `main.ts` contains no `useGlobalGuards` or `JwtAuthGuard` reference                                                                        |
| `api-keys-client.tsx`     | `api.client.ts`           | `fetchApiKeys`, `createApiKey`, `revokeApiKey`    | WIRED    | All 3 functions imported and called: `fetchApiKeys()` in useEffect, `createApiKey()` in `handleCreate`, `revokeApiKey()` in `handleRevoke` |
| `settings/layout.tsx`     | `settings-nav.tsx`        | userRole prop                                     | WIRED    | Layout fetches `userRole` from Supabase, passes as `<SettingsNav userRole={userRole} />`                                                   |
| `settings-nav.tsx`        | API Keys nav item         | Conditional rendering based on userRole           | WIRED    | `.filter(item => item.href !== '/settings/api-keys'                                                                                        |     | userRole === 'admin')` |

---

### Requirements Coverage

| Requirement | Source Plan  | Description                                                                                     | Status    | Evidence                                                                                                                                               |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APIKEY-01   | 23-01, 23-02 | Admin can create a new API key with a descriptive name, key is shown once and copyable          | SATISFIED | Backend: POST /api/api-keys returns fullKey once. Frontend: two-step dialog with reveal step showing fullKey with copy button, blocked close on reveal |
| APIKEY-02   | 23-01, 23-02 | Admin can list active API keys (showing name, prefix, creation date, last used) and revoke them | SATISFIED | Backend: GET returns active keys, DELETE soft-revokes. Frontend: table with all 4 fields + revoke AlertDialog                                          |
| APIKEY-03   | 23-01        | External systems can authenticate via Bearer token (API key) independent of Supabase Auth       | SATISFIED | CompositeAuthGuard tries API key after JWT failure; sets userId='apikey:{name}', role='admin'                                                          |
| APIKEY-04   | 23-01        | System tracks last usage timestamp for each API key                                             | SATISFIED | `updateLastUsed()` called fire-and-forget in CompositeAuthGuard on every API key authenticated request                                                 |

All 4 requirements satisfied. No orphaned requirements (REQUIREMENTS.md confirms all 4 map to Phase 23 with status Complete).

---

### Anti-Patterns Found

No blockers or warnings found. No TODO/FIXME/placeholder comments in any phase 23 files. All implementations are substantive.

**Minor note (informational):** The `revoke(id)` method does not add `AND revokedAt IS NULL` to its WHERE clause. Re-revoking an already-revoked key simply overwrites the timestamp. This is functionally harmless but diverges slightly from the plan spec. Not a blocker.

---

### Human Verification Required

The following behaviors require human testing in the browser or with curl:

#### 1. API Key Bearer Authentication End-to-End

**Test:** Create an API key via the admin UI, then `curl http://localhost:3001/api/articulos -H "Authorization: Bearer <fullKey>"`.
**Expected:** HTTP 200 with articulos data.
**Why human:** Requires a live backend + database with the api_keys table created via psql (not via `db:push` — see SUMMARY note about interactive prompt workaround).

#### 2. Revoked Key Returns 401

**Test:** After revoking a key via DELETE endpoint, use that key's fullKey as Bearer token.
**Expected:** HTTP 401 UnauthorizedException.
**Why human:** Requires runtime state (live DB with revokedAt set).

#### 3. Two-Step Dialog — Accidental Close Prevention

**Test:** Open create dialog, fill name, create key (reaches reveal step), press Escape or click outside.
**Expected:** Dialog stays open; key is NOT lost.
**Why human:** `handleDialogOpenChange` blocks close during reveal step — requires browser interaction to verify.

#### 4. lastUsedAt Timestamp Updates

**Test:** Make 2 API key authenticated requests, then check the key row in the table (after refreshing).
**Expected:** lastUsedAt column shows a recent timestamp.
**Why human:** Fire-and-forget async update — requires runtime + DB inspection.

---

## Summary

Phase 23 goal is fully achieved. All 15 observable truths are verified against the actual codebase:

**Backend (Plan 23-01):** The `api_keys` Drizzle table is correctly defined with SHA-256 hashing, unique key hash index, and revokedAt soft-delete column. `ApiKeysService` implements all 5 required methods. `ApiKeysController` exposes POST/GET/DELETE with admin-only RBAC and anti-escalation check. `CompositeAuthGuard` correctly replaces `JwtAuthGuard` as the global guard via `APP_GUARD` (enabling DI injection of `ApiKeysService`), tries JWT first, falls back to API key, and updates `lastUsedAt` fire-and-forget.

**Frontend (Plan 23-02):** Settings layout is an async server component passing `userRole` to `SettingsNav`, which conditionally shows the API Keys nav item for admins only. The `/settings/api-keys` page guards server-side with `notFound()` for non-admins. `ApiKeysClient` implements the full interactive surface: table with all required columns, two-step create dialog with accidental-close prevention on reveal step, and revoke AlertDialog with key name in confirmation text.

**Requirements:** All 4 requirement IDs (APIKEY-01 through APIKEY-04) are satisfied. Commits b3788d4, bb2717e, 8835b39, 64b58d9 all exist in the git log.

---

_Verified: 2026-03-12_
_Verifier: Claude (gsd-verifier)_
