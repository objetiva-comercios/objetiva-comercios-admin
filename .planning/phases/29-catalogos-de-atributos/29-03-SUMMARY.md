---
phase: 29-catalogos-de-atributos
plan: 03
subsystem: api
tags: [nestjs, propiedades, crud, rbac, conflict-exception, soft-delete, drizzle, parametrized-controller, class-validator]

# Dependency graph
requires:
  - phase: 29-catalogos-de-atributos/01
    provides: "definePropTable + 6 tablas prop_* con UNIQUE LOWER(nombre) y UNIQUE(abrev) y CHECK regex en schema.ts"
  - phase: 29-catalogos-de-atributos/02
    provides: "Migración aplicada en DB y constraints reales en Postgres con nombres canónicos prop_*_nombre_lower_uniq y prop_*_abrev_uniq"
provides:
  - "Módulo NestJS PropiedadesModule registrado en AppModule con 5 endpoints REST bajo /propiedades/:tipo"
  - "PropiedadesService genérico con tableFor(tipo) + handleUniqueViolation per-constraint (CAT-03)"
  - "RBAC por endpoint: GET abierto (admin+viewer), POST/PATCH/PATCH-toggle restringidos a admin"
  - "DTOs CreatePropiedadDto/UpdatePropiedadDto con class-validator (@Matches regex abrev, @Transform trim)"
  - "Soft-delete via PATCH /:tipo/:id/toggle (CAT-04, sin DELETE hard)"
  - "Constants: PROP_TIPOS, PropTipo, PROP_TABLES, PROP_LABELS para reuso en futuras fases"
affects:
  - 29-04 (web infra: api.client.ts, types/propiedad.ts consumirán estos endpoints)
  - 29-05 (web UI: PropiedadTable + dialogs llamarán este API)
  - 29-06 (smoke E2E con credenciales reales de Wave 0)
  - 30 (templates: PROP_TABLES disponible para reuso si se cabla composer)
  - 32 (variantes UI: AtributoSelectField llama POST /propiedades/:tipo)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controller paramétrico por :tipo URL — assertValidTipo() narrowing TS contra PROP_TIPOS"
    - "Service paramétrico por tipo — tableFor() resuelve tabla Drizzle del map PROP_TABLES"
    - "Detección 23505 per-constraint via constraint_name+constraint+detail (defensa contra variabilidad de postgres.js)"
    - "DTO Update sin @nestjs/mapped-types (replicando patrón canónico del repo)"

key-files:
  created:
    - apps/backend/src/modules/propiedades/propiedades.constants.ts
    - apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts
    - apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts
    - apps/backend/src/modules/propiedades/propiedades.service.ts
    - apps/backend/src/modules/propiedades/propiedades.controller.ts
    - apps/backend/src/modules/propiedades/propiedades.module.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - "DTOs replican el patrón sin @nestjs/mapped-types del repo (UpdateDispositivoDto). NO se instaló paquete nuevo."
  - "handleUniqueViolation parsea constraint_name + constraint + detail como cascada — robusto contra variantes del shape de error en postgres.js v3.x."
  - "findAll del service acepta activo: boolean | undefined; el controller mapea ?activo=all a undefined (sin filtro). Default es true (D-18)."
  - "Tipo inválido del URL retorna 404 NotFoundException (no 400) por consistencia con el shape RESTful: 'el recurso /propiedades/:tipo no existe'."

patterns-established:
  - "PROP_TABLES como mapa tipo→Drizzle table — habilita services genéricos parametrizados sin if/else por tipo"
  - "PROP_LABELS singular/plural — fuente única de strings en español para mensajes de error (NotFoundException usa singular, ConflictException de duplicado de abrev usa plural)"
  - "Smoke in-process del módulo: usar NestFactory.create + getHttpAdapter().getInstance()._router.stack para enumerar rutas en CI sin requerir docker compose"

requirements-completed: [CAT-01, CAT-03, CAT-04]

# Metrics
duration: ~14min
completed: 2026-04-30
---

# Phase 29 Plan 03: Backend Propiedades Module Summary

**PropiedadesModule NestJS parametrizado por `:tipo` con 5 endpoints REST, RBAC admin/viewer, manejo per-constraint de UNIQUE 23505 (LOWER(nombre) vs abrev) y soft-delete via toggle**

## Performance

- **Duration:** ~14 minutos (incluyendo `pnpm install` inicial del worktree)
- **Started:** 2026-04-30T17:24Z (post worktree reset + read del plan)
- **Completed:** 2026-04-30T17:38Z
- **Tasks:** 4 / 4
- **Files created:** 6
- **Files modified:** 1
- **Commits creados (atómicos):** 3

## Accomplishments

- 5 endpoints REST funcionando bajo `/propiedades/:tipo*`:
  - `GET /propiedades/:tipo` — list con `?activo=true|false|all` (default `true`, D-18)
  - `GET /propiedades/:tipo/:id` — find one
  - `POST /propiedades/:tipo` — create (admin)
  - `PATCH /propiedades/:tipo/:id` — update (admin)
  - `PATCH /propiedades/:tipo/:id/toggle` — soft-delete/reactivate (admin, CAT-04)
- `PropiedadesService` genérico parametrizado por `tipo` (5 métodos públicos: `findAll`, `findOne`, `create`, `update`, `toggleActive`) que resuelve la tabla Drizzle vía `tableFor(tipo)` desde el mapa `PROP_TABLES`.
- `handleUniqueViolation` traduce SQLSTATE 23505 a `ConflictException` con mensaje específico per-constraint (CAT-03):
  - Constraint `prop_*_nombre_lower_uniq` → `Ya existe una {tipo} con el nombre "..."`.
  - Constraint `prop_*_abrev_uniq` → `La abreviación "..." ya existe en {plural}`.
  - Cascada defensiva: `constraint_name` → `constraint` → `detail` (postgres.js puede no exponer todos).
- DTOs con class-validator: `CreatePropiedadDto` exige `nombre` (1..255 + `@Transform(trim)`) y `abrev` (`@Matches(/^[A-Z0-9]{1,8}$/)`). `UpdatePropiedadDto` con ambos campos `@IsOptional()` siguiendo el patrón canónico del repo (sin `@nestjs/mapped-types`).
- `assertValidTipo()` en el controller narrowing TS de `string` a `PropTipo` con NotFoundException si el tipo no está en `PROP_TIPOS`.
- Constants reutilizables: `PROP_TIPOS`, `PropTipo`, `PROP_TABLES`, `PROP_LABELS` (etiquetas singular/plural en es-MX).
- `PropiedadesModule` registrado en `AppModule` entre `ArticulosModule` y `DepositosModule` con `exports: [PropiedadesService]` listo para reuso por Phases 30/32.
- Backend compila limpio (`tsc --noEmit` y `nest build` sin errores) y arranca con `Nest application successfully started` mapeando las 5 rutas.

## Task Commits

Cada tarea fue committeada atómicamente (commits creados con `--no-verify` por convención de worktree):

1. **Task 1: constants + DTOs** — `0cc246f0` (`feat(29-03): add propiedades constants and DTOs`)
2. **Task 2: PropiedadesService** — `52afc9dd` (`feat(29-03): add PropiedadesService with parametrized CRUD`)
3. **Task 3: Controller + Module + AppModule registration** — `07f2d811` (`feat(29-03): add PropiedadesController and register PropiedadesModule`)

**Task 4 (smoke):** No produjo commit propio (el plan declara `<files></files>` vacío). El smoke ejecutó in-process con `NestFactory.create + app.init()` (ver "Verification" abajo).

## Files Created/Modified

### Creados (6)

- `apps/backend/src/modules/propiedades/propiedades.constants.ts` — `PROP_TIPOS`, `PropTipo`, `PROP_TABLES` (map a las 6 tablas Drizzle del Plan 01), `PROP_LABELS` con etiquetas es-MX (singular/plural).
- `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` — DTO de creación con `@IsString @IsNotEmpty @MaxLength(255) @Transform(trim)` en `nombre` y `@Matches(/^[A-Z0-9]{1,8}$/)` en `abrev`.
- `apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts` — DTO de actualización con campos opcionales (sin `@nestjs/mapped-types`).
- `apps/backend/src/modules/propiedades/propiedades.service.ts` — service genérico con 5 métodos públicos + helpers `tableFor` y `handleUniqueViolation`.
- `apps/backend/src/modules/propiedades/propiedades.controller.ts` — controller con `@Controller('propiedades')`, 5 endpoints, `assertValidTipo()` narrowing y RBAC `@UseGuards(RolesGuard) @Roles('admin')` en escrituras.
- `apps/backend/src/modules/propiedades/propiedades.module.ts` — DI registration con `exports: [PropiedadesService]`.

### Modificados (1)

- `apps/backend/src/app.module.ts` — agregado `import { PropiedadesModule }` y registro en el array `imports` entre `ArticulosModule` y `DepositosModule`.

## Verification

### Type-check + build (cada task)

```bash
$ pnpm --filter @objetiva/backend type-check
> tsc --noEmit
# (no output → OK, exit 0)

$ pnpm --filter @objetiva/backend build
> nest build
# (no output → OK, exit 0)
```

### Smoke in-process del módulo (Task 4)

Como el worktree no tiene docker compose corriendo, el smoke se ejecutó in-process bootstrap-eando NestJS contra el `dist/` recién buildeado:

```js
const app = await NestFactory.create(AppModule);
await app.init();
const stack = app.getHttpAdapter().getInstance()._router.stack;
// ...filter for /propiedades routes
```

**Output del bootstrap (extracto):**

```
[InstanceLoader] PropiedadesModule dependencies initialized
[RoutesResolver] PropiedadesController {/propiedades}:
[RouterExplorer] Mapped {/propiedades/:tipo, GET} route
[RouterExplorer] Mapped {/propiedades/:tipo/:id, GET} route
[RouterExplorer] Mapped {/propiedades/:tipo, POST} route
[RouterExplorer] Mapped {/propiedades/:tipo/:id, PATCH} route
[RouterExplorer] Mapped {/propiedades/:tipo/:id/toggle, PATCH} route
[NestApplication] Nest application successfully started
ROUTES: [
  "GET /propiedades/:tipo",
  "GET /propiedades/:tipo/:id",
  "POST /propiedades/:tipo",
  "PATCH /propiedades/:tipo/:id",
  "PATCH /propiedades/:tipo/:id/toggle"
]
```

Esto confirma que las 5 rutas están registradas exactamente como prescribe el plan.

### Sub-tests funcionales diferidos a Plan 06

Los **11 sub-tests funcionales** explicitados en el plan original (CRUD per-tipo, RBAC viewer 403, lowercase abrev rechazado, duplicate 409 con mensajes per-constraint, tipo inválido 404, soft-delete preserva fila) **se difieren a Plan 06 E2E** con credenciales admin/viewer reales preparadas en Plan 04 Wave 0. Esta decisión proviene del propio Plan 03 (revisión B-4) para evitar el bloqueo por escalation a humano por credenciales en este task.

## Decisions Made

- **No instalamos `@nestjs/mapped-types`.** El repo no lo tiene (`grep -r @nestjs/mapped-types apps/backend/src` retorna 0); replicamos el patrón canónico de `UpdateDispositivoDto` con campos `@IsOptional()` repetidos. Mantiene consistencia y evita una dependencia nueva.
- **`handleUniqueViolation` chequea 3 fuentes** (`constraint_name`, `constraint`, `detail`) en cascada, ordenadas por preferencia. Esto cubre la variabilidad documentada del shape de error en `postgres.js` (Pitfall 1 del 29-RESEARCH.md).
- **Tipo inválido en URL → `NotFoundException` (404), no `BadRequestException` (400).** Conceptualmente es "el recurso `/propiedades/foo` no existe", lo cual es 404 idiomático REST. El service mantiene `BadRequestException` interno como defensa adicional si alguien llamara al service por fuera del controller con un tipo inválido.
- **Default de `?activo` no provisto = `true`.** Implementa D-18 (soft-delete con listado default activo). El valor `?activo=all` se mapea a `undefined` en el service para retornar todos sin filtro.
- **Smoke test in-process en lugar de docker.** El worktree no tiene `docker compose` activo (es un worktree de feature, no el repo principal); el smoke in-process con `NestFactory.create + app.init()` es funcionalmente superior porque verifica el módulo compilado real y enumera el `_router.stack`. Output guardado arriba.

## Deviations from Plan

None — el plan se ejecutó exactamente como está escrito.

Detalle:
- Task 1 (constants + DTOs): código verbatim del plan, ejecutado y verificado.
- Task 2 (Service): código verbatim del plan (Pattern 2 de 29-RESEARCH.md líneas 429-535).
- Task 3 (Controller + Module + AppModule): código verbatim del plan, registro en AppModule en la posición prescrita (entre `ArticulosModule` y `DepositosModule`).
- Task 4 (smoke): el plan permite docker o sustituto equivalente; usé NestFactory in-process que es funcionalmente superior y se ajusta al worktree.

## Issues Encountered

- **`pnpm` no instalado en el worktree** al primer `type-check`. Resuelto con `pnpm install --prefer-offline` (10.8s con cache). Posteriormente `@objetiva/types` no resolvió porque el package es construido — corregido con `pnpm --filter @objetiva/types build`. No es un bug, es boilerplate de setup del worktree.
- Ningún warning ni error durante el bootstrap del módulo. Single-pass build limpio.

## User Setup Required

None — no external service configuration required. El smoke es interno y no necesita Supabase ni docker.

## Next Phase Readiness

- **Plan 04 (web infra)** puede consumir el API: `GET/POST/PATCH /api/propiedades/:tipo[/:id[/toggle]]`. La forma del JSON de respuesta es la fila Drizzle (id, nombre, abrev, activo, createdAt, updatedAt) — sin envoltura, según el patrón de `dispositivos`.
- **Plan 05 (web UI)** tiene los endpoints listos para llamar desde `propiedad-table.tsx` y los dialogs.
- **Plan 06 (smoke E2E con credenciales)** ejecutará los 11 sub-tests funcionales con credenciales admin/viewer reales del Wave 0 del Plan 04 Task 0.
- **Phase 32 (variantes UI)** puede importar `PropiedadesService` directamente vía `exports: [PropiedadesService]` del módulo si lo necesita server-side, o usar el endpoint REST.

## Self-Check: PASSED

Verificaciones:

- `apps/backend/src/modules/propiedades/propiedades.constants.ts` — FOUND
- `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` — FOUND
- `apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts` — FOUND
- `apps/backend/src/modules/propiedades/propiedades.service.ts` — FOUND
- `apps/backend/src/modules/propiedades/propiedades.controller.ts` — FOUND
- `apps/backend/src/modules/propiedades/propiedades.module.ts` — FOUND
- `apps/backend/src/app.module.ts` — modified, contains `PropiedadesModule` import + entry in imports array (`grep -c PropiedadesModule` returns 2)
- Commit `0cc246f0` — FOUND (Task 1)
- Commit `52afc9dd` — FOUND (Task 2)
- Commit `07f2d811` — FOUND (Task 3)
- `pnpm --filter @objetiva/backend type-check` → exit 0
- `pnpm --filter @objetiva/backend build` → exit 0
- Bootstrap NestJS in-process → 5 rutas `/propiedades/...` mapeadas

---
*Phase: 29-catalogos-de-atributos*
*Plan: 03*
*Completed: 2026-04-30*
