---
phase: 29-catalogos-de-atributos
plan: 02
subsystem: database
tags: [drizzle, migrate, postgres, propiedades, prop_marca, schema-push, blocking-gate]

requires:
  - phase: 29-catalogos-de-atributos
    plan: 01
    provides: SQL migrations 0004 y 0005 + journal entries idx 3 e idx 4
provides:
  - "6 tablas físicas prop_* (prop_color, prop_marca, prop_material, prop_objeto, prop_presentacion, prop_talle) en Postgres 17.8 (DB erp_sanchez, host localhost)"
  - "Cada tabla con 6 columnas (id serial PK, nombre text NN, abrev text NN, activo boolean DEFAULT true NN, created_at timestamp DEFAULT now() NN, updated_at timestamp DEFAULT now() NN)"
  - "24 indexes totales = 6 × (PK + UNIQUE LOWER(nombre) + UNIQUE abrev + INDEX activo)"
  - "6 CHECK constraints prop_*_abrev_format_chk con regex `^[A-Z0-9]{1,8}$`"
  - "Tabla drizzle.__drizzle_migrations actualizada con idx 4 e idx 5 (created_at 1777569630018, 1777569630019) — journal alineado con DB"
  - "Plan 03 (NestJS module) puede ejecutar queries Drizzle contra estas tablas sin error 42P01 (relation does not exist)"
affects: [29-03, 29-04, 29-05, 30, 31, 32]

tech-stack:
  added: []
  patterns:
    - "drizzle-kit migrate aplicado headless desde host (no docker exec) por configuración de red"
    - "Smoke test SQL con DO $$ ... EXCEPTION WHEN ... block para verificar constraints in-line"

key-files:
  created:
    - .planning/phases/29-catalogos-de-atributos/29-02-SUMMARY.md
  modified: []

key-decisions:
  - "Migrate ejecutado desde el HOST (no desde docker compose exec backend) porque el container backend usa DATABASE_URL=postgresql://...@postgres:5432/... pero NO existe service `postgres` en este compose — la DB corre en el host (localhost:5432) y es accedida via red docker externa `sanchez_docker_network`"
  - "Pre-flight de seguridad confirmó cero DROP/TRUNCATE/DELETE en 0004 y 0005 — purely additive"
  - "Drizzle aplicó solamente idx 3 e idx 4 del journal (0004 y 0005); 0003 está fuera del journal y NO fue aplicado por drizzle (consistente con la nota del SUMMARY 29-01 sobre journal drift)"
  - "DB local no es una DB greenfield: tiene ~101k articulos del proyecto sanchezrepuestos. Las migrations son aditivas (solo agregan tablas que no existían) — cero riesgo para datos existentes"

patterns-established:
  - "Fase de schema-push como gate técnico explícito: el filesystem (Plan 01) y la DB (Plan 02) se sincronizan antes de Plan 03 (backend module)"
  - "Smoke test inline con DO $$ ... EXCEPTION ... END $$ para validar comportamiento de constraints sin requerir framework de testing"

requirements-completed: []

duration: 2min 30s
completed: 2026-04-30
---

# Phase 29 Plan 02: Apply Migrations 0004 + 0005 (Schema Push) Summary

**Migrations 0004 (6 tablas prop_*) y 0005 (cache trigger no-op) aplicadas exitosamente contra `erp_sanchez` en Postgres 17.8 local; 6 tablas físicas con 24 indexes y 6 CHECK constraints verificados; 4 smoke tests pasaron (CHECK rejecta lowercase, UNIQUE abrev rejecta duplicates, UNIQUE LOWER(nombre) rejecta case-insensitive duplicates).**

## Performance

- **Duration:** ~2 min 30s
- **Started:** 2026-04-30T17:27:05Z
- **Completed:** 2026-04-30T17:29:35Z
- **Tasks:** 2
- **Files modified:** 0 source / 1 doc (this SUMMARY.md)
- **DB tables created:** 6 (prop_color, prop_marca, prop_material, prop_objeto, prop_presentacion, prop_talle)

## Accomplishments

- **Migration runner ejecutado:** `pnpm db:migrate` desde `apps/backend/` (host) terminó con `[✓] migrations applied successfully!` y exit 0.
- **Drizzle aplicó exactamente 2 archivos:** los 2 nuevos en el journal (idx 3 → `0004_phase29_propiedades`, idx 4 → `0005_phase29_cache_trigger`). La tabla `drizzle.__drizzle_migrations` pasó de 3 entries a 5.
- **6 tablas físicamente creadas:** `\dt prop_*` muestra `prop_color, prop_marca, prop_material, prop_objeto, prop_presentacion, prop_talle` (orden alfabético, owner sanchez).
- **Shape correcta:** `\d prop_marca` y `\d prop_color` muestran 6 columnas (id, nombre, abrev, activo, created_at, updated_at), 4 indexes (PK + abrev_uniq + activo_idx + nombre_lower_uniq), 1 CHECK constraint sobre abrev.
- **24 indexes totales:** count via `pg_indexes WHERE tablename LIKE 'prop_%'` = 24 = 6 tablas × 4 indexes.
- **6 CHECK constraints:** count via `pg_constraint WHERE conname LIKE 'prop_%_abrev_format_chk'` = 6.
- **Cero operaciones destructivas:** grep del log de migrate buscando `DROP|TRUNCATE|DELETE|error|failed|aborted` retornó cero matches. Las únicas líneas de severity NOTICE fueron del bootstrap de drizzle (`schema "drizzle" already exists, skipping` y `relation "__drizzle_migrations" already exists, skipping`) — esto es esperado en una DB que ya tenía drizzle inicializado.

## Verification Output

### `\dt prop_*`

```
              List of relations
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+---------
 public | prop_color        | table | sanchez
 public | prop_marca        | table | sanchez
 public | prop_material     | table | sanchez
 public | prop_objeto       | table | sanchez
 public | prop_presentacion | table | sanchez
 public | prop_talle        | table | sanchez
(6 rows)
```

### `\d prop_marca` (representativa — las 6 tienen shape idéntica)

```
                                        Table "public.prop_marca"
   Column   |            Type             | Collation | Nullable |                Default
------------+-----------------------------+-----------+----------+----------------------------------------
 id         | integer                     |           | not null | nextval('prop_marca_id_seq'::regclass)
 nombre     | text                        |           | not null |
 abrev      | text                        |           | not null |
 activo     | boolean                     |           | not null | true
 created_at | timestamp without time zone |           | not null | now()
 updated_at | timestamp without time zone |           | not null | now()
Indexes:
    "prop_marca_pkey" PRIMARY KEY, btree (id)
    "prop_marca_abrev_uniq" UNIQUE, btree (abrev)
    "prop_marca_activo_idx" btree (activo)
    "prop_marca_nombre_lower_uniq" UNIQUE, btree (lower(nombre))
Check constraints:
    "prop_marca_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$'::text)
```

### Smoke tests (todos PASS)

| # | Test                                                              | Resultado esperado            | Resultado real       |
| - | ----------------------------------------------------------------- | ----------------------------- | -------------------- |
| 1 | INSERT (`'TestSmoke'`, `'TS'`)                                    | succeed                       | `INSERT 0 1` PASS    |
| 2 | INSERT (`'TestLower'`, `'ts'`) — abrev lowercase                   | FAIL con check_violation      | NOTICE OK PASS       |
| 3 | INSERT (`'OtraMarca'`, `'TS'`) — abrev duplicado                   | FAIL con unique_violation     | NOTICE OK PASS       |
| 4 | INSERT (`'TESTSMOKE'`, `'TX'`) — nombre case-insensitive duplicado | FAIL con unique_violation     | NOTICE OK PASS       |
| 5 | DELETE WHERE abrev='TS' (cleanup)                                 | DELETE 1                      | `DELETE 1` PASS      |
| 6 | SELECT COUNT(*) WHERE abrev='TS' (post-cleanup)                   | 0                             | `0` PASS             |

### `drizzle.__drizzle_migrations` después del migrate

```
 id |                               hash                               |  created_at
----+------------------------------------------------------------------+---------------
  1 | 48f837a5...e8f56c1                                                | 1772422128557
  2 | 05a9b273...c5013568                                               | 1772469220121
  3 | 870f2072...e433f480                                               | 1772627204469
  4 | 16dddfe1...30fab1b2                                               | 1777569630018  ← NUEVA (0004)
  5 | fcec7e44...74fbfc1                                                | 1777569630019  ← NUEVA (0005)
(5 rows)
```

## Task Commits

Plan 02 NO produjo cambios de código fuente. La aplicación de las migrations cambia el estado de la DB, no el filesystem. Por eso este plan tiene un único commit final que captura la SUMMARY:

1. **Final docs commit:** SUMMARY.md de 29-02 (commit hash al hacer `git commit`).

> Nota: la convención del executor es "1 commit por task". En este plan, ambas tasks son verificaciones contra una base de datos externa (estado mutable fuera de git). No hay diff que comitear entre tasks. La práctica adoptada es un único `docs(29-02)` commit al final con la SUMMARY (es el único artefacto del plan que vive en git).

## Decisions Made

- **Migrate ejecutado desde el host, no desde el container backend.** El plan instruyó `docker compose exec -T backend pnpm db:migrate` asumiendo que el `postgres` service estaría en el mismo compose. La realidad de este proyecto: el compose tiene SOLO `erp-backend` y `erp-web` (no postgres), conectados a `sanchez_docker_network` (externa). El container backend tiene `DATABASE_URL=postgresql://...@postgres:5432/...` (resuelve via red externa). Como el host también tiene psql + el `.env` del repo apunta a `localhost:5432` (mismo Postgres físico), correr `pnpm db:migrate` desde `apps/backend/` en el host es funcionalmente equivalente y más simple. No se necesita ajustar `_journal.json` ni `__drizzle_migrations` — el path de drizzle es agnóstico al network namespace.
- **0003_add_columna_inv_articulos.sql NO se aplicó.** Su tag no está en `_journal.json` (el journal salta de idx 2 a idx 3 con tag 0004). Esto es intencional — el archivo es un fix manual previo (commit `b94f384f`, abril 2026) que está fuera del flujo de drizzle-kit y nunca se journaló. drizzle-kit migrate ignoró el archivo correctamente.
- **DB local resultó tener datos de producción real (~101k artículos en `articulos`).** No es greenfield. La regla del proyecto "NUNCA borrar tablas de producción sin autorización" requirió pre-flight de seguridad: confirmé que 0004 y 0005 son puramente aditivos (cero `DROP`, `TRUNCATE`, `DELETE`). Las tablas existentes (articulos, comprobantes_*) NO fueron tocadas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan asumía `postgres` service en docker compose; la realidad es que la DB corre en host**

- **Found during:** Pre-flight Docker (paso 3 del action de Task 1)
- **Issue:** El plan instruía `docker compose exec -T backend pnpm db:migrate`. Pero `docker compose ps` muestra solo `erp-backend` y `erp-web` — no hay servicio `postgres` ni `db` en el compose. El backend container resuelve `postgres:5432` via red docker externa (`sanchez_docker_network`), pero no podemos `docker compose exec` un servicio que no existe en este compose.
- **Causa raíz:** Drift entre el plan (escrito asumiendo el compose tiene postgres) y la realidad del setup local (Postgres es un servicio del host, compartido vía red docker externa).
- **Fix:** Ejecutar `pnpm db:migrate` desde el host directamente (cwd `apps/backend/`, usa el `.env` que apunta a `localhost:5432`). Mismo resultado funcional — drizzle-kit es agnóstico al network namespace.
- **Files modified:** ninguno
- **Verification:** `[✓] migrations applied successfully!`, exit 0, 6 tablas creadas, 5 entries en `__drizzle_migrations`.

**2. [Rule 3 - Blocking] Adaptación del comando psql a credenciales reales del host**

- **Found during:** Task 2 (verificación post-migrate)
- **Issue:** El plan sugirió `docker compose exec -T postgres psql -U postgres -d objetiva_dev`. Pero (a) no hay service `postgres` y (b) la DB se llama `erp_sanchez`, no `objetiva_dev`, y el usuario es `sanchez`, no `postgres`.
- **Fix:** Usar psql nativo del host con credenciales del `.env`: `PGPASSWORD='S4nch3zR3pu3st0s' psql -h localhost -p 5432 -U sanchez -d erp_sanchez`. Mismo resultado funcional.
- **Files modified:** ninguno
- **Verification:** todas las queries de verificación retornaron resultados esperados (count=6 tablas, count=24 indexes, count=6 CHECKs).

---

**Total deviations:** 2 (ambas Rule 3 - Blocking, adaptaciones operacionales sin impacto en el resultado funcional).
**Impact on plan:** Cero — los acceptance criteria y la funcionalidad entregada son idénticos al plan. Solo cambió el medio (host en vez de container) por la realidad del compose local.

## Issues Encountered

- **Worktree base incorrecto al iniciar:** worktree estaba en `a5438bee...` en vez del HEAD esperado `342e3edb...`. Resuelto via `git reset --hard 342e3edb...` siguiendo el `<worktree_branch_check>` protocol.
- **DB local tiene datos de producción reales.** No es la "DB de desarrollo PG16" que el plan describe — es PG17.8 con ~101k artículos del ERP de Sanchez Repuestos. Esto fue mitigado verificando que las migrations son puramente aditivas antes de ejecutar (regla del proyecto: nunca DROP sin autorización). El resultado es seguro: las tablas nuevas se crearon sin tocar las existentes.

## User Setup Required

None — la DB ya estaba accesible y tenía drizzle inicializado.

## Next Phase Readiness

**Ready for Plan 29-03 (NestJS module + DTOs):**
- Las 6 tablas existen físicamente. Cualquier query de Drizzle (`db.select().from(propMarca)`) funcionará sin error 42P01.
- Los CHECK constraints de la DB son defensa-en-profundidad — el DTO en NestJS puede aplicar el mismo regex en zod, pero la DB rechazará cualquier insert que llegue con abrev malformada (incluso si el DTO falla en validar).
- El UNIQUE LOWER(nombre) garantiza que no haya duplicados case-insensitive, lo cual elimina la necesidad de un check JS pre-insert (UPSERT/INSERT puede confiar en la DB para detectar duplicados via SQLSTATE 23505).

**Ready for Plan 29-04+ (UI):**
- El backend de Plan 03 podrá exponer endpoints contra estas tablas. La UI consumirá esos endpoints sin tocar la DB directamente.

**Concerns / heads-up para fases futuras:**
- **El trigger de cache_nombre_prop sigue gated** (en `0005_phase29_cache_trigger.sql` el bloque está en `/* ... */`). Phase 30/31 lo descomentará cuando agregue las FK desde `articulos.<prop>_id`. Re-aplicar 0005 sería no-op (ya está en `__drizzle_migrations`); para activar, Phase 30/31 deberá: (a) generar una nueva migration que agregue las FK + descomente el trigger SQL, o (b) ejecutar el SQL del trigger via un nuevo migration con un tag distinto.
- **Drift histórico del journal sigue presente.** Las migrations 0000-0002 referencian un schema antiguo que ya no coincide con `schema.ts` (ver SUMMARY 29-01 deviation #2). Esto NO afecta a Phase 29 ni a Plan 03+, pero conviene atacarlo en una quick-task antes de Phase 30 para que `db:generate` vuelva a ser ejecutable headless.

## Self-Check

Verificaciones realizadas tras escritura del SUMMARY:

- [x] **6 tablas físicas existen:** `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'prop\_%'` retornó `6`.
- [x] **24 indexes existen:** `SELECT count(*) FROM pg_indexes WHERE tablename LIKE 'prop\_%'` retornó `24`.
- [x] **6 CHECK constraints existen:** `SELECT count(*) FROM pg_constraint WHERE conname LIKE 'prop\_%\_abrev\_format\_chk'` retornó `6`.
- [x] **drizzle.__drizzle_migrations tiene 5 entries:** verificado, las 2 últimas son las nuevas (timestamps 1777569630018 y 1777569630019, matching `_journal.json` idx 3 e idx 4).
- [x] **Smoke tests pasaron 4/4:** verificado en `/tmp/phase29-smoke.log` con NOTICE OK en cada uno.
- [x] **Cleanup confirmado:** `SELECT count(*) FROM prop_marca WHERE abrev='TS'` retornó `0`.
- [x] **Sin operaciones destructivas:** grep del migrate log buscando `DROP|TRUNCATE|DELETE|error|failed|aborted` retornó cero matches.
- [x] **SUMMARY.md creado en path correcto:** `.planning/phases/29-catalogos-de-atributos/29-02-SUMMARY.md`.

## Self-Check: PASSED

---
*Phase: 29-catalogos-de-atributos*
*Plan: 02*
*Completed: 2026-04-30*
