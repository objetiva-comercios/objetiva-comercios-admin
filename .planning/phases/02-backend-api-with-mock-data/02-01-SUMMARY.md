---
phase: 02-backend-api-with-mock-data
plan: 01
subsystem: api
tags: [nestjs, jwt, validation, class-validator, jose, guards, filters, dto]

# Dependency graph
requires:
  - phase: 01-foundation-monorepo
    provides: NestJS backend structure with TypeScript configuration and JWT auth middleware
provides:
  - Global JWT authentication guard with @Public decorator bypass
  - Global ValidationPipe with transform, whitelist, and forbidNonWhitelisted
  - Global HttpExceptionFilter with consistent JSON error format
  - Reusable QueryDto with pagination/filter fields
  - PaginatedResponseDto and paginate() helper function
  - Health check endpoint at /api/health (unauthenticated)
  - Global 'api' prefix on all routes
affects: [02-02-mock-data, 02-03-api-endpoints, 03-web-ui, 04-mobile-ui]

# Tech tracking
tech-stack:
  added: [class-validator@0.14.3, class-transformer@0.5.1]
  patterns:
    [
      global-guard-with-public-decorator,
      global-exception-filter,
      reusable-query-dto,
      paginated-response-pattern,
    ]

key-files:
  created:
    - apps/backend/src/common/decorators/public.decorator.ts
    - apps/backend/src/common/guards/jwt-auth.guard.ts
    - apps/backend/src/common/filters/http-exception.filter.ts
    - apps/backend/src/common/dto/query.dto.ts
    - apps/backend/src/common/dto/paginated-response.dto.ts
  modified:
    - apps/backend/src/main.ts
    - apps/backend/src/app.controller.ts
    - apps/backend/src/auth/auth.module.ts
    - apps/backend/package.json

key-decisions:
  - 'Global guard pattern replaces route-based auth middleware for cleaner architecture'
  - 'JwtAuthGuard uses IS_PUBLIC_KEY reflector metadata check to bypass specific routes'
  - 'ValidationPipe uses transform:true so query string numbers auto-convert to number type'
  - 'HttpExceptionFilter handles both string and object messages from ValidationPipe'

patterns-established:
  - 'Global guard with @Public() decorator: JwtAuthGuard checks IS_PUBLIC_KEY before verifying JWT'
  - 'QueryDto inheritance: Feature DTOs extend base QueryDto for domain-specific filters'
  - 'Paginated response: paginate(items, query) helper applies slice + meta calculation'
  - 'Error format: { statusCode, message, path, method, timestamp } for all HTTP exceptions'

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-01-24
---

# Phase 2 Plan 01: Common Backend Infrastructure Summary

**Global JWT auth guard with @Public decorator, ValidationPipe with transform/whitelist, HttpExceptionFilter with consistent JSON errors, and reusable QueryDto/PaginatedResponseDto for all feature modules**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-24T11:50:00Z
- **Completed:** 2026-01-24T12:00:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Replaced route-based auth middleware with a global JWT guard using `@Public()` decorator pattern
- Configured global ValidationPipe with transform, whitelist, and forbidNonWhitelisted for all endpoints
- Built HttpExceptionFilter returning consistent `{ statusCode, message, path, method, timestamp }` format
- Created reusable QueryDto (page, limit, sort, search, status) and PaginatedResponseDto with paginate() helper
- Health check endpoint at `/api/health` verified accessible without authentication (API-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure global ValidationPipe** - `f06f521` (feat)
2. **Task 2: Create @Public decorator and global JWT auth guard with health check endpoint** - `0b3d767` (feat)
3. **Task 3: Create exception filter and reusable DTOs** - `473945f` (feat)

## Files Created/Modified

- `apps/backend/src/common/decorators/public.decorator.ts` - IS_PUBLIC_KEY constant and @Public() SetMetadata decorator
- `apps/backend/src/common/guards/jwt-auth.guard.ts` - JwtAuthGuard implementing CanActivate with Reflector-based @Public bypass
- `apps/backend/src/common/filters/http-exception.filter.ts` - @Catch(HttpException) filter returning consistent JSON error structure
- `apps/backend/src/common/dto/query.dto.ts` - QueryDto with page, limit, sort, search, status fields (class-validator decorated)
- `apps/backend/src/common/dto/paginated-response.dto.ts` - PaginatedResponseDto<T> class, PaginatedMeta interface, and paginate() helper
- `apps/backend/src/main.ts` - Added global prefix 'api', ValidationPipe, JwtAuthGuard, HttpExceptionFilter
- `apps/backend/src/app.controller.ts` - Added @Public() to health check endpoint
- `apps/backend/src/auth/auth.module.ts` - Removed route-based middleware configure() method
- `apps/backend/package.json` - Added class-validator@0.14.3, class-transformer@0.5.1

## Decisions Made

**1. Global guard over route-based middleware**

- Route-based middleware (NestJS configure()) requires listing routes explicitly
- Global guard with @Public() decorator is opt-out: all routes protected by default
- Reduces risk of accidentally leaving a route unprotected
- Cleaner pattern scales better as more feature modules are added

**2. ValidationPipe transform:true for query params**

- Query string parameters arrive as strings (e.g., ?page=2 gives "2")
- @Type(() => Number) combined with transform:true converts them automatically
- This is critical for QueryDto's page and limit fields to work with @Min/@Max validators

**3. HttpExceptionFilter message extraction**

- NestJS ValidationPipe wraps validation errors in `{ message: string[] }` format
- HttpException from guards is typically just a string message
- Filter handles both formats: `typeof exceptionResponse === 'string' ? str : obj.message`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all infrastructure components implemented without requiring additional problem-solving.

## User Setup Required

None - no external service configuration required beyond SUPABASE_PROJECT_ID already set from Phase 1.

## Next Phase Readiness

**Ready for:**

- Plan 02-02: Mock data generators can be added without any infrastructure changes
- Plans 02-03/02-04: Feature modules inherit global auth, validation, and error handling
- All future endpoints get JWT protection automatically (opt-in public via @Public)
- QueryDto and PaginatedResponseDto available for all feature module controllers

**Key constraint:**

- JwtAuthGuard requires SUPABASE_PROJECT_ID env var at startup
- Endpoints currently decorated with @Public() for Phase 3 testing (re-enable in Phase 5)

---

_Phase: 02-backend-api-with-mock-data_
_Completed: 2026-01-24_
