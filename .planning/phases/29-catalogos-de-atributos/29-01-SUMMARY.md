---
phase: 29-catalogos-de-atributos
plan: 01
subsystem: database
tags: [drizzle, schema, postgres, propiedades, prop_marca, unique-lower, check-constraint, migration]

requires:
  - phase: 27-articulos-erp-foundation
    provides: schema base con tablas articulos, depositos, dispositivos_moviles
provides:
  - "Declaración Drizzle de 6 tablas prop_* (prop_marca, prop_color, prop_talle, prop_material, prop_presentacion, prop_objeto) con shape mínima D-03"
  - "Constraints DB: UNIQUE LOWER(nombre) (D-05), UNIQUE(abrev), CHECK abrev ~ '^[A-Z0-9]{1,8}$' (D-06), index sobre activo (D-18)"
  - "12 tipos exportados (PropMarca/NewPropMarca y análogos para las 6 tablas)"
  - "Migration auto-emit format 0004_phase29_propiedades.sql (purely additive — no DROP)"
  - "Migration custom 0005_phase29_cache_trigger.sql con bloque del trigger PL/pgSQL completamente comentado, gated para Phase 30/31"
  - "Journal _journal.json extendido con tags 0004 y 0005 (idx 3 y 4)"
affects: [29-02, 29-03, 29-04, 30, 31, 32]

tech-stack:
  added: []
  patterns:
    - "Factory definePropTable(tableName, indexPrefix) para tablas paramétricas con shape idéntica"
    - "Helper lower(col: AnyPgColumn) para garantizar string SQL idéntico en functional UNIQUE"
    - "Constante ABREV_REGEX_SQL reusada en los 6 check() — un solo punto de cambio"
    - "Migration custom SQL con bloque /* ... */ como técnica de no-op gated (0005)"

key-files:
  created:
    - apps/backend/drizzle/0004_phase29_propiedades.sql
    - apps/backend/drizzle/0005_phase29_cache_trigger.sql
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/drizzle/meta/_journal.json

key-decisions:
  - "Factory definePropTable evita 6 copias del mismo bloque pgTable (cierra D-01/D-03/D-04/D-05/D-06 con un solo diff potencial)"
  - "AnyPgColumn importado desde drizzle-orm/pg-core (no drizzle-orm) — fix v0.45.1"
  - "Migration 0004 escrita a mano siguiendo formato Drizzle Kit emit (precedente: 0003 también es manual)"
  - "Bloque del trigger gated con /* ... */ — Phase 30/31 reactiva descomentando"
  - "Journal entry para 0004 reusa idx=3 (slot dejado libre porque 0003 nunca se journaló)"

patterns-established:
  - "Catálogos de propiedades como tablas independientes (prefijo prop_) en vez de polimórfica con tipo"
  - "UNIQUE case-insensitive vía functional index uniqueIndex().on(sql`lower(...)`)"
  - "CHECK constraint regex declarado con check(name, sql`...`) (Drizzle 0.45 soporta declarativo)"
  - "Custom SQL gated commented-block para SQL pendiente de pre-condiciones que aparecen en fases futuras"

requirements-completed: [CAT-01, CAT-03, CAT-04]

duration: 22min
completed: 2026-04-30
---

# Phase 29 Plan 01: Schema y Migrations Propiedades Summary

**6 tablas prop_* declaradas en Drizzle con UNIQUE LOWER(nombre) + CHECK regex sobre abrev + factory definePropTable, migration 0004 puramente aditivo y migration custom 0005 con trigger de cache_nombre comentado, gated para Phase 30/31.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-04-30T17:00:00Z
- **Completed:** 2026-04-30T17:22:16Z
- **Tasks:** 3
- **Files modified:** 4 (2 created + 2 modified)

## Accomplishments

- 6 tablas Drizzle (`propMarca`, `propColor`, `propTalle`, `propMaterial`, `propPresentacion`, `propObjeto`) declaradas vía un factory paramétrico que produce shape idéntica con UNIQUE LOWER(nombre) + UNIQUE(abrev) + CHECK regex + index activo en 4 líneas por tabla.
- Migration `0004_phase29_propiedades.sql` con 6 CREATE TABLE (orden alfabético — `color, marca, material, objeto, presentacion, talle`), 6 CHECK constraints inline, 6 UNIQUE INDEX functional `lower("nombre")`, 6 UNIQUE INDEX `abrev`, 6 INDEX `activo`. Cero `DROP`, cero `ALTER` destructivo — purely additive.
- Migration custom `0005_phase29_cache_trigger.sql` con la función PL/pgSQL `cache_nombre_prop()` (TG_ARGV-driven, genérica para 6 tablas) y los 6 `CREATE TRIGGER` correspondientes, todo dentro de un único bloque `/* ... */` para que Postgres ejecute como no-op hasta que Phase 30/31 descomente.
- Journal `_journal.json` extendido con dos entradas nuevas (idx 3 → `0004_phase29_propiedades`, idx 4 → `0005_phase29_cache_trigger`).
- TypeScript type-check pasa limpio (`pnpm --filter @objetiva/backend type-check` exit 0).

## Task Commits

Each task was committed atomically with `--no-verify` (worktree mode, parallel execution):

1. **Task 1: schema.ts — 6 tablas prop_* + factory + types** — `62f8c654` (feat)
2. **Task 2: migration 0004 auto-emit format** — `bf1bdbeb` (feat)
3. **Task 3: migration custom 0005 con trigger comentado** — `7bd21f29` (feat)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` — agregado bloque "Phase 29: Propiedades" con factory `definePropTable`, helper `lower`, constante `ABREV_REGEX_SQL`, 6 declaraciones de tabla y 12 type exports. Imports modificados: `check` y `type AnyPgColumn` agregados desde `drizzle-orm/pg-core`; `sql` ya estaba implícito vía nuevo import.
- `apps/backend/drizzle/0004_phase29_propiedades.sql` — migration auto-emit format con 6 CREATE TABLE alfabético + 18 índices (3 por tabla) + 6 CHECK constraints. 25 statements totales separados por `--> statement-breakpoint`.
- `apps/backend/drizzle/0005_phase29_cache_trigger.sql` — migration custom con header descriptivo en español, bloque `/* ... */` único conteniendo CREATE FUNCTION + 6 CREATE TRIGGER. Sin SQL ejecutable fuera del comentario. Idempotente (es comentario puro al aplicar).
- `apps/backend/drizzle/meta/_journal.json` — agregadas idx 3 y idx 4 con tags `0004_phase29_propiedades` y `0005_phase29_cache_trigger`.

## Decisions Made

- **Factory `definePropTable(tableName, indexPrefix)` en vez de 6 declaraciones explícitas**: 6 tablas con shape idéntica se condensan en ~10 LOC del factory + 6 líneas de invocación + 12 líneas de type exports. Mantenibilidad alta — cualquier ajuste futuro (e.g., agregar columna `descripcion`) toca un solo punto.
- **`AnyPgColumn` importado desde `drizzle-orm/pg-core` en vez de `drizzle-orm`**: en `drizzle-orm@0.45.1` ese tipo solo se exporta vía `pg-core/columns/common.d.ts` (verificado contra el package instalado). El plan instruía importarlo desde `drizzle-orm`, lo cual hubiera roto type-check con `TS2724`. Documentado como deviation Rule 3 abajo.
- **Migration 0004 escrita a mano siguiendo el formato emit de Drizzle Kit**: el journal y los snapshots están desfasados desde marzo 2026 (la migration 0003 fue manual también y nunca se journaló; el snapshot 0002 referencia tablas como `inventory`/`products` que ya no existen en `schema.ts`). En ese estado, `drizzle-kit generate` requiere responder ~18 prompts interactivos sobre renames de tablas existentes, lo cual no es ejecutable headless en este worker. La SQL escrita reproduce fielmente el output del convertor Drizzle (verificado contra el código del paquete `drizzle-kit@0.31.9` en `node_modules/.pnpm/drizzle-kit@0.31.9/.../bin.cjs` líneas 24837 y 26741, que muestran cómo se emiten CHECK y UNIQUE INDEX functional).
- **Bloque `/* ... */` único para todo el SQL del trigger en 0005**: garantiza que un solo descomentar (Phase 30/31) activa los 7 statements (1 función + 6 triggers). Alternativa rechazada: prefijar cada línea con `--`, lo cual obligaría a tocar 60+ líneas para activar.
- **Journal idx 3 reusa el slot que 0003 nunca ocupó**: como `0003_add_columna_inv_articulos.sql` se aplicó como fix manual fuera del flujo Drizzle, el journal saltó del idx 2 al siguiente disponible. Mantengo idx=3 → 0004 e idx=4 → 0005 para no introducir un agujero numérico que el runtime de drizzle-kit pueda rechazar más adelante.
- **NO se aplicó `db:migrate` ni `db:push`**: explicitamente fuera de scope de Plan 29-01 — eso es responsabilidad de Plan 29-02 (migration & seed) según el plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Import incorrecto de `AnyPgColumn` corregido**

- **Found during:** Task 1 (verificación de type-check tras agregar el bloque al schema.ts)
- **Issue:** El plan instruyó `import { sql, type AnyPgColumn } from 'drizzle-orm'`, pero en `drizzle-orm@0.45.1` ese tipo no está exportado desde el entry-point raíz. `tsc --noEmit` falló con `TS2724: '"drizzle-orm"' has no exported member named 'AnyPgColumn'. Did you mean 'AnyColumn'?`. Verifiqué en el package instalado: `AnyPgColumn` solo se declara en `node_modules/.../drizzle-orm/pg-core/columns/common.d.ts` y se re-exporta vía `pg-core/columns/index`, accesible desde `drizzle-orm/pg-core`.
- **Fix:** Mover `type AnyPgColumn` al destructuring de `drizzle-orm/pg-core` (junto a `check`, `pgTable`, etc.) y mantener `sql` solo en `drizzle-orm`.
- **Files modified:** `apps/backend/src/db/schema.ts` (líneas 1-18)
- **Verification:** `pnpm --filter @objetiva/backend type-check` exit 0.
- **Committed in:** `62f8c654` (Task 1 commit, pre-edit fix)

**2. [Rule 3 - Blocking] `db:generate` no ejecutable headless por journal/snapshot drift pre-existente**

- **Found during:** Task 2 (intento de correr `pnpm db:generate --name=phase29_propiedades`)
- **Issue:** Drizzle-kit detecta que el snapshot 0002 contiene tablas (`inventory`, `products`) que ya no existen en `schema.ts` y abre un menú TUI interactivo preguntando "Is api_keys table created or renamed from another table?" con opciones tipo `+ create table` / `~ inventory → api_keys rename table` / `~ products → api_keys rename table`. El menú requiere TTY raw mode y no acepta input piped/redirigido. Ejecutar a través de `script -q` también termina sin salida. Esto bloquea la ejecución unattended del task.
- **Causa raíz:** El proyecto tiene drift histórico — el journal y snapshots se quedaron en `idx 2` (marzo 2026) mientras que el schema.ts evolucionó con múltiples cambios manuales. La migration `0003_add_columna_inv_articulos.sql` fue agregada como fix manual y nunca se incorporó al journal. Reparar este drift es out-of-scope de Phase 29 (toca toda la base instalada y requiere acceso a la DB de producción para validar).
- **Fix:** Escribir `0004_phase29_propiedades.sql` a mano reproduciendo fielmente el output que `drizzle-kit@0.31.9` produciría para este cambio. Verifiqué el formato emit contra el código del paquete (`PgCreateTableConvertor` líneas 24837ss y `CreatePgIndexConvertor` líneas 26735ss del bundle `drizzle-kit/bin.cjs`). Esto es consistente con el precedente del repo: `0003_add_columna_inv_articulos.sql` también es SQL manual.
- **Files modified:** `apps/backend/drizzle/0004_phase29_propiedades.sql` (nuevo), `apps/backend/drizzle/meta/_journal.json` (idx 3 agregado)
- **Verification:** `grep -c 'CREATE TABLE "prop_' = 6`, `grep -c "abrev ~ '..." = 6`, `grep -c 'lower("nombre")' = 6`, `grep -c '_abrev_uniq" ON "prop_' = 6`, `grep -c '_activo_idx" ON "prop_' = 6`, `grep -cE "^DROP" = 0`. Todos los acceptance criteria del plan cumplidos.
- **Committed in:** `bf1bdbeb` (Task 2 commit)

**3. [Rule 3 - Blocking] Workspace package `@objetiva/types` requería build previo**

- **Found during:** Task 1 (primer intento de type-check del backend después de modificar schema.ts)
- **Issue:** `pnpm --filter @objetiva/backend type-check` falló con `TS2307: Cannot find module '@objetiva/types' or its corresponding type declarations` en 6 archivos (auth, guards, decorators). El workspace package usa `"main": "./dist/index.js"` y requiere que `tsc` haya corrido para emitir `dist/`. Como el worktree es fresco (sin `dist/`), la primera type-check fallaba aunque el código de Phase 29 estaba bien.
- **Fix:** `pnpm --filter @objetiva/types build` para emitir `packages/types/dist/`. Esto es setup, no cambio de código.
- **Files modified:** ninguno (solo build artifact en `packages/types/dist/`, gitignored)
- **Verification:** segundo run de type-check pasa sin errores.
- **Committed in:** N/A (no es cambio de código fuente — es setup que cualquier worktree fresco debe hacer)

---

**Total deviations:** 3 auto-fixed (todas Rule 3 - Blocking)
**Impact on plan:** Las 3 fueron necesarias para completar las tareas como fueron planeadas. Cero scope creep — el output funcional es idéntico al que el plan describe. La mayor (deviation #2) sustituye `db:generate` por SQL manual cuyo contenido satisface 1:1 los acceptance criteria del plan.

## Issues Encountered

- **Worktree base incorrecto al iniciar:** El worktree estaba basado en `a5438bee...` en vez del HEAD esperado `82a00e7c...`. Resuelto via `git reset --hard 82a00e7c4af84d81fb1563f05c9b2f8b30bcaa10` siguiendo el `<worktree_branch_check>` protocol — safe en worktree fresco sin cambios del usuario.
- **TUI prompts de drizzle-kit no automatizables:** Documentado arriba como Deviation #2. Tres intentos: piping `\n`, `printf '\r'` via `script -q`, y newline-spam fueron infructuosos. La causa real es el drift pre-existente del journal — fixearlo está fuera de scope.

## User Setup Required

None — no se requiere configuración externa. La aplicación de las migrations a la DB es responsabilidad explícita de Plan 29-02 (migration & seed). Phase 29-01 entrega los archivos SQL generados pero NO los ejecuta contra ninguna base.

## Next Phase Readiness

**Ready for Plan 29-02 (migration runner + seed):**
- `0004_phase29_propiedades.sql` listo para `pnpm db:migrate` o `pnpm db:push`. Es purely additive — no afecta tablas existentes.
- `0005_phase29_cache_trigger.sql` aplica como no-op (todo el SQL en `/* ... */`). Safe to apply repeatedly.
- Tipos `PropMarca | PropColor | PropTalle | PropMaterial | PropPresentacion | PropObjeto` listos para que el módulo NestJS de Plan 29-03 los importe desde `@/db/schema`.

**Ready for Plan 29-03 (NestJS module + DTOs):**
- Schema declarativo con `propMarca`, `propColor`, etc. exportados como Drizzle tables — el service podrá hacer `db.select().from(propMarca)` directamente.
- CHECK constraint en DB significa que el regex de validación en el DTO es defensa-en-profundidad (no la única línea).

**Concerns / heads-up para fases futuras:**
- El drift del journal Drizzle (snapshots del 2026-03 vs schema.ts actual) es deuda técnica acumulada que conviene atacar en una quick task antes de Phase 30. Si futuro `db:generate` se intenta correr, va a pedir confirmación sobre rename de TODAS las tablas existentes.
- Phase 30/31, al cablear FK desde `articulos.<prop>_id`, debe descomentar el bloque del migration 0005 antes de aplicar. Si lo aplica con la columna FK fuente todavía inexistente, los triggers fallarán con `column "<prop>_id" does not exist` — Pitfall P-11 ya documentado.

## Self-Check: PASSED

Verificaciones realizadas tras escritura del SUMMARY:

- [x] `apps/backend/src/db/schema.ts` modificado — verificado con `grep -c "definePropTable" → 7` (1 helper + 6 invocaciones).
- [x] `apps/backend/drizzle/0004_phase29_propiedades.sql` creado — verificado existencia + 6 CREATE TABLE + 6 CHECK + 6 LOWER UNIQUE + 6 abrev UNIQUE + 6 activo INDEX + 0 DROP.
- [x] `apps/backend/drizzle/0005_phase29_cache_trigger.sql` creado — verificado existencia + bloque comentado único + tag en journal.
- [x] `apps/backend/drizzle/meta/_journal.json` modificado — verificado con `grep "phase29_propiedades" + "phase29_cache_trigger"`.
- [x] Commits existen en git log: `62f8c654`, `bf1bdbeb`, `7bd21f29` — verificado con `git log --oneline | grep`.
- [x] Type-check pasa: `pnpm --filter @objetiva/backend type-check` exit 0.
- [x] Sin archivos untracked, sin deletions inesperadas.

---
*Phase: 29-catalogos-de-atributos*
*Plan: 01*
*Completed: 2026-04-30*
