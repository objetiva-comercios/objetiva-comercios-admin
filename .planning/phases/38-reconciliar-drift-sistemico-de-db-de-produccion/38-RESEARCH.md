# Phase 38: Reconciliar drift sistemico de DB de produccion - Research

**Researched:** 2026-05-02
**Domain:** Drizzle migration tracking reconciliation (PostgreSQL, NestJS backend, GitHub Actions CI greenfield)
**Confidence:** HIGH (hash algorithm verified in source, NestJS patterns verified in repo, CI patterns verified in official GH docs)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Repair journal-only.** NO reset full, NO drop schema, NO introspect+rebaseline. Solo se sincroniza el tracking (journal local + `__drizzle_migrations` en prod). Riesgo bajo, downtime cero, preserva data 100%.
- **D-02 Forward marker + 0006 baseline.** Journal local: añadir entries 0003/0004/0005 con timestamps reales. Snapshots 0003/0004/0005 = copias de `0002_snapshot.json` (dummies — Drizzle solo consulta el LAST snapshot). Correr `pnpm --filter backend db:generate` → `0006_baseline.sql`. Si contiene ALTERs reales → escalar al usuario antes de aplicar.
- **D-03 Audit-first + INSERT idempotente en `__drizzle_migrations`.** NUNCA `UPDATE`/`DELETE`/`TRUNCATE`. AUDIT (read-only) → calcular `sha256` del file SQL local → comparar con hash registrado → INSERT entries faltantes con timestamps reales. Si auditoría revela hashes mismatched → escalar al usuario.
- **D-04 Verificación triple post-fix.**
  1. `pnpm --filter backend db:generate --check` → "No changes"
  2. `drizzle-kit introspect` contra prod → diff vs `schema.ts` → vacío o solo cosmético
  3. Smoke playwright en los 10 módulos del admin (read-only) → 200 + ausencia de 500
- **D-05 Pre-flight obligatorio (gate de avance).** `pg_dump -F c` + restore en DB temporal (`erp_restore_test`) + comparar row counts en 6 tablas críticas + drop DB temp + persistir backup en `/var/backups/erp_sanchez/` por mínimo 30 días. Si restore-test falla → ABORTAR la fase.
- **D-06 `_prisma_migrations` queda intacta.** Legacy metadata, ruido aceptable.
- **D-07 `comprobantes_cabecera/detalle/pagos` quedan intactas.** Sistema legacy con data viva.
- **D-08 Drift residual se audita y se proponen fixes — NO se aplican automáticamente.** 2 drifts conocidos: `inventarios_articulos.sector_id` huérfano + `inventario_sectores.columnas` jsonb mismatch. Reporte estructurado con fix propuesto y toggle "aplicar / diferir / rechazar".
- **D-09 `drizzle-kit check` en CI (GitHub Actions), no en pre-commit.** Step nuevo + script `db:check` en `apps/backend/package.json`. Falla el build si hay drift. Researcher decide infra de DB.
- **D-10 Healthcheck SQL en backend.** `GET /api/health/db` chequea 5 tablas (`business_settings`, `articulos`, `existencias`, `prop_marca`, `orders`) con `SELECT 1 FROM <t> LIMIT 0`. 503 si falla. Cableado a `docker-compose.yml` como `healthcheck` con interval 30s.
- **D-11 ADR + entrada en CLAUDE.md sobre disciplina de migraciones.** Convención: cualquier cambio de schema en prod va por `pnpm db:migrate`. Excepción única: emergencia documentada en quick task con SUMMARY listando Pending Actions; cada Pending Action que toque prod queda como `BLOCKING-PROD-*` todo en `.planning/todos/pending/`.
- **D-12 Logging mejorado del SQL error cause queda diferido.**
- **D-13 Solo prod (`erp_sanchez` en VPS) en Phase 38.** DBs locales de devs no entran al scope.
- **D-14 Smoke playwright en los 10 módulos del admin.** Read-only — sin mutation flows. Captures solo en caso de fallo.
- **D-15 Backups persisten 30 días en VPS.** Path: `/var/backups/erp_sanchez/`. Naming: `backup-YYMMDD-HHMM.dump`.

### Claude's Discretion

- **CI infra para DB de test del step `drizzle-kit check`:** Postgres service container vs DB staging vs Postgres efímero — researcher/planner decide.
- **Shape exacto del endpoint `/api/health/db`:** controller standalone vs reusar `health` existente; response shape; verbose mode — planner decide siguiendo patrones NestJS.
- **Algoritmo de cálculo de hashes para `__drizzle_migrations`:** confirmar leyendo `drizzle-orm/migrator.ts`, NO inferir.
- **Formato del reporte de drift residual:** markdown vs JSON; archivo separado vs sección — planner decide.
- **Naming exacto del file ADR:** verificar precedentes; usar mismo path si existen.
- **Cronjob de cleanup de backups antiguos:** out of scope formal; opcional.

### Deferred Ideas (OUT OF SCOPE)

- Cleanup de `_prisma_migrations` (housekeeping legacy).
- Cleanup de `comprobantes_*` legacy (sistema ERP/POS legacy con data viva).
- Aplicar `DROP COLUMN inventarios_articulos.sector_id` automáticamente (drift residual; requiere OK explícito).
- Patch a `inventario_sectores.columnas` en `schema.ts` `$type<number[]>()` (drift residual; opcional in-scope si planner lo considera trivial).
- Logging mejorado del cause de errores SQL.
- Cronjob automático de cleanup de backups.
- Reconciliación de DBs locales de devs.
- `drizzle-kit check` en pre-commit local.
- **Mutation flows en smoke playwright** (D-14: read-only only).
  </user_constraints>

<phase_requirements>

## Phase Requirements

Phase 38 NO está mapeada a requirements de v1.3 — es una phase reactiva post-detección. Los success criteria salen del Goal del roadmap + las 15 decisiones lockeadas en CONTEXT.md.

| ID derivado del Goal | Descripción                                                                                                                                                  | Research Support                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| SC-PRE               | `pg_dump` + restore-test pasa con counts matching antes de tocar nada (D-05)                                                                                 | Pre-flight Gate, Validation Architecture §Backup verification  |
| SC-JOURNAL           | `_journal.json` local tiene 7 entries (0000-0006) con `idx`, `tag`, `when`, `breakpoints` correctos                                                          | §Drizzle internals — journal entry format                      |
| SC-SNAPS             | `meta/0003_snapshot.json`, `0004_snapshot.json`, `0005_snapshot.json` existen como dummies con UUIDs únicos y prevId chain válida                            | §Drizzle internals — snapshot UUID chain                       |
| SC-BASELINE          | `0006_baseline.sql` generado por `db:generate` y auditado (vacío = ideal; con CREATE TABLE prop\_\* = esperado, requiere stamp-only handling)                | §Drizzle internals — generate diff behavior                    |
| SC-PROD-AUDIT        | Reporte AUDIT de `drizzle.__drizzle_migrations` producido + diff de hashes calculados vs registrados                                                         | §Drizzle internals — hash algorithm + table location           |
| SC-PROD-INSERT       | INSERTs idempotentes ejecutados solo después de aprobación del usuario sobre el reporte                                                                      | §Risks — INSERT must be transactional with explicit human gate |
| SC-VERIFY-1          | `pnpm --filter backend db:check` (`drizzle-kit check && drizzle-kit generate --check`) corre limpio                                                          | §Validation Architecture — gate triple                         |
| SC-VERIFY-2          | `drizzle-kit pull` contra prod → diff vs `schema.ts` muestra solo diferencias cosméticas o los 2 drifts residuales conocidos                                 | §Drizzle internals — introspect output                         |
| SC-VERIFY-3          | Smoke playwright (read-only, 10 módulos) reporte verde                                                                                                       | §Validation Architecture — smoke harness                       |
| SC-CI                | Workflow `.github/workflows/ci.yml` con step `pnpm --filter backend db:check` ejecutado contra Postgres service container, falla el build en drift sintético | §CI Infra Recommendation                                       |
| SC-HEALTH            | `GET /api/health/db` retorna 200 con 5 tablas OK; retorna 503 si alguna falla; integrado en `docker-compose.yml` como `healthcheck:` block                   | §NestJS Health Module Recommendation                           |
| SC-ADR               | `.planning/decisions/migration-discipline.md` (o equivalente) creado + entry en `CLAUDE.md` §convenciones                                                    | §Open Questions Q5 — ADR location                              |
| SC-DRIFT-REPORT      | Reporte estructurado de drift residual con propuestas de fix por cada item, sin auto-aplicar (D-08)                                                          | §Risks landmines — drift residual                              |

</phase_requirements>

## Executive Summary

Cinco hallazgos críticos que cambian el plan respecto a CONTEXT.md sin invalidarlo:

1. **Hash algorithm CONFIRMADO** [VERIFIED: drizzle-team/drizzle-orm `drizzle-orm/src/migrator.ts`]: `crypto.createHash('sha256').update(query).digest('hex')` donde `query = fs.readFileSync('${migrationFolderTo}/${journalEntry.tag}.sql').toString()`. Es **el contenido completo del archivo SQL en UTF-8 incluyendo trailing newline si lo tiene**. NO se split por `--> statement-breakpoint` antes del hash. NO se normaliza whitespace. El planner debe calcular el hash con `sha256sum apps/backend/drizzle/0000_open_anita_blake.sql | awk '{print $1}'` (POSIX) o `node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" apps/backend/drizzle/0000_open_anita_blake.sql` para reproducir exactamente lo que `drizzle-kit migrate` calcularía.

2. **`__drizzle_migrations` NO está en `public`. Está en `drizzle.__drizzle_migrations`** [VERIFIED: drizzle-team/drizzle-orm `drizzle-orm/src/pg-core/dialect.ts`; CITED: orm.drizzle.team/docs/drizzle-config-file]. El default de Drizzle es `migrations.schema = 'drizzle'` y este proyecto NO sobrescribe en `drizzle.config.ts`. **El comando AUDIT en CONTEXT.md (`SELECT … FROM __drizzle_migrations`) FALLARÁ con `relation does not exist`** salvo que `search_path` incluya `drizzle` o se califique con `drizzle.__drizzle_migrations`. El plan debe usar el nombre cualificado en TODOS los SQL contra `__drizzle_migrations`.

3. **`drizzle-kit migrate` skipea por timestamp `created_at`, NO por hash equality** [VERIFIED: drizzle-team/drizzle-orm `drizzle-orm/src/pg-core/dialect.ts`]. La query es `SELECT id, hash, created_at FROM ${schema}.__drizzle_migrations ORDER BY created_at DESC LIMIT 1` y el guard es `Number(lastDbMigration.created_at) < migration.folderMillis`. Implicación: para "stampear" una migración como aplicada sin re-ejecutarla, basta con un INSERT cuya `created_at` sea ≥ al `folderMillis` de la migración. **El hash es solo metadata para auditoría humana y `drizzle-kit check`, no para skip-logic.** Esto simplifica D-03: si solo nos preocupa que `drizzle-kit migrate` no re-ejecute, basta con asegurar que existe al menos un row con `created_at` ≥ `folderMillis_de_0006_baseline`. Para audit cleanliness querremos las 7 entries (0000-0006) presentes con sus hashes correctos calculados.

4. **`drizzle-kit generate` con dummies copia-de-0002 NO producirá un `0006_baseline.sql` vacío.** Drizzle genera comparando `schema.ts` contra el LAST snapshot del journal. Como `schema.ts` ya contiene las 6 tablas `prop_*` + `inventarios_articulos.columna` (verificado por grep), pero `0002_snapshot.json` NO las contiene (verificado por grep), el `0006_baseline.sql` resultante contendrá `CREATE TABLE prop_color/marca/material/objeto/presentacion/talle` + `ALTER TABLE inventarios_articulos ADD COLUMN columna`. **Drizzle 0.31.x no emite `IF NOT EXISTS`** (verificado en `0004_phase29_propiedades.sql` del propio repo: `CREATE TABLE "prop_color" (` sin IF NOT EXISTS). Aplicar este SQL a prod fallará por `relation already exists`. **Estrategia obligatoria: stamp-only — NUNCA ejecutar `0006_baseline.sql` en prod**, solo INSERTar su entry en `__drizzle_migrations` con `created_at` apropiado para que futuras `migrate` skipeen el archivo. Documentar el SQL como "stamped, not executed" en su header como comentario.

5. **No existe `apps/backend/src/health/`, no existe `.github/workflows/`, no existe `.planning/decisions/` ni `docs/adr/`. Phase 38 es greenfield para esos 3 dominios.** Patrones a seguir: (a) el endpoint `/api/health` standalone existente en `app.controller.ts` (sin Terminus) sirve como template — `@nestjs/terminus` NO tiene HealthIndicator nativo para Drizzle ([CITED: github.com/nestjs/terminus/issues/2616, abierto Feb 2025]); recomiendo controller standalone que inyecte `DrizzleService` y ejecute `SELECT 1 FROM <t> LIMIT 0` por cada tabla en una lista. (b) Postgres service container en GitHub Actions con `pg_isready` healthcheck es el patrón canónico [CITED: docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers]. (c) Para el ADR, no hay convención previa — la propuesta de CONTEXT.md `.planning/decisions/migration-discipline.md` es razonable; alternativa: `.planning/research/` ya existe como ubicación de documentación arquitectónica.

**Primary recommendation:** Plan 6 waves: (W1) Pre-flight gate D-05, (W2) Local journal+snapshot+baseline reconciliation D-02 con stamp-only handling, (W3) Prod AUDIT con SQL cualificado `drizzle.__drizzle_migrations` D-03, (W4) Triple verification D-04 con introspect via `drizzle-kit pull --out=/tmp/drift-check`, (W5) Healthcheck endpoint + docker healthcheck wiring D-10, (W6) CI workflow + ADR + CLAUDE.md update D-09/D-11. Cada wave con human-gate explícito para steps destructivos o que tocan prod.

## Architectural Responsibility Map

| Capability                               | Primary Tier            | Secondary Tier | Rationale                                                                       |
| ---------------------------------------- | ----------------------- | -------------- | ------------------------------------------------------------------------------- |
| Pre-flight backup + restore-test         | DB / Storage (VPS host) | —              | `pg_dump`/`pg_restore` ejecutados via `docker exec postgres` desde el VPS shell |
| Repair `_journal.json` + dummy snapshots | Filesystem (repo)       | —              | Files committeados al repo; cero contacto con DB en este step                   |
| Generate `0006_baseline.sql`             | Filesystem (repo)       | —              | `drizzle-kit generate` lee solo `schema.ts` + `meta/`, no toca DB               |
| AUDIT `__drizzle_migrations` (read-only) | DB (VPS)                | —              | `psql -c 'SELECT …'` via docker                                                 |
| INSERT entries faltantes (write)         | DB (VPS)                | —              | `psql -c 'INSERT …'` via docker, transaccional, idempotente, audit-gated        |
| Healthcheck endpoint `/api/health/db`    | API / Backend (NestJS)  | DB (read)      | NestJS controller; ejecuta SELECT contra DB                                     |
| Docker `healthcheck:` block              | Container runtime       | —              | `docker-compose.yml` instruye al runtime a curl localhost                       |
| `drizzle-kit check` en CI                | Build / CI              | DB (ephemeral) | GitHub Actions runner + Postgres service container                              |
| Smoke playwright multi-módulo            | Browser (read-only)     | API + DB       | playwright-cli skill global; verifica 200 + ausencia de 500 en logs backend     |
| ADR + CLAUDE.md update                   | Filesystem (repo)       | —              | Markdown docs; cero impacto runtime                                             |

## Drizzle Internals (Critical Discretion Answers)

### 1. Hash algorithm para `__drizzle_migrations.hash`

**Algoritmo CONFIRMADO** [VERIFIED: drizzle-team/drizzle-orm GitHub `drizzle-orm/src/migrator.ts`]:

```typescript
// readMigrationFiles() in drizzle-orm/src/migrator.ts
const query = fs.readFileSync(`${migrationFolderTo}/${journalEntry.tag}.sql`).toString();
// ... hash computed BEFORE statement-breakpoint split:
hash: crypto.createHash('sha256').update(query).digest('hex'),
```

**Reglas exactas:**

- Algoritmo: **SHA-256**
- Input: **archivo SQL completo** (`fs.readFileSync(...).toString()` → UTF-8 por default de Node.js)
- **Trailing newline INCLUIDO** si el archivo termina en `\n` (la mayoría de los archivos del repo terminan así — confirmar con `tail -c 1 0000_*.sql | od -c`)
- **NO normalización**: ni whitespace, ni line-endings (CRLF vs LF importa), ni comments
- **NO split por `--> statement-breakpoint`** antes del hash: el split ocurre DESPUÉS del cálculo
- Output: hex string lowercase, 64 chars (`digest('hex')`)

**Comandos para reproducir el hash que insertaríamos:**

```bash
# POSIX-compatible (recomendado, idéntico a Drizzle):
sha256sum apps/backend/drizzle/0000_open_anita_blake.sql | awk '{print $1}'

# Equivalente Node.js exacto (si POSIX da diferencia por line-endings):
node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" \
  apps/backend/drizzle/0000_open_anita_blake.sql
```

**Pitfall — line endings:** Si algún archivo SQL tiene CRLF (Windows-style) y otro LF (Unix), los hashes diferirán de lo que generaría drizzle-kit en otra máquina. Verificar con `file apps/backend/drizzle/*.sql` que todos sean "ASCII text" (LF) y no "ASCII text, with CRLF line terminators". El repo está en Linux, esto debería ser consistente, pero el plan debe verificarlo como step previo.

### 2. `drizzle-kit generate` con journal forward-marker + snapshots dummy — comportamiento real

**Findings** [VERIFIED: orm.drizzle.team/docs/drizzle-kit-generate, drizzle-orm/src/migrator.ts]:

- `generate` lee `schema.ts` → produce JSON snapshot in-memory → diff contra el **LAST snapshot referenciado por el journal** (LAST = última entry por idx).
- El SQL emitido refleja TODAS las diferencias entre el snapshot LAST y el snapshot in-memory.
- **Drizzle 0.31.x NO emite `IF NOT EXISTS`** (verificado leyendo `0004_phase29_propiedades.sql` del repo: `CREATE TABLE "prop_color" (` sin IF NOT EXISTS). En docs antiguas (drizzle-orm v0.16.x) sí — fue removido.

**Resultado esperado en este caso:**

- `schema.ts` actual contiene: `business_settings` (de 0002), 6 tablas `prop_*` (de 0004), `inventarios_articulos.columna` integer (de 0003).
- LAST snapshot tras D-02 = `0005_snapshot.json` = copia bit-a-bit de `0002_snapshot.json` = NO contiene `prop_*` ni `columna`.
- Diff resultante en `0006_baseline.sql`:
  - `CREATE TABLE "prop_color" (...)`, `prop_marca`, `prop_material`, `prop_objeto`, `prop_presentacion`, `prop_talle` — los 6 con sus indices
  - `ALTER TABLE "inventarios_articulos" ADD COLUMN "columna" integer;`
  - Posibles diferencias adicionales si `schema.ts` evolucionó en otros puntos no documentados — esto es el "drift estructural adicional" del que habla D-02 paso 4.

**Implicación operacional para D-02 paso 5:**

- "Marcar `0006_baseline` como aplicado en prod via INSERT en `__drizzle_migrations`" debe ser **stamp-only — NUNCA `psql -f 0006_baseline.sql` en prod**. Las 6 tablas `prop_*` ya existen, ejecutar el SQL fallará.
- Plan: añadir como header al `0006_baseline.sql` un comentario:
  ```sql
  -- 0006_baseline.sql — STAMPED, NOT EXECUTED in production.
  -- Applied retroactively as INSERT into drizzle.__drizzle_migrations (Phase 38 D-03).
  -- Schema state captured here was already in production via:
  --   0003 (manual psql 2026-04-29, quick task 260429-rec)
  --   0004 (manual psql 2026-05-01, smoke phase 29)
  --   0005 (no-op trigger comment block, manual 2026-05-01)
  -- Re-running this file against an aligned DB will fail with "relation already exists".
  -- See ADR: .planning/decisions/migration-discipline.md
  ```
- Post-fix, cualquier dev que haga `git pull` + tenga DB local SIN las prop\_\* hará `pnpm db:migrate` y el `0006_baseline.sql` se ejecutará contra esa DB local creando las tablas. **Esto es problemático para devs locales** — el SQL se ejecutaría en su entorno pero ya está stamped en prod. Necesario documentar en SUMMARY que devs locales recreen DB desde scratch (`pnpm db:push --force` o drop+recreate `erp_local`).

**Alternativa más limpia (recomendada):** En lugar de dummies copia-de-0002, **construir snapshots 0003/0004/0005 que reflejen progresivamente el state real** (0003 = 0002 + columna; 0004 = 0003 + prop\_\*; 0005 = 0004 sin cambios reales por ser custom trigger comentado). Esto requiere editar JSON manualmente, es propenso a errores. Pros: `0006_baseline.sql` queda casi vacío, bien comportado para devs. Contras: mucho trabajo + riesgo de invalidar `drizzle-kit check`. **Decisión recomendada: aceptar la opción simple (dummies = 0002) y aplicar la mitigación stamp-only + comentario header + nota explícita en SUMMARY para devs.** El usuario eligió "Repair journal-only", esto es coherente.

**Pitfall crítico — UUIDs de snapshots:** Cada `meta/NNNN_snapshot.json` tiene `"id": "<UUID>"` y `"prevId": "<UUID anterior>"` formando una cadena. Si copias `0002_snapshot.json` como `0003_snapshot.json`, ambos tendrán el mismo `id` y mismo `prevId` — `drizzle-kit check` puede detectarlo como cadena rota o duplicada. **El plan debe regenerar UUIDs únicos para cada dummy y reencadenar `prevId`:**

```
0002.id = af93b79c-... (existente)
0003.id = <nuevo UUID v4>, 0003.prevId = af93b79c-...
0004.id = <nuevo UUID v4>, 0004.prevId = 0003.id
0005.id = <nuevo UUID v4>, 0005.prevId = 0004.id
0006.id = <generado por drizzle-kit>, 0006.prevId = 0005.id
```

Comando: `node -e "console.log(crypto.randomUUID())"` produce un UUID v4. Hacer los 3 nuevos antes del `db:generate`.

### 3. CI infra para `drizzle-kit check`

**Estado actual del repo:** No existe `.github/` directory (verificado: `ls .github` → no existe). Greenfield.

**Comparación de las 3 opciones:**

| Opción                                                     | Setup time            | Mantenimiento       | Fidelidad vs prod    | Costo runner     | Riesgo                       |
| ---------------------------------------------------------- | --------------------- | ------------------- | -------------------- | ---------------- | ---------------------------- |
| **A) Postgres service container + `db:push` + `db:check`** | Bajo (5 min)          | Casi cero           | Alta (PG 16 mismo)   | ~30s extra/build | Bajo                         |
| **B) Apuntar a DB de staging existente**                   | Alto (no hay staging) | Alto (gestionar DB) | Máxima (es real-ish) | Cero             | Alto (CI puede romper datos) |
| **C) Postgres efímero + `drizzle-kit migrate` desde cero** | Medio                 | Cero                | Alta                 | ~60s extra/build | Bajo                         |

**Recomendación: Opción A** — `services.postgres` en el job, `db:push` para materializar `schema.ts` en DB efímera, luego `db:check` para verificar consistencia. Es el patrón canónico documentado [CITED: docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers] y bypassa la pregunta "¿drizzle-kit check necesita DB?" — la respuesta es **NO** (`drizzle-kit check` valida journal-vs-snapshots integrity sin DB), pero **`drizzle-kit generate --check` sí necesita DB** porque parte del schema check incluye comparación con state real.

**YAML mínimo recomendado** [CITED: docs.github.com/en/actions/using-containerized-services]:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  drizzle-drift-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16 # Match VPS prod version (16.13)
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: erp_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.0.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend db:push # Materializa schema.ts en DB de test
      - run: pnpm --filter backend db:check # Valida consistency journal + no drift
```

**Script `db:check` para `apps/backend/package.json`** [VERIFIED: orm.drizzle.team/docs/drizzle-kit-check]:

```json
"db:check": "drizzle-kit check && drizzle-kit generate --check"
```

- `drizzle-kit check` valida la cadena journal+snapshots (no necesita DB; valida consistencia interna del repo)
- `drizzle-kit generate --check` verifica que `schema.ts` no tiene cambios pendientes vs el LAST snapshot (no escribe nada, exit 1 si hay drift)

**Trigger de prueba (synthetic drift test) para verificar que el CI realmente atrapa drift:** Crear un draft PR que añade una columna trivial a `articulos` en `schema.ts` sin generar migration → CI debe fallar con exit code 1 en `drizzle-kit generate --check`. Cerrar el PR sin merge.

### 4. NestJS Health module — patrones existentes en el repo

**Estado actual del repo:** No existe `apps/backend/src/health/` directory (verificado). El endpoint `/api/health` existe en `app.controller.ts:7-10`:

```typescript
// apps/backend/src/app.controller.ts (ya existe)
@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
```

**`@nestjs/terminus` ¿debería usarse?**

- Pros: framework estándar NestJS para healthchecks; soporta `HealthCheckService` con composición.
- Contras: **NO tiene `DrizzleHealthIndicator` nativo** ([CITED: github.com/nestjs/terminus/issues/2616, abierto Feb 2025]). Habría que escribir uno custom (extends `HealthIndicator`, ~30 líneas TS).
- Adicional: el resto del backend NO usa terminus actualmente. Introducirlo es nueva dependencia + nuevo patrón.

**Recomendación: controller standalone, sin terminus** — alineado con el patrón existente del backend. ~50 líneas total, cero dependencias nuevas. Estructura:

```
apps/backend/src/
├── health/
│   ├── health.module.ts        # @Module exporta HealthController
│   ├── health.controller.ts    # @Controller('health'), endpoints /health y /health/db
│   └── health.service.ts       # Lógica del check (5 SELECTs)
└── app.module.ts               # Importar HealthModule
```

**Recomendación de shape:** consolidar `/health` y `/health/db` en `HealthController` (mover `health()` desde `app.controller.ts`). Remover de `app.controller.ts` para mantener separación de responsabilidades.

**Implementación de referencia** [VERIFIED: drizzle-orm postgres-js patterns from `apps/backend/src/db/index.ts`]:

```typescript
// apps/backend/src/health/health.service.ts
import { Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DrizzleService } from '../db'

const CRITICAL_TABLES = [
  'business_settings',
  'articulos',
  'existencias',
  'prop_marca',
  'orders',
] as const
type TableName = (typeof CRITICAL_TABLES)[number]

export type TableStatus = { name: TableName; status: 'ok' | 'fail'; error?: string }
export type DbHealth = { ok: boolean; tables: TableStatus[] }

@Injectable()
export class HealthService {
  constructor(private readonly drizzle: DrizzleService) {}

  async checkDb(): Promise<DbHealth> {
    const results = await Promise.all(
      CRITICAL_TABLES.map(async (name): Promise<TableStatus> => {
        try {
          // sql.raw is needed because table names cannot be parameterized
          // sql.identifier safely quote-encloses the table name to prevent injection
          await this.drizzle.db.execute(sql`SELECT 1 FROM ${sql.identifier(name)} LIMIT 0`)
          return { name, status: 'ok' }
        } catch (err) {
          return { name, status: 'fail', error: (err as Error).message }
        }
      })
    )
    return { ok: results.every(r => r.status === 'ok'), tables: results }
  }
}
```

```typescript
// apps/backend/src/health/health.controller.ts
import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import { Public } from '../common/decorators/public.decorator'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Public()
  @Get('db')
  async db() {
    const result = await this.health.checkDb()
    if (!result.ok) {
      // 503 = Service Unavailable (canonical for "I'm alive but a downstream is broken")
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE)
    }
    return result
  }
}
```

```typescript
// apps/backend/src/health/health.module.ts
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

```typescript
// apps/backend/src/app.module.ts (modificar)
// Add: import { HealthModule } from './health/health.module'
// Add to imports[]: HealthModule
// Optional: remove the @Get('health') from app.controller.ts since HealthController owns it
```

**docker-compose.yml — `healthcheck:` block para `erp-backend`:**

```yaml
# docker-compose.yml (root)
services:
  erp-backend:
    # ... resto del bloque existente ...
    healthcheck:
      # http://localhost:3001/api/health/db (api prefix is global per main.ts:19)
      # --silent: no progress; --fail: exit non-zero on HTTP >= 400
      # 30s interval, 10s timeout, 3 retries before marking unhealthy
      test: ['CMD-SHELL', 'curl -fsS http://localhost:3001/api/health/db || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s # Permite tiempo de boot del backend antes de empezar a chequear
```

**Pitfall de `curl` en imagen del backend:** Si el Dockerfile (`docker/backend.Dockerfile`) usa una imagen base alpine slim sin curl, el healthcheck fallará. Plan debe verificar primero si curl está disponible (`docker exec erp-backend which curl`); si no, usar `wget --quiet --spider` o instalar curl en el Dockerfile (preferible) o usar el binario de Node con un script inline (`node -e "..."`).

### 5. `drizzle-kit introspect` workflow para D-04 verificación step 2

**Comando moderno:** `drizzle-kit pull` (alias de `introspect`, [CITED: orm.drizzle.team]). Lo que produce:

- `<out>/schema.ts` — TypeScript schema generado desde DB
- `<out>/relations.ts` — Relations auto-detectadas
- `<out>/0000_<random_name>.sql` — Migration SQL CREATE TABLE para reconstrucción
- `<out>/meta/0000_snapshot.json` — Snapshot inicial

**Output es TypeScript, NO SQL plano para diff directo.** Para D-04 step 2 necesitamos comparar contra `apps/backend/src/db/schema.ts`. Procedimiento recomendado:

```bash
# 1. Pull a una carpeta temporal (NO sobreescribir el schema actual)
mkdir -p /tmp/drift-check
pnpm --filter backend exec drizzle-kit pull \
  --out=/tmp/drift-check \
  --dialect=postgresql \
  --url="$DATABASE_URL_PROD"

# 2. Diff entre el schema generado y el actual
diff -u apps/backend/src/db/schema.ts /tmp/drift-check/schema.ts > /tmp/drift-check/schema.diff

# 3. Análisis del diff:
#    - Diferencias COSMÉTICAS (esperadas, ignorables):
#      * Orden de columnas/tablas dentro del archivo
#      * Whitespace y formatting
#      * Nombres de variables generadas (drizzle usa snake_case literal vs camelCase humano)
#      * Imports diferentes
#      * Defaults expresados como string vs literal
#    - Diferencias REALES (deben investigarse, parte del reporte D-08):
#      * Columnas presentes en DB pero ausentes de schema.ts (huérfanas — ej: sector_id)
#      * Columnas presentes en schema.ts pero ausentes de DB (drift sintáctico)
#      * Tipos diferentes (ej: jsonb vs text)
#      * Constraints/indices diferentes
```

**Drift residual conocido (D-08) que el diff DEBE detectar:**

1. `inventarios_articulos.sector_id` — DB tiene la columna, `schema.ts` no.
2. `inventario_sectores.columnas` — DB es `jsonb` con datos numéricos, `schema.ts` declara `$type<string[]>()` (mismatch de tipado TypeScript-only — `drizzle-kit pull` lo detectará como `jsonb` plain, sin el `$type<>` cast). Este es un mismatch que NO se ve en pull si pull no preserva genéricos.

**Validación del diff: regla de pasaje.** Definir en el plan: el diff es **ACEPTABLE** si las únicas diferencias REALES corresponden exactamente a los 2 drifts residuales del D-08. Cualquier otra diferencia REAL debe escalarse al usuario antes de cerrar la fase. El plan debe documentar el diff esperado como "fingerprint" de validación.

## Standard Stack

### Core (already installed in repo, verified versions)

| Library                  | Version | Purpose                                       | Why standard                           |
| ------------------------ | ------- | --------------------------------------------- | -------------------------------------- |
| `drizzle-orm`            | 0.45.1  | ORM + migrator runtime                        | Already in `apps/backend/package.json` |
| `drizzle-kit`            | 0.31.9  | CLI: generate, migrate, check, pull           | Already devDep                         |
| `postgres` (postgres-js) | 3.4.8   | Postgres driver inyectado en `DRIZZLE_CLIENT` | Already in DbModule                    |
| `@nestjs/common`         | 10.x    | Framework backend                             | All controllers extend its decorators  |

### CI / DevOps additions

| Tool                         | Purpose                           | Notes                                          |
| ---------------------------- | --------------------------------- | ---------------------------------------------- |
| `actions/checkout@v4`        | Repo checkout                     | Standard step                                  |
| `pnpm/action-setup@v4`       | Setup pnpm 9.0.0 (matching local) | Match `package.json#packageManager` if present |
| `actions/setup-node@v4`      | Node 22 (matching local)          | `cache: 'pnpm'` for speed                      |
| `postgres:16` (Docker image) | Service container in CI           | Match VPS PG version 16.13                     |

**Version verification (npm registry):**

```bash
npm view drizzle-orm version          # Latest stable as of research date
npm view drizzle-kit version
```

Verified locally on 2026-05-02: `drizzle-orm@0.45.1`, `drizzle-kit@0.31.9` instalados. **Recomiendo NO upgradear durante Phase 38** — el riesgo de breaking changes en migrator interna agrega ruido. Lock current versions during phase, defer upgrade a una phase futura de housekeeping.

### Don't add

- **`@nestjs/terminus`** — agrega dependency sin valor (no Drizzle indicator; pattern no usado en el resto del backend).
- **`pg` package** — el repo usa `postgres-js` (más rápido, native ESM). No mezclar drivers.
- **`prisma` cleanup tools** — D-06 deja `_prisma_migrations` intacta.

## Architecture Patterns

### System Flow (Phase 38 execution)

```
┌─────────────────────┐
│  Pre-flight (D-05)  │  pg_dump → restore-test → row-count diff → drop test DB
│   GATE: counts OK?  │  /var/backups/erp_sanchez/backup-260502-HHMM.dump
└──────────┬──────────┘
           │ ✓
           ▼
┌─────────────────────────────────────────────┐
│  W2: Local repair (NO DB contact)           │
│  - Edit _journal.json (add 0003,0004,0005)  │
│  - Generate UUIDs for dummy snapshots       │
│  - cp 0002_snapshot.json → 0003,0004,0005   │
│  - Patch UUIDs + prevId chain               │
│  - Run pnpm --filter backend db:generate    │
│  - Audit 0006_baseline.sql (expect CREATE   │
│    TABLE prop_* + ALTER columna)            │
│  - Add stamp-only header comment            │
└──────────┬──────────────────────────────────┘
           │ ✓
           ▼
┌────────────────────────────────────────┐
│  W3: Prod AUDIT + INSERT (D-03)        │
│  - Compute sha256 of 0000-0006 SQL     │
│  - SELECT FROM drizzle.__drizzle_      │
│      migrations (qualified!)           │
│  - Generate human-readable diff report │
│  - HUMAN GATE: user approves report    │
│  - INSERT missing entries (TX, with    │
│    audit-friendly comment SQL)         │
└──────────┬─────────────────────────────┘
           │ ✓
           ▼
┌────────────────────────────────────┐
│  W4: Triple verification (D-04)    │
│  1. db:check (drizzle-kit check    │
│     + generate --check) → 0        │
│  2. drizzle-kit pull → diff vs     │
│     schema.ts → only D-08 drifts   │
│  3. Smoke playwright 10 modules    │
│     (read-only) → all 200          │
│  - Generate drift residual report  │
│    (D-08)                          │
└──────────┬─────────────────────────┘
           │ ✓
           ▼
┌──────────────────────────────────────┐
│  W5: Healthcheck wiring (D-10)       │
│  - Create apps/backend/src/health/   │
│  - Register HealthModule             │
│  - Add healthcheck: in compose       │
│  - Deploy + verify endpoint live     │
└──────────┬───────────────────────────┘
           │ ✓
           ▼
┌──────────────────────────────────────────┐
│  W6: Prevention (D-09 + D-11)            │
│  - .github/workflows/ci.yml              │
│  - apps/backend/package.json db:check    │
│  - .planning/decisions/                  │
│      migration-discipline.md (ADR)       │
│  - CLAUDE.md §convenciones update        │
│  - Synthetic drift PR test → CI fails ✓  │
└──────────────────────────────────────────┘
```

### Recommended Project Structure (additions)

```
.github/
└── workflows/
    └── ci.yml                              # NEW: drizzle drift check job

.planning/
└── decisions/                               # NEW: ADR directory
    └── 0001-migration-discipline.md         # ADR for D-11

apps/backend/
├── drizzle/
│   ├── meta/
│   │   ├── _journal.json                    # MODIFIED: 7 entries instead of 5
│   │   ├── 0003_snapshot.json               # NEW: dummy w/ unique UUID, prevId=0002.id
│   │   ├── 0004_snapshot.json               # NEW: dummy w/ unique UUID, prevId=0003.id
│   │   ├── 0005_snapshot.json               # NEW: dummy w/ unique UUID, prevId=0004.id
│   │   └── 0006_snapshot.json               # NEW: generated by drizzle-kit, prevId=0005.id
│   └── 0006_baseline.sql                    # NEW: generated, STAMPED ONLY (header comment)
├── src/
│   ├── app.controller.ts                    # MODIFIED: remove /health (moved to HealthModule)
│   ├── app.module.ts                        # MODIFIED: import HealthModule
│   └── health/                              # NEW
│       ├── health.module.ts
│       ├── health.controller.ts
│       └── health.service.ts
└── package.json                             # MODIFIED: add "db:check" script

docker-compose.yml                           # MODIFIED: healthcheck: block for erp-backend

CLAUDE.md                                    # MODIFIED: §convenciones references ADR
```

### Anti-Patterns to Avoid

- **`UPDATE` / `DELETE` / `TRUNCATE` en `__drizzle_migrations`** (D-03 + memory `feedback_never_drop_tables.md`). Solo INSERT idempotente.
- **`psql -f apps/backend/drizzle/0006_baseline.sql` en prod.** Ese SQL contiene CREATE TABLE para tablas que ya existen — fallará. Stamp-only.
- **Inferir el hash algorithm.** Hash es SHA256 del archivo entero verbatim — usar `sha256sum` o el snippet Node.js, NUNCA inventar.
- **Asumir `__drizzle_migrations` está en `public`.** Está en `drizzle.__drizzle_migrations` — qualify TODOS los SQL.
- **Hardcodear el hash en el plan.** El plan debe instruir el cálculo en runtime con un comando reproducible — no copiar el valor literal porque puede cambiar si los archivos se editan.
- **Omitir `start_period` en `healthcheck:`.** Sin él, docker marca el container unhealthy durante el boot del backend (~10-15s) y orquestadores externos pueden killearlo.
- **Usar `Get('health/db')` desde `app.controller.ts` con el `@Controller()` raíz.** Mejor un `HealthController` separado con `@Controller('health')` que agrupe `/health` y `/health/db`.

## Don't Hand-Roll

| Problem                   | Don't Build                                          | Use Instead                                                                     | Why                                                                          |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hash de SQL files         | Custom checksumming, MD5, etc.                       | `sha256sum` POSIX o `crypto.createHash('sha256')` exact replica                 | Drizzle compara via SHA256 del file content — divergir genera audit mismatch |
| UUID v4 para snapshots    | String concat de timestamp+random                    | `crypto.randomUUID()` (Node 19+) o `node -e "console.log(crypto.randomUUID())"` | Garantía estadística + zero deps                                             |
| Healthcheck SQL framework | Custom NestJS HealthIndicator + Terminus boilerplate | Standalone controller + Drizzle `sql\`SELECT 1\``                               | Terminus no soporta Drizzle nativamente; el repo no lo usa                   |
| Postgres en CI            | docker-compose-action, custom container setup        | `services.postgres` block en GH Actions YAML                                    | Pattern canónico, healthcheck nativo                                         |
| Diff schema.ts vs DB      | Custom AST diffing                                   | `drizzle-kit pull` → `diff -u` plano                                            | Output legible, suficiente para human review                                 |
| Backup naming             | UUID, ULID, monotonic                                | `backup-YYMMDD-HHMM.dump` (D-15 lockeado)                                       | Convención del proyecto, ordenable lexicográficamente                        |

## Common Pitfalls

### Pitfall 1: Schema mismatch — `__drizzle_migrations` no está en `public`

**What goes wrong:** AUDIT command falla con `ERROR: relation "__drizzle_migrations" does not exist`.
**Why it happens:** Drizzle default `migrations.schema = 'drizzle'` y este proyecto no sobrescribe.
**How to avoid:** SIEMPRE qualify: `drizzle.__drizzle_migrations` en TODOS los SQL del plan.
**Warning signs:** `\dn` en psql muestra `drizzle | sanchez` schema; `\dt drizzle.*` muestra la tabla.
**Verification command (read-only, run BEFORE the audit):**

```bash
docker exec postgres psql -U sanchez -d erp_sanchez \
  -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = '__drizzle_migrations'"
```

### Pitfall 2: Drizzle 0.31.x no emite `IF NOT EXISTS` en `CREATE TABLE`

**What goes wrong:** El `0006_baseline.sql` generado contendría `CREATE TABLE "prop_color" (...)` sin IF NOT EXISTS. Aplicar a prod (donde ya existe) → `ERROR: relation "prop_color" already exists`.
**Why it happens:** Drizzle removió IF NOT EXISTS de generated SQL en versiones recientes (verificado en `0004_phase29_propiedades.sql` ya en el repo: línea 1 es `CREATE TABLE "prop_color" (` sin IF NOT EXISTS).
**How to avoid:** **Stamp-only** — añadir comentario header al `0006_baseline.sql` indicando "NOT EXECUTED, stamped via INSERT into \_\_drizzle_migrations". Cualquier dev local que haga `pnpm db:migrate` por primera vez ejecutará el SQL — documentar en SUMMARY que devs deben empezar desde DB limpia.
**Warning signs:** Si el plan incluye un step `psql -f 0006_baseline.sql` contra prod — STOP, esto va a fallar.

### Pitfall 3: Snapshot UUID chain rota por copy-paste

**What goes wrong:** `drizzle-kit check` reporta cadena de snapshots inconsistente; o peor, no la detecta y `drizzle-kit generate` futuro produce diffs locos.
**Why it happens:** Copiar `0002_snapshot.json` → `0003_snapshot.json` deja ambos con el mismo `id` UUID y el mismo `prevId`. La cadena `0001 → 0002 → 0003` requiere que `0003.prevId === 0002.id` y `0003.id` único.
**How to avoid:** Después de copiar, **regenerar `id` con `crypto.randomUUID()`** y reencadenar `prevId` manualmente. Step de validación: `drizzle-kit check` debe pasar después de los cambios y antes del `db:generate`.
**Warning signs:** `grep '"id"' meta/*.json` muestra el mismo UUID en múltiples archivos.

### Pitfall 4: Line endings divergentes generan hash mismatch

**What goes wrong:** Calculas hash en macOS/Linux con LF; algún archivo del repo tiene CRLF (algún editor Windows en algún momento); el INSERT lleva un hash que no matchea lo que `drizzle-kit migrate` calcularía localmente.
**Why it happens:** `fs.readFileSync().toString()` no normaliza line endings.
**How to avoid:** Antes del cálculo de hashes, verificar:

```bash
file apps/backend/drizzle/*.sql  # Debe decir "ASCII text" (LF), no "with CRLF"
# Normalizar si hace falta:
dos2unix apps/backend/drizzle/*.sql
```

**Warning signs:** `od -c apps/backend/drizzle/0000_*.sql | grep -c '\\r'` > 0.

### Pitfall 5: `curl` no disponible en backend container para healthcheck

**What goes wrong:** `docker-compose healthcheck:` test command falla con `curl: not found`. Container marcado unhealthy.
**Why it happens:** Imagen base `node:22-alpine` o `node:22-slim` puede no incluir curl.
**How to avoid:** Verificar con `docker exec erp-backend which curl`. Si no existe, opciones:

1. Instalar en `docker/backend.Dockerfile`: `RUN apk add --no-cache curl` (alpine) o `RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*` (debian-slim).
2. Usar `wget --quiet --spider http://localhost:3001/api/health/db` si wget está.
3. Usar Node binario: `test: ['CMD-SHELL', 'node -e "fetch(\\"http://localhost:3001/api/health/db\\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"']`.

### Pitfall 6: Smoke playwright corre antes que el backend esté listo

**What goes wrong:** Tras `docker compose up -d`, playwright corre y obtiene 502/connection refused porque backend aún booteando.
**Why it happens:** `up -d` retorna inmediatamente; el container puede tardar 10-30s en estar healthy.
**How to avoid:** Usar `docker compose up -d --wait` (espera healthchecks) o un loop polling en el script:

```bash
until curl -fsS http://erp.sanchezrepuestos.com.ar/api/health > /dev/null; do sleep 2; done
```

### Pitfall 7: `drizzle-kit migrate` no skipea por hash equality

**What goes wrong:** Asumir que recalcular hashes y registrarlos protegerá contra re-ejecución. Si `created_at` está mal, drizzle re-ejecuta.
**Why it happens:** El skip-logic verificado es `Number(lastDbMigration.created_at) < migration.folderMillis`. Hash no participa.
**How to avoid:** Garantizar que el INSERT de cada entry use `created_at = <timestamp en ms del journal entry>` (mismo valor que `journal.entries[i].when`). Para `0006_baseline`, usar el `when` que `drizzle-kit generate` escribe en journal (no inventar).
**Warning signs:** Tras INSERT, correr `pnpm --filter backend db:migrate` localmente apuntando a prod (con dry-run o lectura solamente) — si reporta migraciones pendientes, los timestamps están mal.

## Code Examples

### Compute hash de un migration file (POSIX, exacto)

```bash
# Source: drizzle-orm/src/migrator.ts crypto.createHash('sha256').update(query).digest('hex')
sha256sum apps/backend/drizzle/0000_open_anita_blake.sql | awk '{print $1}'
# 64-char hex string, lowercase
```

### Compute hash con Node (exact replica para verificación)

```bash
node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" \
  apps/backend/drizzle/0000_open_anita_blake.sql
```

### AUDIT prod (read-only, con qualified schema)

```bash
docker exec postgres psql -U sanchez -d erp_sanchez \
  -c "SELECT id, hash, created_at, to_timestamp(created_at/1000) AS applied_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at"
```

### INSERT idempotente (audit-gated, transaccional)

```sql
-- Source: derived from drizzle-orm/src/pg-core/dialect.ts INSERT pattern
-- Run only after human approval of the AUDIT report.
BEGIN;

-- Confirm we're targeting the right schema:
SET search_path = drizzle, public;

-- For each missing entry, idempotent via WHERE NOT EXISTS:
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '<sha256 of 0003_add_columna_inv_articulos.sql>', 1777492230018
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '<sha256 of 0003_add_columna_inv_articulos.sql>'
);

-- Repeat for 0004, 0005, 0006 with their respective hashes and journal `when` values.

-- Verify:
SELECT count(*) AS total FROM drizzle.__drizzle_migrations;
-- Expected: 7 (0000, 0001, 0002, 0003, 0004, 0005, 0006)

COMMIT;
```

### Healthcheck endpoint (live SQL via Drizzle, postgres-js)

```typescript
// Source: this repo's apps/backend/src/db/index.ts pattern + drizzle-orm sql tag
import { sql } from 'drizzle-orm'

await this.drizzle.db.execute(sql`SELECT 1 FROM ${sql.identifier(name)} LIMIT 0`)
// LIMIT 0 means: parse + plan + bind only, do not return rows. Cheapest way to verify table exists.
```

### Generate UUIDs for dummy snapshots

```bash
# Run once per dummy snapshot, capture output:
node -e "console.log(crypto.randomUUID())"
# Example: 7e3a9b21-4c5d-4e6f-8910-abcdef012345
```

### `drizzle-kit pull` (introspect) for D-04 verification

```bash
# Pull current prod schema to a temp dir without overwriting source of truth:
mkdir -p /tmp/drift-check-$(date +%Y%m%d-%H%M)
DATABASE_URL='postgresql://sanchez:***@localhost:5432/erp_sanchez' \
  pnpm --filter backend exec drizzle-kit pull --out=/tmp/drift-check-* --dialect=postgresql

# Diff against current schema.ts:
diff -u apps/backend/src/db/schema.ts /tmp/drift-check-*/schema.ts | tee /tmp/drift-check-*/schema.diff
```

## State of the Art

| Old Approach                                       | Current Approach                                       | When Changed                   | Impact                                                                     |
| -------------------------------------------------- | ------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------- |
| `drizzle-kit introspect:pg --connectionString=...` | `drizzle-kit pull --dialect=postgresql --url=...`      | drizzle-kit 0.20+              | Use `pull`, not `introspect:pg` (deprecated alias still works)             |
| `CREATE TABLE IF NOT EXISTS` in generated SQL      | Plain `CREATE TABLE`                                   | drizzle-kit ~0.21+             | Cannot replay generated SQL on existing schema                             |
| `migrations.schema` defaulting to `public`         | Default `'drizzle'`                                    | drizzle-kit early versions     | Always qualify table name                                                  |
| Single `.sql` migrations folder                    | Folder + `meta/_journal.json` + `meta/*_snapshot.json` | drizzle-kit 0.18+ (journal v7) | Snapshots are mandatory; can't be regenerated retroactively from SQL alone |

**Deprecated/outdated:**

- Manual `psql -f` against prod: tolerated only as documented emergency (D-11 ADR codifies).
- `_prisma_migrations` table: legacy, intentionally not removed (D-06).

## Assumptions Log

| #   | Claim                                                                                                                                                              | Section                                | Risk if Wrong                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Drizzle `0006_baseline.sql` will contain CREATE TABLE prop\_\* + ALTER inv_articulos.columna based on the schema.ts grep                                           | §Drizzle internals — generate behavior | If schema.ts has additional uncommitted changes, baseline will include unexpected ALTERs requiring user approval (D-02 paso 4 already covers this) |
| A2  | All current SQL files use LF line endings (Linux dev environment)                                                                                                  | §Pitfall 4                             | If any has CRLF, hashes calculated locally won't match what drizzle-kit migrate would compute. Mitigation: explicit `file *.sql` check in plan     |
| A3  | `curl` is available in `erp-backend` container                                                                                                                     | §Pitfall 5                             | Healthcheck will report unhealthy. Mitigation: explicit `which curl` check in plan; provide 3 fallbacks                                            |
| A4  | `postgres:16` image in CI is compatible with PG 16.13 of VPS for `db:check`                                                                                        | §CI Infra                              | Likely OK (minor version compatibility); if not, pin to `postgres:16.13-alpine`                                                                    |
| A5  | `pg_dump -F c` of prod (~7700 articulos + ~7700 inventarios + comprobantes\_\*) restores in <5min on VPS — pre-flight gate is feasible during a low-traffic window | §Validation Architecture               | If restore takes >30min, the gate becomes impractical. Mitigation: time the pg_dump first as a separate pre-flight, abort phase if >10min          |
| A6  | NestJS app boot completes in <20s for `start_period`                                                                                                               | §Healthcheck Pitfall                   | If boot is slower (cold start, migrations on boot), need higher start_period                                                                       |
| A7  | The 5 critical tables (`business_settings`, `articulos`, `existencias`, `prop_marca`, `orders`) are all in `public` schema                                         | §Healthcheck implementation            | Verified by grep of schema.ts — all use `pgTable('<name>', ...)` (default schema = public)                                                         |

## Validation Architecture

### Test Framework

The repo has no Jest/Vitest test infrastructure for the backend currently (verified: no `*.test.ts` files in `apps/backend/src/`, no `jest.config` or `vitest.config`). For Phase 38, the validation strategy is **smoke + manual gates + automated CLI checks**, not unit tests.

| Property           | Value                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Framework          | None for backend; shell scripts + drizzle-kit CLI + playwright-cli skill                          |
| Config file        | None new                                                                                          |
| Quick run command  | `pnpm --filter backend db:check` (drift detection in <10s)                                        |
| Full suite command | `bash scripts/phase-38-verify.sh` (composes pre-flight + audit + verify) — script created by plan |
| Phase gate         | Manual approval after each wave; final gate = D-04 triple verification all green                  |

### Phase Requirements → Validation Map

| Req ID          | Behavior                                             | Validation Type | Automated Command                                                                                                        | File Exists?                                           |
| --------------- | ---------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------- |
| SC-PRE          | Restore-test passes with row counts matching         | shell + psql    | `bash scripts/phase-38-preflight.sh`                                                                                     | ❌ Wave 1                                              |
| SC-JOURNAL      | `_journal.json` has 7 valid entries                  | jq query        | `jq '.entries                                                                                                            | length == 7' apps/backend/drizzle/meta/\_journal.json` | ✅ existing journal modified |
| SC-SNAPS        | Dummy snapshots exist with unique UUIDs              | jq query        | `bash scripts/phase-38-validate-snapshots.sh`                                                                            | ❌ Wave 2                                              |
| SC-BASELINE     | `0006_baseline.sql` exists with stamp-only header    | grep            | `grep -q "STAMPED, NOT EXECUTED" apps/backend/drizzle/0006_*.sql`                                                        | ❌ Wave 2 generates it                                 |
| SC-PROD-AUDIT   | Audit report file produced                           | file existence  | `test -f .planning/phases/38-*/audit-report.md`                                                                          | ❌ Wave 3                                              |
| SC-PROD-INSERT  | All 7 entries in `drizzle.__drizzle_migrations`      | psql count      | `docker exec postgres psql -U sanchez -d erp_sanchez -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations"` returns 7 | N/A (DB state)                                         |
| SC-VERIFY-1     | `db:check` exits 0                                   | CLI exit code   | `pnpm --filter backend db:check; echo $?` returns 0                                                                      | ✅ once Wave 6                                         |
| SC-VERIFY-2     | Diff vs introspect shows only D-08 drifts            | shell + diff    | `bash scripts/phase-38-diff-introspect.sh` produces expected fingerprint                                                 | ❌ Wave 4                                              |
| SC-VERIFY-3     | Smoke playwright reports green for 10 modules        | playwright-cli  | `bash scripts/phase-38-smoke.sh` (uses playwright-cli skill)                                                             | ❌ Wave 4                                              |
| SC-CI           | CI workflow file exists and synthetic drift PR fails | gh CLI          | `gh pr checks <synthetic-drift-pr>` shows failure on `drizzle-drift-check`                                               | N/A (manual after merge)                               |
| SC-HEALTH       | `/api/health/db` returns 200 with 5 tables OK        | curl            | `curl -fsS http://erp.sanchezrepuestos.com.ar/api/health/db` returns JSON with `ok: true`                                | ❌ Wave 5                                              |
| SC-ADR          | ADR file exists                                      | file            | `test -f .planning/decisions/0001-migration-discipline.md`                                                               | ❌ Wave 6                                              |
| SC-DRIFT-REPORT | Drift residual report file exists                    | file            | `test -f .planning/phases/38-*/drift-residual-report.md`                                                                 | ❌ Wave 4                                              |

### Sampling Rate

- **Per task commit (in waves W2/W5/W6):** `pnpm --filter backend db:check` (catches snapshot/journal regressions immediately)
- **Per wave merge:** Re-run pre-flight verification (W1) NEVER repeats — it's a one-shot gate. All other waves: re-run their corresponding validation script.
- **Phase gate:** All 13 SCs above green before declaring Phase 38 done. Strongest gate is SC-VERIFY-1+2+3 (the triple).

### Wave 0 Gaps (infra to create before any other wave)

- [ ] `scripts/phase-38-preflight.sh` — pre-flight gate (D-05): pg_dump + restore-test + row-count diff + drop test DB + persist backup
- [ ] `scripts/phase-38-audit-prod.sh` — read-only audit of `drizzle.__drizzle_migrations` + hash diff
- [ ] `scripts/phase-38-insert-stamps.sh` — INSERT idempotente (transactional, requires explicit `--apply` flag to actually write)
- [ ] `scripts/phase-38-diff-introspect.sh` — drizzle-kit pull + diff vs schema.ts + classify cosmetic vs real
- [ ] `scripts/phase-38-smoke.sh` — playwright multi-módulo (uses global playwright-cli skill, not MCP per `feedback_playwright_cli.md`)
- [ ] `scripts/phase-38-validate-snapshots.sh` — verify UUIDs unique and prevId chain valid in `meta/`
- [ ] No backend test framework needed (cero unit tests for this phase — all validation is shell/CLI/manual)

### Backup Verification Strategy (D-05 detail)

Comparison method: row counts via `count(*)` per table. Rationale: cheap, fast, sensitive to data loss. Tables to compare:

| Table                   | Why critical                    | Tolerance   |
| ----------------------- | ------------------------------- | ----------- |
| `articulos`             | Master catalog; ~101k rows      | exact match |
| `existencias`           | Stock counts; ~7873 rows        | exact match |
| `inventarios_articulos` | Inventory snapshots; ~7745 rows | exact match |
| `comprobantes_cabecera` | Legacy ERP/POS; live data       | exact match |
| `comprobantes_detalle`  | Legacy ERP/POS line items       | exact match |
| `comprobantes_pagos`    | Legacy ERP/POS payments         | exact match |

Optional deeper check (recommended if pg_dump+restore <2min): MD5 of `pg_dump -t <table> --data-only -F p` for each. Defer to plan-time decision.

### Healthcheck Contract Test

Verify both 200 and 503 paths:

```bash
# 200 path (happy):
curl -fsS http://localhost:3001/api/health/db | jq '.ok == true and (.tables | length == 5)'

# 503 path (synthetic failure — temporarily rename a table on local DB):
psql -d erp_local -c "ALTER TABLE prop_marca RENAME TO prop_marca_disabled"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health/db  # Expect 503
psql -d erp_local -c "ALTER TABLE prop_marca_disabled RENAME TO prop_marca"
```

Run this contract test in W5 before committing the healthcheck wiring to docker-compose.

### Smoke Playwright Harness

Per D-14 + `feedback_playwright_cli.md`: use the global `playwright-testing` skill (NOT the MCP server). 10 routes to verify, all read-only, GET with admin session:

```
/articulos /orders /sales /purchases /propiedades /dispositivos /webhooks /api-keys /inventarios /settings
```

For each: navigate, wait for `networkidle`, assert HTTP 200, check backend logs (`docker logs erp-backend --since 1m | grep -i 'error\|500\|relation does not exist'` returns 0 lines). Captures screenshots ONLY on failure.

## Risks and Landmines

### High severity

1. **`0006_baseline.sql` accidentally executed against prod.** Plan writer or executor confuses "stamped" with "applied" and runs `psql -f`. Fails with `relation already exists`, breaks transaction, possibly leaves DB in inconsistent state if part of a larger script.
   - **Mitigation:** Header comment on `0006_baseline.sql`. Plan must explicitly call out "STAMP ONLY, NEVER EXECUTE" in step description. INSERT script must NOT source the SQL file — only insert hash + created_at.

2. **AUDIT command queries unqualified `__drizzle_migrations`.** Returns "relation does not exist" — operator concludes table is missing, panics, or worse, runs `CREATE TABLE __drizzle_migrations` in `public` thinking they're fixing it. Now there's a duplicate empty table in `public` and the real one in `drizzle`.
   - **Mitigation:** ALL SQL in plan must use `drizzle.__drizzle_migrations`. Pre-flight verification step queries `information_schema.tables` to locate the real table.

3. **Hash mismatch from line-ending divergence.** Local hash differs from what migrate would compute on another machine. Audit reports false drift; INSERT records wrong hash; `drizzle-kit check` may detect this in CI later.
   - **Mitigation:** `file *.sql` check + dos2unix if needed before computing hashes.

4. **Pre-flight backup restore-test fails** (e.g., disk space on VPS, pg_restore version mismatch, FK violations from incomplete dump). Phase aborts before any productive work — but the abort itself must be clean.
   - **Mitigation:** Pre-flight script must be transactional in its DB ops (createdb / pg_restore / dropdb), tolerant to partial failures, and emit a clear ABORT message + new todo creation (per D-05 paso 6).

### Medium severity

5. **`drizzle-kit check` in CI fails first run** because the INSERTs were good but the journal+snapshot chain has a UUID issue we missed. CI build red, can't merge.
   - **Mitigation:** Run `drizzle-kit check` LOCALLY in W2 before any commit. Include in W2 verification script.

6. **Healthcheck endpoint returns 200 but ALL 5 tables fail individually because `DRIZZLE_CLIENT` errored.** The `Promise.all(...map(... try/catch))` swallows errors and reports `status: 'fail'` per table — but the response is still 200 because the controller returns the result, only throwing on `!result.ok`. Wait, that's actually OK because `ok = false` triggers 503. **Verify the implementation handles the case where `drizzle.db.execute` itself throws synchronously** (vs. rejected promise) — the try/catch must handle both.

7. **Drift residual report (D-08) missed by the diff because `drizzle-kit pull` doesn't preserve `$type<>` casts.** The TypeScript-only mismatch on `inventario_sectores.columnas` won't show in the diff.
   - **Mitigation:** Manual review of the diff plus an explicit grep step in the plan: `grep -E '\$type<' apps/backend/src/db/schema.ts` — list each `$type` usage as a manual review item.

8. **CI Postgres service container PG version drift.** If `postgres:16` is upgraded by the registry to e.g. `16.20`, build behavior could change subtly (esp. for triggers). Pin to a specific tag.
   - **Mitigation:** Use `postgres:16.13-alpine` to match VPS exactly.

### Low severity

9. **`docker exec postgres psql ...` fails because the container is named differently on this machine.** CONTEXT.md assumes `postgres` container name. Verify with `docker ps --format '{{.Names}}'` before running anything.

10. **ADR file path conflicts with future ADRs.** `0001-migration-discipline.md` implies a numbered ADR system — must commit to either keeping that pattern (creating `0002-`, etc.) or use date-based naming (`2026-05-02-migration-discipline.md`). Decide upfront.

## Open Questions (RESOLVED)

> Las 6 preguntas se cerraron antes del lock-in del plan. Cada una tiene un `**RESOLVED:**` line con la decisión final y el plan/task que la codifica.

1. **Should the dummy snapshots reflect post-state or stay as copies of 0002?**
   - What we know: copies of 0002 = simple but produces non-empty `0006_baseline.sql` with CREATE TABLE for already-existing tables. Hand-edited progressive snapshots = more work, fragile, but produces empty `0006_baseline.sql`.
   - What's unclear: User preference. CONTEXT.md D-02 says "copies", which we honor. The stamp-only mitigation handles the consequence cleanly.
   - Recommendation: **Proceed with copies + stamp-only header + dev SUMMARY note.** Simpler, lower risk of journal corruption.
   - **RESOLVED:** copies of `0002_snapshot.json` + UUID regen (`crypto.randomUUID()`) + `prevId` rechain (0003.prevId=0002.id, 0004.prevId=0003.id, 0005.prevId=0004.id). Codificado en **38-02 Task 1 Pasos A-D**. Trade-off aceptado: `0006_baseline.sql` contendrá `CREATE TABLE prop_*` para tablas ya existentes en prod, mitigado por la disciplina STAMP-ONLY (no se ejecuta) + header explícito.

2. **What `created_at` value goes in the INSERT for entries 0003/0004/0005?**
   - What we know: Drizzle uses `journal.entries[i].when` (ms epoch). For 0003/0004/0005, those values are: 1777569630018 (apr29 ms ish, but actually the value already in journal for 0004), 1777569630018 (0004 actual), 1777569630019 (0005 actual). Plus 0003 needs a new `when`.
   - What's unclear: Should `when` reflect when the migration FILE was created or when it was APPLIED to prod? CONTEXT.md D-03 says "timestamps que reflejen cuándo se aplicó realmente". Both interpretations work for skip-logic (only ordering matters).
   - Recommendation: Use realistic application timestamps from quick task SUMMARYs: 0003=`260429-rec` (Apr 29 ~22:00 UTC ms), 0004=`260501-smoke` (May 1 ms), 0005=`260501-smoke` +1ms (force ordering). 0006 uses `Date.now()` at INSERT time. Document the chosen timestamps in the plan as constants.
   - **RESOLVED:** Cada `created_at` es el `when` del entry correspondiente en `_journal.json` post-Plan 38-02 (no `Date.now()` al INSERT). Valores fijos:
     - 0000/0001/0002: `1772422128557 / 1772469220121 / 1772627204469` (= apr 28 ~12:00 UTC, valores históricos preservados).
     - 0003: epoch-ms de `2026-04-29T14:00:00Z` (= `1777809600000`) — alineado con la fecha real del quick task `260429-rec`.
     - 0004: epoch-ms de `2026-05-01T16:00:00Z` (= `1777989600000`) — May 1 smoke phase 29.
     - 0005: epoch-ms de `2026-05-01T16:00:00Z` + 1 (= `1777989600001`) — fuerza ordering relativo a 0004.
     - 0006: epoch-ms del momento del INSERT (`Date.now()` capturado durante ejecución del audit script — referencia "today's timestamp"). Se commitea al SUMMARY de 38-03 para auditoría.
   - Codificado como template SQL en **38-03 Task 2** (audit script lee `_journal.json`, no hardcodea — pero los valores arriba son los que el journal debe contener post-38-02).

3. **Should `app.controller.ts` lose `/health` to `HealthController`?**
   - What we know: Both can coexist (`@Controller()` raíz + `@Controller('health')` child) but routing semantics get confusing — `@Get('health')` from raíz vs `@Get()` from `/health` child both resolve to the same path, NestJS may complain.
   - What's unclear: Intent — keep backward-compat with current `/api/health` consumers (Traefik, monitoring, etc.).
   - Recommendation: **Move `/health` into HealthController.** `@Controller('health')` + `@Get()` for liveness + `@Get('db')` for DB. Remove from `app.controller.ts`. This is cleaner. Verify nothing in Traefik labels or external monitoring breaks.
   - **RESOLVED:** Sí, mover `/health` de `app.controller.ts` a `HealthController` (`@Controller('health')` + `@Get()` liveness + `@Get('db')` deep check, ambos `@Public()`). Codificado en **38-05 Task 1 Paso "Editar apps/backend/src/app.controller.ts"**. La ruta resultante (`/api/health` y `/api/health/db`) es backward-compat con Traefik y monitoring externos.

4. **What's the correct behavior for `/api/health/db` when one of the 5 tables doesn't exist?** Should it 503 immediately or per-table aggregate?
   - What we know: Current proposed implementation aggregates: returns 503 with full per-table detail, so operator can see which table(s) fail.
   - What's unclear: Some monitoring tools want hard 5xx fast (low timeout) and don't parse body.
   - Recommendation: **Aggregate + 503**, as specced. Keep the response body so future debugging is easier. Confirm Traefik default healthcheck timeout (probably 5s) > our query latency (5 SELECTs + LIMIT 0 against an indexed table = <100ms).
   - **RESOLVED:** Aggregate-503. Response shape `{ ok: boolean, tables: [{name, status: 'ok'|'fail'}, ...] }`, status `200` si todas pasan, `503` (HttpException SERVICE_UNAVAILABLE) si alguna falla. El body siempre incluye el detalle por tabla. En producción NO se devuelve `error.message` (privacy: ver T-38-10 + W6 fix en 38-05). Codificado en **38-05 Task 1 health.service.ts + health.controller.ts**.

5. **ADR file location: `.planning/decisions/`, `docs/adr/`, or somewhere else?**
   - What we know: Repo has no existing ADR; `.planning/` already contains `research/`, `phases/`, `quick/`. `docs/` does not exist at repo root.
   - What's unclear: Future intent — will more ADRs come?
   - Recommendation: `.planning/decisions/0001-migration-discipline.md`. Numbered + descriptive, future-friendly. Aligned with CONTEXT.md proposal.
   - **RESOLVED:** `.planning/decisions/0001-migration-discipline.md`. Naming `NNNN-kebab-slug.md` (4-digit prefix matching phase numbering precedent). Codificado en **38-06 Task 2 Paso A-B**.

6. **What constitutes "synthetic drift" for the CI gate test?**
   - What we know: Adding a column to `schema.ts` and not generating a migration → `drizzle-kit generate --check` exits 1.
   - What's unclear: Does `drizzle-kit check` (without `generate --check`) catch all relevant drifts? It only catches journal/snapshot inconsistency, not schema-vs-snapshot drift.
   - Recommendation: The `db:check` script combines BOTH (`drizzle-kit check && drizzle-kit generate --check`). Synthetic drift PR test should specifically modify `schema.ts` (e.g., add a temp column) and verify CI fails on `generate --check`. Document this manual test as part of W6 acceptance.
   - **RESOLVED:** Mecánica del synthetic drift PR test: (a) crear branch temporal `test/phase38-synthetic-drift`, (b) agregar una columna throwaway al final de cualquier `pgTable` en `apps/backend/src/db/schema.ts` (ej: `_phase38_test: text('_phase38_test'),`), (c) commit + push + abrir PR vía `gh pr create` o web UI, (d) verificar que el job `drizzle-drift-check` del workflow CI **falla** (red X), (e) cerrar el PR sin merge + borrar la branch. El criterio de aceptación es la falla observada en CI, no un test automatizado. Codificado como acceptance criteria en **38-06 Task 1 Paso D** (verificación manual post-merge del workflow).

## Environment Availability

| Dependency                        | Required By                                                        | Available                   | Version  | Fallback                          |
| --------------------------------- | ------------------------------------------------------------------ | --------------------------- | -------- | --------------------------------- |
| `docker` (CLI)                    | All DB ops via docker exec                                         | ✓                           | 29.4.1   | none — required                   |
| `docker compose`                  | Service orchestration                                              | ✓ (assumed via docker 29.x) | bundled  | none                              |
| `pnpm`                            | Build, scripts                                                     | ✓                           | 9.0.0    | none                              |
| `node`                            | Hash computation, drizzle-kit                                      | ✓                           | v22.22.2 | none                              |
| `psql` (host)                     | Optional direct connection                                         | ✓                           | 16.13    | docker exec into container        |
| `pg_dump` (host)                  | Optional direct backup (D-05 runs INSIDE container per CONTEXT.md) | ✓                           | 16.13    | docker exec                       |
| `sha256sum`                       | Hash computation (POSIX)                                           | ✓ (Linux coreutils)         | bundled  | `node -e crypto` snippet          |
| `gh` CLI                          | Optional for synthetic drift PR test                               | unknown                     | —        | manual PR via web                 |
| `curl` (in erp-backend container) | docker-compose healthcheck test                                    | unknown                     | —        | wget / node fetch (see Pitfall 5) |
| Postgres container `postgres`     | DB target                                                          | assumed                     | 16.13    | none — required                   |
| `dos2unix`                        | Line-ending normalization (only if Pitfall 4 triggers)             | likely available            | —        | `sed -i 's/\r$//'`                |

**Missing dependencies with no fallback:** none blocking — all required tools present on this host.

**Missing dependencies with fallback:**

- `gh` CLI — fallback: manually create PR via GitHub web UI for synthetic drift test (W6).
- `curl` in container — see Pitfall 5 mitigations.

## Security Domain

> Phase 38 is infrastructure/migrations work. Security surface is limited but non-zero.

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                                                                                                                                                   |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V2 Authentication     | no      | (no auth changes)                                                                                                                                                                                                                                                  |
| V3 Session Management | no      | (no session changes)                                                                                                                                                                                                                                               |
| V4 Access Control     | yes     | `/api/health/db` is `@Public()` (no auth required, by design — orchestrators need to call it). Verify it does NOT leak schema/table names beyond the hardcoded list. The current implementation only echoes the table names already known to be in the codebase. ✓ |
| V5 Input Validation   | yes     | All SQL in healthcheck uses `sql.identifier()` to safely quote table names. Table names come from a hardcoded const array. No user input. ✓                                                                                                                        |
| V6 Cryptography       | partial | SHA256 used for hash computation — standard, not crypto-sensitive (audit purpose only, not for integrity-critical decisions).                                                                                                                                      |
| V8 Data Protection    | yes     | Backup files (`/var/backups/erp_sanchez/*.dump`) contain full DB including PII (customer data in `articulos`, `comprobantes_*`). Permissions on `/var/backups/erp_sanchez/` MUST be 700 root or specific user, not world-readable.                                 |
| V12 File System       | yes     | Same as V8 — backup file permissions.                                                                                                                                                                                                                              |

### Known Threat Patterns for this stack

| Pattern                                                    | STRIDE                  | Standard Mitigation                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL injection in healthcheck via dynamic table name        | Tampering               | Hardcoded const array + `sql.identifier()` quoting                                                                                                             |
| Backup file world-readable on VPS                          | Information disclosure  | `chmod 700 /var/backups/erp_sanchez && chmod 600 /var/backups/erp_sanchez/*.dump`                                                                              |
| Healthcheck endpoint reveals internal schema layout        | Information disclosure  | Response body lists 5 hardcoded table names — those are derived from the public-facing app routes (`/articulos`, `/existencias`, etc.). Acceptable disclosure. |
| `__drizzle_migrations` audit query exposes hashes via logs | Information disclosure  | Hashes are not secrets. No mitigation needed.                                                                                                                  |
| Operator runs INSERT script without human approval gate    | Tampering / Repudiation | Plan explicitly requires human approval AFTER audit report; INSERT script requires explicit `--apply` flag                                                     |
| Credentials leak via `.env` or DB URL in CI logs           | Disclosure              | GitHub Secrets for `DATABASE_URL_TEST` (CI uses postgres in service container, no real prod creds needed)                                                      |

## Sources

### Primary (HIGH confidence)

- [drizzle-team/drizzle-orm GitHub `drizzle-orm/src/migrator.ts`](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/migrator.ts) — hash algorithm + readMigrationFiles
- [drizzle-team/drizzle-orm GitHub `drizzle-orm/src/pg-core/dialect.ts`](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/pg-core/dialect.ts) — migrate() loop, INSERT pattern, `__drizzle_migrations` table schema
- [drizzle-orm-docs Context7 ID `/websites/orm_drizzle_team`](https://orm.drizzle.team) — drizzle-kit check, generate, pull command behavior
- [orm.drizzle.team/docs/drizzle-config-file](https://orm.drizzle.team/docs/drizzle-config-file) — default `migrations.schema = 'drizzle'`
- [orm.drizzle.team/docs/drizzle-kit-migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) — migrate workflow
- [orm.drizzle.team/docs/drizzle-kit-check](https://orm.drizzle.team/docs/drizzle-kit-check) — check command semantics
- [docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers) — Postgres service container YAML
- This repo files (verified by reading):
  - `apps/backend/drizzle.config.ts` — confirmed no `migrations.schema` override → default `drizzle` applies
  - `apps/backend/drizzle/meta/_journal.json` — current journal state
  - `apps/backend/drizzle/0004_phase29_propiedades.sql` — confirmed Drizzle 0.31.x emits `CREATE TABLE` without IF NOT EXISTS
  - `apps/backend/src/app.controller.ts` — confirmed simple controller pattern + `@Public()` decorator
  - `apps/backend/src/db.module.ts` + `src/db/index.ts` — confirmed DrizzleService exposes `.db: PostgresJsDatabase`
  - `apps/backend/package.json` — confirmed drizzle-orm 0.45.1, drizzle-kit 0.31.9
  - `docker-compose.yml` — confirmed no `healthcheck:` block on erp-backend (must be added)

### Secondary (MEDIUM confidence)

- [github.com/nestjs/terminus/issues/2616](https://github.com/nestjs/terminus/issues/2616) — confirms no native Drizzle indicator (Feb 2025)
- WebSearch verified: `@nestjs/terminus` patterns + custom HealthIndicator approach

### Tertiary (LOW confidence)

- `start_period: 20s` for healthcheck — assumption based on typical NestJS boot times; should be measured during W5

## Metadata

**Confidence breakdown:**

- Hash algorithm: HIGH — verified directly in drizzle source
- `__drizzle_migrations` schema location: HIGH — verified in source + official docs
- Skip logic by `created_at`: HIGH — verified in source
- `drizzle-kit generate` behavior with dummy snapshots: MEDIUM — derived from source + docs, not directly tested in this repo (Phase 38 W2 will be the real test)
- NestJS Health module pattern: HIGH — repo conventions verified, terminus alternative researched
- CI infra (Postgres service container): HIGH — official GH docs, canonical pattern
- Drift residual diff behavior (D-08 detection via pull): MEDIUM — `$type<>` cast may not be visible in pull output (assumption A7 plus Open Q)
- Healthcheck `curl` availability in container: LOW — A3, must be verified during W5

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (Drizzle moves quickly; recheck migrator hash algorithm if drizzle-orm/drizzle-kit upgraded before then)
