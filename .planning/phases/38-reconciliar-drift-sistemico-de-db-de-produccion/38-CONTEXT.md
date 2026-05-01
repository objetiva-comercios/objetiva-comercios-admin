# Phase 38: Reconciliar drift sistemico de DB de produccion - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminar el drift entre el sistema de tracking de migraciones de Drizzle (`__drizzle_migrations` en prod + `_journal.json` local) y el estado real del schema en `erp_sanchez` del VPS, para que `pnpm db:push` y `pnpm db:migrate` vuelvan a funcionar de forma confiable. **Prerequisito de Phase 37** (Tech Debt v1.3) cuyo SC#3 exige `pnpm db:generate --check` corriendo limpio.

**Mapa de drift detectado al inicio de la fase:**

| Lugar                        | Estado                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Local `_journal.json`        | Tiene 0000, 0001, 0002, 0004, 0005 — falta entry de **0003**                                                              |
| Local `meta/*-snapshot.json` | Solo 0000, 0001, 0002 — faltan 0003, 0004, 0005                                                                           |
| Prod `__drizzle_migrations`  | Hashes registrados pero migrations aplicadas via psql en quick tasks (260428-mig, 260429-rec, manual May 1 para `prop_*`) |
| Prod tablas físicas          | **Todas existen** post-260428-mig + 260429-rec + 0004/0005 manual del 2026-05-01                                          |
| Prod `_prisma_migrations`    | Legacy, cohabita desde la migración Prisma→Drizzle                                                                        |

**In scope:**

- Pre-flight: pg*dump de `erp_sanchez` + restore en DB temporal + checksum de tablas críticas (`articulos`, `existencias`, `inventarios_articulos`, `comprobantes*\*`)
- Reconciliación local: `_journal.json` + snapshots dummy 0003/0004/0005 + nueva migration `0006_baseline` generada via `db:generate`
- Reconciliación prod: AUDIT-FIRST de `__drizzle_migrations` + INSERT idempotente de entries faltantes (NUNCA `UPDATE`/`DELETE`/`TRUNCATE`)
- Verificación triple: `db:generate --check` + `drizzle-kit introspect` diff vs `schema.ts` + smoke playwright en los 10 módulos
- Prevención: `drizzle-kit check` en CI (GitHub Actions), healthcheck SQL en backend (`/api/health/db` con 5 tablas críticas), ADR sobre disciplina de migraciones (no más psql directo)
- Reporte estructurado de drift residual con propuestas de fix (cada aplicación requiere OK explícito del usuario)

**Out of scope (descartado en discusión):**

- Reset full (DROP SCHEMA + replay) — prohibido por `feedback_never_drop_tables.md` salvo autorización explícita; el usuario eligió Repair journal-only
- DROP de `_prisma_migrations` y `comprobantes_*` — intactos, conviven sin afectar al admin
- Reconciliación de DBs locales de devs — Phase 38 commitea journal + 0006_baseline; cualquier dev se alinea con `git pull` + `db:push --force` opcional
- `drizzle-kit check` en pre-commit local — solo CI por ahora (cero overhead local)
- Logging mejorado del cause de errores SQL — descartado, no se considera prevención sino detección post-hoc
- Aplicación automática de fixes para drifts residuales (`sector_id` huérfano, `inventario_sectores.columnas` jsonb mismatch) — propuestas se documentan, ejecución diferida o requiere OK del usuario
- Mutation flows en smoke (crear artículo, editar existencia) — solo read-only smoke en los 10 módulos

</domain>

<decisions>
## Implementation Decisions

### Estrategia de reconciliación

- **D-01: Repair journal-only.** El schema físico en prod ya está correcto post-260428-mig + 260429-rec + manual 2026-05-01 (las 6 `prop_*` + cache trigger 0005). NO ejecutar reset full ni rebaseline via introspect. Solo se sincroniza el tracking (journal local + `__drizzle_migrations` en prod). Riesgo: bajo. Downtime: cero. Preserva data: 100%. Descarta opciones B (introspect+rebaseline), C (catch-up incremental que no resuelve el journal) y D (reset full).
- **D-02: Forward marker + 0006 baseline para arreglar el journal local.** Drizzle-kit no puede backfillar snapshots intermedios (su generación es forward-only desde diffs de `schema.ts`). Procedimiento:
  1. Editar `apps/backend/drizzle/meta/_journal.json` añadiendo entries para `0003`, `0004` y `0005` con timestamps reales (apr29 para 0003, may01 para 0004/0005).
  2. `cp meta/0002_snapshot.json meta/0003_snapshot.json` (idem 0004, 0005). Son snapshots dummies que NO se ejecutan — Drizzle solo consulta el snapshot del LAST entry.
  3. Correr `pnpm --filter backend db:generate` → debería generar `0006_baseline.sql` reflejando el state real desde `schema.ts`. Auditar el SQL: si resulta vacío o solo no-ops, es la prueba de que `schema.ts` ya está alineado con prod.
  4. Si `0006_baseline.sql` contiene ALTERs reales, escalar al usuario antes de aplicar — implica drift estructural adicional no documentado.
  5. Marcar `0006_baseline` como aplicado en prod via INSERT en `__drizzle_migrations` (paso D-03).
- **D-03: Audit-first + INSERT idempotente en `__drizzle_migrations` de prod.** NUNCA `UPDATE`/`DELETE`/`TRUNCATE` la tabla. Procedimiento:
  1. AUDIT (read-only): `docker exec postgres psql -U sanchez -d erp_sanchez -c 'SELECT idx, tag, hash, created_at FROM __drizzle_migrations ORDER BY idx'`.
  2. Para cada migration `0000..0006`, calcular `sha256` del file SQL local y comparar con el hash registrado.
  3. Para entries faltantes: `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (...)` con timestamps que reflejen cuándo se aplicó realmente cada migration (apr28 para 0000-0002, apr29 para 0003, may01 para 0004/0005, fecha de hoy para 0006).
  4. Si la auditoría revela hashes mismatched en 0000-0005 (no solo missing), escalar al usuario antes de tocar nada — puede indicar que el SQL file local fue editado post-aplicación.
  5. Documentar en el plan: comando AUDIT como step de read-only que produce un reporte; INSERT solo después de que el usuario apruebe el reporte.
- **D-04: Verificación triple post-reconciliación.**
  1. `pnpm --filter backend db:generate --check` debe devolver "No changes" (insumo directo de Phase 37 SC#3).
  2. `drizzle-kit introspect` contra `erp_sanchez` → archivo temp → diff vs `apps/backend/src/db/schema.ts`. Output esperado: vacío o solo diferencias cosméticas (whitespace, orden de keys).
  3. Smoke playwright en los 10 módulos del admin (`/articulos /orders /sales /purchases /propiedades /dispositivos /webhooks /api-keys /inventarios /settings`) verificando 200 + ausencia de 500 en logs del backend post-fix.
- **D-05: Pre-flight obligatorio (gate de avance).** Antes de cualquier paso que toque `__drizzle_migrations` o `_journal.json`:
  1. `docker exec postgres pg_dump -U sanchez -d erp_sanchez -F c > backup-YYMMDD-HHMM.dump` en VPS.
  2. `docker exec postgres createdb -U sanchez erp_restore_test` + `pg_restore -U sanchez -d erp_restore_test backup-*.dump`.
  3. Comparar row counts entre `erp_sanchez` y `erp_restore_test` para: `articulos`, `existencias`, `inventarios_articulos`, `comprobantes_cabecera`, `comprobantes_detalle`, `comprobantes_pagos`. Counts deben matchear.
  4. `docker exec postgres dropdb -U sanchez erp_restore_test`.
  5. Persistir el `.dump` en `/var/backups/erp_sanchez/` del VPS por mínimo 30 días.
  6. Si el restore-test falla o checksums no matchean, ABORTAR la fase y abrir un nuevo todo.

### Limpieza de legacy y drift residual

- **D-06: `_prisma_migrations` queda intacta.** Es solo metadata legacy del sistema Prisma (anterior a Drizzle). NO la borramos — choca con `feedback_never_drop_tables.md` y no afecta funcionalmente nada (Drizzle la ignora por no estar en `schema.ts`). El ruido visible en `\dt` es aceptable.
- **D-07: `comprobantes_cabecera/detalle/pagos` quedan intactas.** Tablas del ERP/POS legacy con data viva. Conviven OK con el schema admin de Drizzle. NO entran a `schema.ts` y NO se mapean a entities — son responsabilidad del sistema legacy.
- **D-08: Drift residual se audita y se proponen fixes — NO se aplican automáticamente.** El SUMMARY de quick task `260429-rec` documentó 2 drifts residuales conocidos:
  - `inventarios_articulos.sector_id` — columna huérfana en DB, no está en `schema.ts`.
  - `inventario_sectores.columnas` — DB es `jsonb` con números, `schema.ts` lo declara `$type<string[]>()` (mismatch de tipado, runtime OK).

  La verificación triple (D-04) detectará estos en el `drizzle-kit introspect` diff. Phase 38 produce un **reporte estructurado** con cada drift, su fix propuesto (`ALTER TABLE ... DROP COLUMN sector_id` para el primero; patch a `schema.ts: $type<number[]>()` para el segundo) y un toggle de "aplicar / diferir / rechazar" por cada uno. La aplicación de fixes destructivos (DROP COLUMN) requiere OK explícito del usuario en el plan o en ejecución. Los fixes no destructivos (patch a `schema.ts`) se pueden aplicar dentro de la fase sin OK adicional siempre que se commiteen separados.

### Prevención post-fix

- **D-09: `drizzle-kit check` en CI (GitHub Actions), no en pre-commit.** Step nuevo en `.github/workflows/ci.yml` (o equivalente):
  ```yaml
  - name: Drizzle drift check
    run: pnpm --filter backend db:check
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
  ```
  Y en `apps/backend/package.json`: `"db:check": "drizzle-kit check && drizzle-kit generate --check"`. Falla el build si hay drift. Pre-commit descartado (cero overhead local + no requiere DB local levantada).
  - **Requisito infra:** CI necesita acceso a una DB de test con state alineado. Researcher/planner deciden: levantar Postgres en GitHub Actions service container vs apuntar a una DB de staging existente vs `db:push` sobre un Postgres efímero al inicio del job.
- **D-10: Healthcheck SQL en backend que chequea 5 tablas críticas.** Endpoint `GET /api/health/db` que ejecuta `SELECT 1 FROM <table> LIMIT 0` sobre: `business_settings`, `articulos`, `existencias`, `prop_marca`, `orders`. Si alguna falla, el endpoint devuelve 503. Se conecta a `docker-compose.yml` como `healthcheck: test: curl -fs http://localhost:3001/api/health/db || exit 1` con interval 30s. Detecta drift al deploy o al startup, no al primer uso real (que fue lo que costó 4 días de admin roto en abril).
- **D-11: ADR + entrada en CLAUDE.md sobre disciplina de migraciones.** Crear `.planning/decisions/migration-discipline.md` (o equivalente) con la convención: "Cualquier cambio de schema en prod va por `pnpm db:migrate` ejecutado contra la DB. Excepción única: emergencia documentada en quick task con SUMMARY que liste Pending Actions; cada Pending Action que toque prod queda como `BLOCKING-PROD-*` todo en `.planning/todos/pending/` hasta validar ejecución". Update a `CLAUDE.md` §convenciones referenciando el ADR.
- **D-12: Logging mejorado del SQL error cause queda diferido.** Discutido y descartado para Phase 38 — es detección post-hoc, no prevención. Puede entrar en una fase futura de observabilidad si se necesita.

### Scope y verificación

- **D-13: Solo prod (`erp_sanchez` en VPS) en Phase 38.** Las DBs locales de dev no requieren reconciliación dentro de la fase porque el drift sistémico ocurrió únicamente en prod (los SQL via psql se aplicaron contra el VPS, no contra DBs locales). Una vez commiteados `_journal.json`, snapshots y `0006_baseline.sql`, cualquier dev que haga `git pull` + `pnpm db:push --force` (o recree su DB local desde scratch) queda alineado. Documentar este step para devs en el SUMMARY de la fase.
- **D-14: Smoke playwright en los 10 módulos del admin.** Cobertura completa según el plan tentativo del roadmap: `/articulos /orders /sales /purchases /propiedades /dispositivos /webhooks /api-keys /inventarios /settings`. Para cada uno: navegación carga 200, sin 500 en logs del backend. Reporte verde/rojo por módulo. Captures de pantalla solo en caso de fallo. Read-only — sin mutation flows (descartado).
- **D-15: Backups persisten 30 días en VPS.** Path canónico: `/var/backups/erp_sanchez/`. Naming: `backup-YYMMDD-HHMM.dump` (formato `pg_dump -F c`, restorable via `pg_restore`). Cleanup manual o cronjob simple (no parte de Phase 38 — solo se asegura que el backup queda guardado).

### Claude's Discretion

- **CI infra:** cómo materializar la DB de test para el step `drizzle-kit check` (Postgres service container en GitHub Actions vs DB staging vs Postgres efímero) — researcher/planner decide.
- **Shape exacto del endpoint `/api/health/db`:** controller standalone vs reusar el módulo `health` existente; response shape (`{ ok: boolean, tables: { name, status }[] }` vs solo status code); whether to expose a `/api/health/db?verbose=1` mode — planner decide siguiendo patrones NestJS del proyecto.
- **Algoritmo de cálculo de hashes para `__drizzle_migrations`:** Drizzle internamente usa SHA256 del contenido del SQL file pero el formato exacto (con/sin trailing newline, encoding) — researcher debe confirmar leyendo `drizzle-orm/migrator.ts` o ejecutando contra una DB de prueba, NO inferir.
- **Formato del reporte de drift residual:** markdown estructurado vs JSON; archivo separado o sección en `38-VERIFICATION.md` (si se llega a esa fase de GSD); ordering de las entries — planner decide.
- **Naming exacto del file ADR:** `.planning/decisions/migration-discipline.md` vs `docs/adr/0001-migration-discipline.md` vs otro path siguiendo convención existente del proyecto — planner verifica si hay ADRs previos y usa el mismo path.
- **Cronjob de cleanup de backups antiguos:** out of scope formal de Phase 38, pero si el planner lo agrega como step opcional, queda a discreción.

### Folded Todos

- **`auditar-desfase-sistemico-db-de-produccion`** (`.planning/todos/pending/2026-05-01-auditar-desfase-sistemico-db-de-produccion.md`) — Originó esta fase. Su contenido se incorpora al scope de Phase 38: la opción 1 del todo ("Reconciliación full") corresponde a D-01 (repair journal-only); las opciones 2 (Reset controlado) y 3 (Repair journal con DELETE) quedan descartadas. El backup del todo (pg_dump como safety net) queda formalizado en D-05. Tras escribir CONTEXT.md, mover el todo a `.planning/todos/done/` referenciando esta fase.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements y state

- `.planning/ROADMAP.md` §"Phase 38: Reconciliar drift sistemico de DB de produccion" — Goal, plan tentativo (5 steps), Detectado por, Antecedente, recomendación de orden vs Phase 37.
- `.planning/REQUIREMENTS.md` — Phase 38 NO está mapeada a requirements de v1.3 (es phase reactiva post-detección). Sin requisitos formales asignados, los success criteria salen del Goal del roadmap + decisiones de este CONTEXT.md.
- `.planning/PROJECT.md` §"Current Milestone: v1.3" — Phase 38 es prerequisito implícito para Phase 37; no toca features de v1.3 directamente.
- `.planning/STATE.md` — estado actual: Phase 29 ejecutándose. Phase 38 se inserta como reactiva.

### Phase 38 origin (causal chain)

- `.planning/todos/pending/2026-05-01-auditar-desfase-sistemico-db-de-produccion.md` — Todo origen. Captura el problema completo, opciones consideradas y antecedentes. Folded por D-13 ↑.
- `.planning/quick/260409-jwl-sync-drizzle-schema-with-production-db/260409-jwl-SUMMARY.md` — Quick task del 9 abr que generó `migration-prod.sql` para crear las 16 tablas faltantes. Pending Actions del SUMMARY (correr el SQL en prod, rebuild containers, redeploy) — solo 2 y 3 se ejecutaron entonces.
- `.planning/quick/260428-mig-aplicar-migration-prod-pendiente/260428-mig-SUMMARY.md` — Quick task del 28 abr que finalmente aplicó `migration-prod.sql` (16 CREATE TABLE + 2 ALTER + 39 CREATE INDEX en una transacción). Causa raíz del drift documentada. **Lecciones del SUMMARY incorporadas a D-10 (healthcheck) y D-11 (ADR de disciplina).**
- `.planning/quick/260429-rec-recuperar-datos-inventarios-existencias/260429-rec-SUMMARY.md` — Quick task del 29 abr que migró 7745 filas a `inventarios_articulos` y aplicó manualmente `0003_add_columna_inv_articulos.sql`. **Drift residual documentado** (sector_id huérfano, columnas jsonb mismatch) — incorporado a D-08.

### Phase 29 (contexto inmediato — generó las prop\_\* manuales del 2026-05-01)

- `.planning/phases/29-catalogos-de-atributos/29-CONTEXT.md` — Contexto de Phase 29. Las 6 tablas `prop_*` se crearon manualmente vía `psql -f apps/backend/drizzle/0004_phase29_propiedades.sql` durante el smoke (2026-05-01) que detectó este problema.
- `apps/backend/drizzle/0004_phase29_propiedades.sql` — DDL de las 6 tablas `prop_*`.
- `apps/backend/drizzle/0005_phase29_cache_trigger.sql` — Trigger PG de cache de nombre. Aplicado manualmente igual que 0004.

### Drizzle infra y schema actual

- `apps/backend/drizzle.config.ts` — Config Drizzle. Schema en `./src/db/schema.ts`, output en `./drizzle`.
- `apps/backend/src/db/schema.ts` — Schema TypeScript fuente de verdad (debería estar alineado con prod tras 260428-mig + 260409-jwl). El `0006_baseline` generado en D-02 lo prueba.
- `apps/backend/drizzle/meta/_journal.json` — Journal LOCAL drifteado. Hoy: 0000, 0001, 0002, 0004, 0005 (falta 0003). Phase 38 lo edita en D-02.
- `apps/backend/drizzle/meta/0000_snapshot.json`, `0001_snapshot.json`, `0002_snapshot.json` — Snapshots existentes. Phase 38 crea dummies para 0003, 0004, 0005 (D-02).
- `apps/backend/drizzle/0003_add_columna_inv_articulos.sql` — Migration aplicada manualmente el 29 abr, ausente del journal. Phase 38 la integra.
- `apps/backend/drizzle/0000_*.sql` ... `0005_*.sql` — Files SQL existentes. Phase 38 calcula sus hashes para D-03 (audit prod).
- `apps/backend/src/db/migration-prod.sql` — Script idempotente de catch-up que se aplicó el 28 abr. Histórico — NO se vuelve a ejecutar en Phase 38.

### Memorias y políticas (impacto directo)

- `feedback_never_drop_tables.md` — `~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/`. Bloquea reset full y descarta `TRUNCATE __drizzle_migrations`. **Tiene precedencia sobre cualquier shortcut técnico.**
- `feedback_pending_actions_prod.md` — Mismo path. Origen del todo y de Phase 38. Política reforzada en D-11 (ADR de disciplina).
- `feedback_docker_compose.md` — Mismo path. Comandos canónicos: `docker compose up -d --build`, `docker compose restart erp-backend`, NUNCA `pnpm dev`. Backend interno port 3001, web 3000, Traefik en `erp.sanchezrepuestos.com.ar`.

### Drizzle official docs (research target)

- `drizzle-kit migrate` — researcher debe leer la doc actualizada via Context7 antes de planear D-02 paso 3 (qué garantiza el `db:generate` cuando el journal tiene entries con snapshots dummies).
- `drizzle-orm/migrator` source — researcher debe verificar el algoritmo exacto de cálculo de hash que usa Drizzle internamente para `__drizzle_migrations` (Claude's Discretion ↑).

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **NestJS Health module** (existe el patrón en NestJS, verificar si el proyecto ya tiene `apps/backend/src/health/` o solo `/api/health` ad-hoc). El planner extiende o crea `db.controller.ts` siguiendo el patrón existente.
- **Drizzle client** ya inicializado en backend (consume `DATABASE_URL`). Reusable para el endpoint healthcheck — solo importar y ejecutar `SELECT 1 FROM <table> LIMIT 0`.
- **Quick task SUMMARY pattern** — `260428-mig-SUMMARY.md` y `260429-rec-SUMMARY.md` muestran el formato esperado para reportar steps ejecutados, datos preservados, causa raíz, lessons learned. Phase 38 emite un SUMMARY similar al final.
- **`gsd-sdk query commit`** — verb canónico para commits de la fase. Cumple convenciones del repo (conventional commits en inglés).
- **playwright-cli skill** del usuario (`playwright-testing` global skill) — herramienta canónica para el smoke multi-módulo de D-14. NO usar Playwright MCP server.

### Established Patterns

- **Migrations via psql como excepción documentada, no como rutina.** Tras D-11, cualquier `psql -f` futuro queda como anti-patrón salvo emergencia documentada. Antecedentes: 260428-mig y 260429-rec — ambos casos legítimos de emergencia.
- **Idempotencia obligatoria en SQL contra prod.** Patrón de `IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ya consolidado en `migration-prod.sql` y `0003_add_columna_inv_articulos.sql`. El INSERT a `__drizzle_migrations` de D-03 también debe ser idempotente (`ON CONFLICT (hash) DO NOTHING` si la tabla tiene esa constraint, o pre-check con SELECT).
- **Backups en `pg_dump -F c` (custom format)** — formato canónico del proyecto. Restorable via `pg_restore` (no `psql`).
- **Servicios dockerizados — interacción siempre vía `docker exec`/`docker compose`** (ver `feedback_docker_compose.md`). Comandos psql/pg_dump van por `docker exec postgres ...`.

### Integration Points

- **`__drizzle_migrations` table** (postgres container, db `erp_sanchez`) — punto crítico de la fase. Único contacto con prod salvo el reporte de drift y el deploy del healthcheck.
- **`apps/backend/drizzle/_journal.json`** — file local committeado al repo. Phase 38 lo edita y commitea.
- **`apps/backend/drizzle/meta/*.json`** — snapshots committeados al repo. Phase 38 crea 3 nuevos (3, 4, 5) como dummies + el `0006_snapshot.json` real generado por `db:generate`.
- **`apps/backend/src/health/`** — módulo NestJS donde aterrizar el endpoint `/api/health/db`. Si no existe, crear siguiendo convención.
- **`apps/backend/package.json`** §scripts — añadir `"db:check": "drizzle-kit check && drizzle-kit generate --check"`.
- **`docker-compose.yml`** (root) — agregar `healthcheck:` block al servicio `erp-backend`.
- **CI workflow** (`.github/workflows/*.yml` si existe) — añadir step de Drizzle drift check.
- **`CLAUDE.md`** (root del proyecto) — entry nueva en §convenciones referenciando el ADR de disciplina.
- **Memoria global** (`~/.claude/projects/.../memory/`) — opcional, considerar agregar `feedback_drift_protection.md` con la lección consolidada.

</code_context>

<specifics>
## Specific Ideas

- **Backup naming canónico:** `backup-YYMMDD-HHMM.dump` (ej: `backup-260501-1530.dump`). Path: `/var/backups/erp_sanchez/` en VPS.
- **Healthcheck table list inicial:** `['business_settings', 'articulos', 'existencias', 'prop_marca', 'orders']` — exactamente 5 tablas, una por dominio crítico (header del admin / core / stock / phase 29 / comprobantes).
- **Healthcheck endpoint path:** `/api/health/db` (NO `/health/db` ni `/api/db/health`).
- **Comando de AUDIT prod** (read-only, ejecutable manualmente para review):
  ```bash
  docker exec postgres psql -U sanchez -d erp_sanchez \
    -c 'SELECT idx, tag, hash, created_at FROM __drizzle_migrations ORDER BY idx'
  ```
- **Commit convention:** conventional commits en inglés. Sugerencias para los commits de la fase:
  - `chore(38): pre-flight backup of erp_sanchez (pg_dump + restore-test)`
  - `chore(38): repair local _journal.json with forward markers for 0003-0005`
  - `feat(38): generate 0006_baseline migration to align with prod state`
  - `chore(38): audit __drizzle_migrations and insert missing entries`
  - `feat(backend): add /api/health/db endpoint with critical-table check`
  - `ci: add drizzle-kit check step to detect schema drift`
  - `docs(38): add migration-discipline ADR and update CLAUDE.md`

</specifics>

<deferred>
## Deferred Ideas

- **Cleanup de `_prisma_migrations`** — Phase futura de housekeeping de DB legacy. Requiere autorización explícita y un mapa completo de uso. Por ahora cohabita.
- **Cleanup de tablas `comprobantes_*` legacy** — Pertenecen al sistema ERP/POS legacy con data viva. NO touch hasta que el sistema legacy se desmantele formalmente. Posible phase del milestone v1.5+ si la company hace cutover completo a admin.
- **DROP COLUMN `inventarios_articulos.sector_id`** — Drift residual conocido. Phase 38 propone el fix; aplicación queda diferida o requiere OK explícito en plan/ejecución.
- **Patch a `inventario_sectores.columnas` en `schema.ts` (`$type<number[]>()`)** — Drift residual conocido. Phase 38 puede aplicarlo dentro del scope (no destructive) si el planner lo considera trivial; si no, queda diferido.
- **Logging mejorado del cause de errores SQL en backend** — Discutido y descartado para Phase 38. Pertenece a una phase futura de observabilidad/DX.
- **Cronjob de cleanup automático de backups antiguos en VPS** — Out of scope formal. Si el planner lo agrega como step opcional al SUMMARY, queda como recomendación operativa, no como deliverable.
- **Reconciliación de DBs locales de devs** — No es responsabilidad de Phase 38. Cada dev se alinea con `git pull` + `db:push --force` post-merge.
- **`drizzle-kit check` en pre-commit (husky)** — Defensa en profundidad descartada por costo de fricción local. Considerar si surge un caso real donde CI no atrapó el drift a tiempo.

</deferred>

---

_Phase: 38-reconciliar-drift-sistemico-de-db-de-produccion_
_Context gathered: 2026-05-01_
