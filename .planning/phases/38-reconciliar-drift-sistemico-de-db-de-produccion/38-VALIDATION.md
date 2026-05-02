---
phase: 38
slug: reconciliar-drift-sistemico-de-db-de-produccion
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-02
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Phase 38 reconcilia el drift sistémico entre `drizzle.__drizzle_migrations` (prod) y el journal local. La validación combina: (a) checks scriptables sobre archivos del repo, (b) checks contra `drizzle.__drizzle_migrations` en prod (gated humanos), (c) smoke read-only con playwright-cli sobre 10 módulos del admin.

---

## Test Infrastructure

| Property               | Value                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | none — shell scripts (bash) + `drizzle-kit` CLI + `playwright-cli` (skill global del usuario, NO MCP)                               |
| **Config file**        | none — los scripts viven en `scripts/phase38-*.sh` (Wave 0 los crea)                                                                |
| **Quick run command**  | `pnpm --filter backend exec drizzle-kit check && pnpm --filter backend exec drizzle-kit generate --check`                           |
| **Full suite command** | `pnpm --filter backend db:check && bash scripts/phase38-smoke-playwright.sh` _(asume que 38-04 Task 1 ya creó el alias `db:check`)_ |
| **Estimated runtime**  | ~5s quick (drizzle CLI local), ~3-5min full (incluye smoke playwright sobre 10 módulos en prod)                                     |

---

## Sampling Rate

- **After every task commit:** Run quick `pnpm --filter backend exec drizzle-kit check && pnpm --filter backend exec drizzle-kit generate --check` (5s feedback). NOTA: 38-04 Task 1 introduce el alias `db:check` — antes de ese commit usar los dos comandos raw separados.
- **After every plan wave:** Run full suite (depende del wave: tras W4 corre el smoke playwright porque depende de schema.ts patched).
- **Before `/gsd-verify-work`:** Full suite green + DRIFT-REPORT.md generado y revisado humano.
- **Max feedback latency:** 5s (quick) / 5min (full).

---

## Per-Task Verification Map

Notación: cada task ID es `{plan}-{N}` (N = orden dentro del plan, 01-based). Type: `auto` ejecuta sin pausa, `human` requiere intervención humana.

| Task ID  | Plan | Wave | Decisión cubierta                   | Threat Ref        | Type  | Automated Command (resumen)                                                                                                                                                                                                                                                                                                                                      | File Exists       | Status     |
| -------- | ---- | ---- | ----------------------------------- | ----------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- |
| 38-01-01 | 01   | 1    | D-05, D-15                          | T-38-01 / T-38-02 | auto  | `test -x scripts/phase38-preflight-backup.sh && bash -n scripts/phase38-preflight-backup.sh && grep -q "set -e" ... && grep -q "pg_dump" ... && grep -q "/var/backups/erp_sanchez/" ... && grep -q "comprobantes_cabecera" scripts/phase38-preflight-backup.sh`                                                                                                  | ❌ W0             | ⬜ pending |
| 38-01-02 | 01   | 1    | D-05                                | T-38-01 / T-38-02 | human | `ls -la /var/backups/erp_sanchez/backup-*.dump retorna ≥1 archivo del día actual; docker exec postgres psql -lqt \| grep erp_restore_test retorna vacío` (ejecución VPS, gate ABORTAR si row counts no matchean)                                                                                                                                                 | n/a (VPS)         | ⬜ pending |
| 38-02-01 | 02   | 2    | D-02, D-13                          | T-38-04           | auto  | `node -e "JSON _journal.json has 6 entries con tags 0000-0005" && node -e "snapshots 0002-0005 tienen UUIDs únicos AND prevId chain válida" && pnpm --filter backend exec drizzle-kit check`                                                                                                                                                                     | ❌ W0             | ⬜ pending |
| 38-02-02 | 02   | 2    | D-02 (override §1, §4)              | T-38-04 / T-38-05 | auto  | `test -f apps/backend/drizzle/0006_baseline.sql && grep -q "STAMPED, NOT EXECUTED" 0006_baseline.sql && grep -q "0001-migration-discipline.md" 0006_baseline.sql && journal entries=7 && entry[6].tag='0006_baseline' && drizzle-kit check`                                                                                                                      | ❌ W0             | ⬜ pending |
| 38-03-01 | 03   | 3    | D-03 (override §2, §3)              | T-38-06 / T-38-07 | auto  | `test -x scripts/audit-drizzle-migrations.sh && bash -n ... && grep -q "drizzle\.__drizzle_migrations" ... && grep -q "sha256sum" ... && ! grep -E "(UPDATE\|DELETE\|TRUNCATE).*__drizzle_migrations" scripts/audit-drizzle-migrations.sh`                                                                                                                       | ❌ W0             | ⬜ pending |
| 38-03-02 | 03   | 3    | D-03                                | T-38-06 / T-38-08 | human | `docker exec postgres psql -d erp_sanchez -c "SELECT count(*) FROM drizzle.__drizzle_migrations" retorna ≥7; re-ejecución del AUDIT muestra "0 missing entries"; re-ejecución del INSERT muestra "INSERT 0 0"` (gate humano: aprobación del reporte AUDIT)                                                                                                       | n/a (VPS)         | ⬜ pending |
| 38-04-01 | 04   | 4    | D-04 step 1 + W3 fix                | T-38-09           | auto  | `node -e "package.json scripts.db:check === 'drizzle-kit check && drizzle-kit generate --check'" && test -x scripts/phase38-smoke-playwright.sh && bash -n ... && grep -q "drizzle-kit pull" ... && grep -q "DATABASE_URL_PROD" ... && pnpm --filter backend db:check`                                                                                           | ❌ W0             | ⬜ pending |
| 38-04-02 | 04   | 4    | D-04, D-08, override §7 (B3+B4 fix) | T-38-09           | auto  | `test -f 38-04-DRIFT-REPORT.md && grep -q "sector_id\|DEFERRED\|APPLIED\|Detección\|Diff automatizado\|Revisión manual" ... && awk inventario_sectores block has $type<number[]> AND lacks $type<string[]> && pnpm --filter backend db:check`                                                                                                                    | ❌ W0             | ⬜ pending |
| 38-04-03 | 04   | 4    | D-14                                | T-38-09           | human | `Para cada módulo (10) curl retorna 200 o 401-redirect; docker logs --since 5m erp-backend \| grep -E "(ERROR\|500\|FATAL)" \| wc -l retorna 0` (smoke playwright-cli read-only sobre 10 rutas)                                                                                                                                                                  | n/a (VPS+browser) | ⬜ pending |
| 38-05-01 | 05   | 5    | D-10 (W6 fix)                       | T-38-10           | auto  | `test -f health.module.ts/controller.ts/service.ts && grep -q "HealthModule" app.module.ts && grep -q "@Controller('health')" + "@Public()" controller && grep -q "CRITICAL_TABLES\|business_settings\|prop_marca\|this.isProd\|process.env.NODE_ENV === 'production'" service && ! grep "@Get('health')" app.controller.ts && pnpm --filter backend type-check` | ❌ W0             | ⬜ pending |
| 38-05-02 | 05   | 5    | D-10 (override §5)                  | T-38-10           | human | `docker inspect erp-backend State.Health.Status === 'healthy'; curl /api/health/db → 200; jq .ok → true; en fail: jq '.tables[] \| select(status==fail) \| has("error")' → false (W6: prod no emite err.message)`                                                                                                                                                | n/a (deploy)      | ⬜ pending |
| 38-06-01 | 06   | 5    | D-09                                | T-38-11           | auto  | `node -e "package.json scripts.db:check exists" && test -f .github/workflows/ci.yml && grep -q "drizzle-drift-check\|postgres:16\|db:check\|actions/checkout@v4\|pnpm/action-setup@v4\|node-version: 22\|version: 9.0.0" ci.yml && pnpm --filter backend db:check`                                                                                               | ❌ W0             | ⬜ pending |
| 38-06-02 | 06   | 5    | D-11                                | n/a               | auto  | `test -f .planning/decisions/0001-migration-discipline.md && grep -q "ADR 0001\|Disciplina de migraciones\|260428-mig\|260429-rec\|feedback_pending_actions_prod.md" ADR && grep -q "0001-migration-discipline.md\|pnpm db:migrate" CLAUDE.md`                                                                                                                   | ❌ W0             | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Wave 0 = scripts y artefactos previos a la primera ejecución. La fase NO usa un framework de tests (no pytest/jest/vitest), pero los scripts shell y los archivos de reporte funcionan como "fixtures" del nyquist.

- [ ] `scripts/phase38-preflight-backup.sh` — bash script con `set -e`, banners, glifos `✓/❌`, `pg_dump -F c`, `pg_restore`, `psql` row-count compare, `dropdb`, persiste a `/var/backups/erp_sanchez/`. Creado en **38-01 Task 1**.
- [ ] `scripts/audit-drizzle-migrations.sh` — bash read-only con `set -e`, queries qualified `drizzle.__drizzle_migrations`, `sha256sum` para hashes, NO contiene UPDATE/DELETE/TRUNCATE. Creado en **38-03 Task 1**.
- [ ] `scripts/insert-drizzle-migrations.sql` — SQL idempotente con `INSERT ... WHERE NOT EXISTS`, qualified `drizzle.__drizzle_migrations`, `BEGIN/COMMIT`, header comment. Creado en **38-03 Task 1**.
- [ ] `scripts/phase38-smoke-playwright.sh` — bash que ejecuta playwright-cli sobre 10 rutas, captura screenshots solo en fallo. Creado en **38-04 Task 1**.
- [ ] `apps/backend/package.json` script `"db:check": "drizzle-kit check && drizzle-kit generate --check"` — añadido en **38-04 Task 1** (W3 fix: movido desde 38-06).

_No hay framework JS/Python a instalar — todo corre con tooling existente (bash, node, pnpm, drizzle-kit, playwright-cli)._

---

## Manual-Only Verifications

| Behavior                                                                  | Decisión | Why Manual                                                                                                                                                                                                                        | Test Instructions                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup `pg_dump` + restore-test gate                                      | D-05     | Toca prod DB y filesystem del VPS (`/var/backups/`). Requiere shell SSH y row-count compare (humano puede abortar si checksum diverge — D-05 paso 6).                                                                             | SSH al VPS → `bash scripts/phase38-preflight-backup.sh` → review del reporte → confirmar persistencia del `.dump` → ABORTAR phase si checksums no matchean.                                          |
| Aprobación del reporte AUDIT antes del INSERT en prod                     | D-03     | Política `feedback_never_drop_tables.md` exige OK explícito ante cualquier escritura a `__drizzle_migrations`. Si AUDIT revela hashes mismatched (no solo missing), escalar.                                                      | Revisar `scripts/audit-report.txt` (output del AUDIT) → confirmar que solo hay "missing entries" (NO mismatches) → autorizar ejecución de `scripts/insert-drizzle-migrations.sql` → re-AUDIT.        |
| Smoke playwright multi-módulo (10 rutas read-only)                        | D-14     | Requiere navegador real con sesión válida. Captures de pantalla solo en caso de fallo. El operador interpreta el "verde/rojo por módulo" reportado por el script.                                                                 | `bash scripts/phase38-smoke-playwright.sh` localmente con cookie de sesión válida apuntando a `https://erp.sanchezrepuestos.com.ar` → revisar tabla output (10 rutas, status 200/401/500).           |
| Deploy del healthcheck endpoint + verificación con docker `Health.Status` | D-10     | Requiere `docker compose up -d --build erp-backend` en VPS y observar el campo `State.Health.Status` cambiar a "healthy". Curl al endpoint público para validar shape de response (incluyendo W6: prod NO emite `error.message`). | SSH al VPS → `docker compose up -d --build erp-backend` → `docker inspect erp-backend` → `curl https://erp.sanchezrepuestos.com.ar/api/health/db` → simular fail (`docker stop postgres`) → re-curl. |
| Synthetic drift PR test (gate del workflow CI)                            | D-09     | Requiere abrir un PR en GitHub que modifica `schema.ts` con una columna throwaway, ver el job CI fallar (red X), cerrar el PR sin merge.                                                                                          | Crear branch `test/phase38-synthetic-drift` → agregar `_phase38_test: text('_phase38_test')` a un `pgTable` → push + `gh pr create` → verificar `drizzle-drift-check` job falla → cerrar PR.         |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 13 tasks mapped (8 auto + 5 human-checkpoint, todos con verify command o instrucciones manuales explícitas)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — la cadena más larga sin auto es 1 (los human-checkpoints siempre están entre auto-tasks gracias a las wave boundaries)
- [x] Wave 0 covers all MISSING references — los 5 scripts del Wave 0 están listados arriba y cada uno está mapeado al task que lo crea
- [x] No watch-mode flags — todos los comandos son one-shot
- [x] Feedback latency < 5s para quick / < 5min para full
- [x] `nyquist_compliant: true` set in frontmatter — DONE (this commit)
- [ ] `wave_0_complete: true` — flippea a `true` cuando los 5 scripts shell del Wave 0 estén creados (antes de Wave 1 ejecución, post-tasks 38-01-01, 38-03-01, 38-04-01)

**Approval:** approved 2026-05-02 (orchestrator-driven, post-revision iteration 1)
