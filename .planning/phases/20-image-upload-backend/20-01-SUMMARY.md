---
phase: 20-image-upload-backend
plan: 01
subsystem: api
tags: [sharp, multer, webp, image-upload, nestjs, drizzle]

# Dependency graph
requires:
  - phase: 19-articulos-backend
    provides: ArticulosService, DrizzleService, articulos schema with imagenesProducto/imagenesEtiqueta JSONB fields

provides:
  - POST /api/articulos/:codigo/imagenes — upload image, process to WebP thumb (200x200) + detail (1000px), write to filesystem, update DB
  - DELETE /api/articulos/:codigo/imagenes/:tipo/:slot — remove files and clear JSONB slot in DB
  - sharp-based image processing pipeline (WebP conversion, resize, cover/inside fit)
  - MulterError handling in global HttpExceptionFilter (LIMIT_FILE_SIZE → 400)

affects: [21-image-upload-frontend, mobile-app]

# Tech tracking
tech-stack:
  added: [sharp 0.34.5]
  patterns:
    - memoryStorage for in-memory file processing before writing to disk
    - fileFilter callback for MIME type validation at Multer level
    - sanitizeCodigo helper for safe filesystem path generation from arbitrary PK strings
    - JSONB array update pattern (read → extend → set slot → update)

key-files:
  created:
    - apps/backend/src/modules/articulos/dto/upload-imagen.dto.ts
    - apps/backend/src/modules/articulos/articulos-imagenes.service.ts
    - apps/backend/src/modules/articulos/articulos-imagenes.controller.ts
  modified:
    - apps/backend/package.json
    - apps/backend/src/modules/articulos/articulos.module.ts
    - apps/backend/src/common/filters/http-exception.filter.ts
    - pnpm-lock.yaml

key-decisions:
  - 'memoryStorage chosen over diskStorage — process in memory with sharp before writing final WebP to avoid temp files'
  - 'Only detail URL stored in DB; thumb URL derived by convention (_detail.webp → _thumb.webp)'
  - 'sanitizeCodigo normalizes NFD + strips diacritics + replaces non-alphanumeric — handles special chars in PK (/, spaces, accented)'
  - 'MulterError added to @Catch decorator on HttpExceptionFilter — single global filter handles both HTTP and Multer errors'
  - 'fileFilter uses any type annotation to avoid multer FileFilterCallback type incompatibility'

patterns-established:
  - 'Image service pattern: verify exists → validate → process → write → update DB → return'
  - 'Idempotent file delete: catch ENOENT, rethrow anything else'
  - 'Slot arrays: extend with nulls as needed, set slot-1 index'

requirements-completed: [IMG-03]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 20 Plan 01: Image Upload Backend Summary

**NestJS image upload pipeline with sharp WebP processing (200x200 thumb + 1000px detail), Multer memory storage, and JSONB array slot management via Drizzle ORM**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-12T01:13:24Z
- **Completed:** 2026-03-12T01:16:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- POST endpoint accepts JPG/PNG/WebP up to 5MB, converts to WebP via sharp (200x200 thumbnail + 1000px detail), writes to `uploads/articulos/{etiquetas|productos}/`, updates JSONB array in DB, returns updated articulo
- DELETE endpoint removes both thumb and detail files idempotently, clears JSONB slot, returns updated articulo
- Global HttpExceptionFilter extended to catch MulterError — oversized files return 400 with "Archivo demasiado grande (max 5MB)"

## Task Commits

1. **Task 1: Install sharp + create DTO + image processing service** - `68e44f9` (feat)
2. **Task 2: Create controller + MulterError filter + register module** - `5d27b88` (feat)

## Files Created/Modified

- `apps/backend/src/modules/articulos/dto/upload-imagen.dto.ts` - Validates tipo (etiqueta|producto) + slot (1-6) from FormData strings
- `apps/backend/src/modules/articulos/articulos-imagenes.service.ts` - Image processing (sharp), filesystem write/delete, JSONB slot updates
- `apps/backend/src/modules/articulos/articulos-imagenes.controller.ts` - POST and DELETE endpoints with guards, Multer interceptor, MIME filter
- `apps/backend/src/modules/articulos/articulos.module.ts` - Registers new controller and service
- `apps/backend/src/common/filters/http-exception.filter.ts` - Now catches both HttpException and MulterError
- `apps/backend/package.json` + `pnpm-lock.yaml` - sharp 0.34.5 added

## Decisions Made

- Used `memoryStorage()` — processes buffer in memory with sharp, avoids temp disk files
- Only detail URL stored in DB JSONB; thumb URL is derived by string convention at read time
- `sanitizeCodigo` handles arbitrary PK strings (slashes, accents, spaces) for safe filesystem paths
- `@Catch(HttpException, MulterError)` on global filter — no separate filter class needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DTO property initializer TypeScript error**

- **Found during:** Task 1 (DTO creation)
- **Issue:** Strict TypeScript required `!` definite assignment assertions on DTO properties without constructor initialization
- **Fix:** Added `!` to `tipo!` and `slot!` property declarations
- **Files modified:** `apps/backend/src/modules/articulos/dto/upload-imagen.dto.ts`
- **Verification:** `tsc --noEmit` passed after fix
- **Committed in:** 68e44f9 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed fileFilter type incompatibility with multer's FileFilterCallback**

- **Found during:** Task 2 (controller creation)
- **Issue:** Importing `FileFilterCallback` from multer caused type mismatch — internal multer callback type expects 2+ args but standard Error|null callback only provides 1
- **Fix:** Removed `FileFilterCallback` import; used `any` type annotation on callback parameter with ESLint disable comment
- **Files modified:** `apps/backend/src/modules/articulos/articulos-imagenes.controller.ts`
- **Verification:** `tsc --noEmit` passed after fix
- **Committed in:** 5d27b88 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - TypeScript type errors)
**Impact on plan:** Minor type fixes, no behavior change. No scope creep.

## Issues Encountered

None beyond the two TypeScript type issues auto-fixed above.

## User Setup Required

None - no external service configuration required. Static serving of `/api/uploads/articulos/` was already configured in `main.ts`.

## Next Phase Readiness

- POST `/api/articulos/:codigo/imagenes` and DELETE `/api/articulos/:codigo/imagenes/:tipo/:slot` endpoints are ready for Phase 21 (frontend image upload UI)
- Images served at `/api/uploads/articulos/{etiquetas|productos}/{filename}.webp`
- `uploads/` directory auto-created by existing `main.ts` logic; subdirectories created on first upload

---

_Phase: 20-image-upload-backend_
_Completed: 2026-03-12_

## Self-Check: PASSED

- FOUND: apps/backend/src/modules/articulos/dto/upload-imagen.dto.ts
- FOUND: apps/backend/src/modules/articulos/articulos-imagenes.service.ts
- FOUND: apps/backend/src/modules/articulos/articulos-imagenes.controller.ts
- FOUND: commit 68e44f9
- FOUND: commit 5d27b88
