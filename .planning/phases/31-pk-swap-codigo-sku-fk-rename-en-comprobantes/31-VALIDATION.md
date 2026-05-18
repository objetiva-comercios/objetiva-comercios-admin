---
phase: 31
slug: pk-swap-codigo-sku-fk-rename-en-comprobantes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-18
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Esta es la fase de mayor riesgo del milestone v1.3 (PK swap + 3 deploys + 24-48h soak). El contrato de validación es **bloqueante** entre Deploys: las 5 queries SC#5 deben retornar 0 antes de avanzar de un deploy al siguiente.

---

## Test Infrastructure

| Property                   | Value                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| **Framework**              | Jest (NestJS) + supertest para E2E backend; Vitest para `@objetiva/utils` (composer puros) |
| **Config file**            | `apps/backend/jest.config.ts` (default NestJS); `packages/utils/vitest.config.ts`          |
| **Quick run command**      | `pnpm --filter backend typecheck && pnpm --filter web typecheck`                           |
| **Full suite command**     | `pnpm --filter backend test && pnpm --filter web typecheck && pnpm --filter web build`     |
| **SQL validation command** | `scripts/phase31-validation.sh integrity` (creado en Wave 0)                               |
| **Estimated runtime**      | typecheck ~30s · backend tests ~60s · full ~120s · SQL integrity ~5s                       |

---

## Sampling Rate

- **Per task commit:** `pnpm --filter backend typecheck && pnpm --filter web typecheck`
- **Per wave merge (entre Plans del mismo deploy):** correr tests E2E de articulos + las 5 queries SC#5 contra DB local
- **Phase gate (entre Deploys 1↔2, 2↔3):** `scripts/phase31-validation.sh integrity` debe retornar exit 0 ANTES de avanzar
- **Before `/gsd:verify-work`:** full suite verde + las 5 queries SC#5 = 0 en prod post-Deploy-3
- **Max feedback latency:** 60 segundos (typecheck) — la validación SQL completa requiere conexión a DB prod (~5s adicionales)

---

## Per-Task Verification Map

> El planner concreta los Task IDs definitivos al generar PLAN.md. Esta tabla es el contrato de cobertura mínimo por Success Criterion del ROADMAP.

| Task ID (sugerido) | Plan                      | Wave | Requirement | Threat Ref | Secure Behavior                                                        | Test Type    | Automated Command                                                                                                                                                                                           | File Exists |
| ------------------ | ------------------------- | ---- | ----------- | ---------- | ---------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 31-01-01           | 31-01 (Preflight)         | 0    | VAR-10      | —          | Preflight audit informativo no bloquea; output a 31-PREFLIGHT-AUDIT.md | smoke SQL    | `scripts/phase31-preflight-audit.sh`                                                                                                                                                                        | ❌ W0       |
| 31-01-02           | 31-01                     | 0    | VAR-10      | —          | pg_dump full restaurable a DB temporal                                 | smoke bash   | `pg_dump -Fc ... && pg_restore --list ...`                                                                                                                                                                  | ❌ W0       |
| 31-02-01           | 31-02 (Deploy 1 expand)   | 1    | VAR-10      | —          | `articulo_sku` populated en 5 hijas post-backfill                      | smoke SQL    | `psql -tAc "SELECT count(*) FROM existencias WHERE articulo_sku IS NULL"` → 0                                                                                                                               | ❌ W0       |
| 31-02-02           | 31-02                     | 1    | VAR-10      | —          | Backend double-write helper escribe ambas columnas en cada INSERT      | unit         | `pnpm --filter backend test -- articulos-helper.spec.ts`                                                                                                                                                    | ❌ W0       |
| 31-02-03           | 31-02                     | 1    | VAR-10      | —          | Overwrite `articulos.sku := stripSep(codigo)` ejecutado                | smoke SQL    | `psql -tAc "SELECT count(*) FROM articulos WHERE sku IS NULL OR sku != regexp_replace(codigo, '[-_.\s]+', '', 'g')"` → 0                                                                                    | ❌ W0       |
| 31-03-01           | 31-03 (Deploy 2 switch)   | 2    | VAR-10      | SC#1       | `articulos` tiene sku como PK                                          | smoke SQL    | `psql -tAc "SELECT a.attname FROM pg_attribute a JOIN pg_constraint c ON a.attnum=ANY(c.conkey) WHERE c.conrelid='articulos'::regclass AND c.contype='p'"` → `sku`                                          | ❌ W0       |
| 31-03-02           | 31-03                     | 2    | VAR-10      | SC#2       | 5 hijas tienen FK `articulo_sku`                                       | smoke SQL    | `psql -tAc "SELECT count(*) FROM pg_constraint WHERE conname LIKE '%_articulo_sku_fkey'"` → 5                                                                                                               | ❌ W0       |
| 31-03-03           | 31-03                     | 2    | VAR-10      | SC#3       | `findOne(sku)` retorna 1, `findByCodigo(codigo)` retorna N             | E2E          | `pnpm --filter backend test -- articulos-phase31.e2e-spec.ts`                                                                                                                                               | ❌ W0       |
| 31-03-04           | 31-03                     | 2    | VAR-10      | SC#4       | Webhook payload v2 incluye `sku`                                       | E2E          | E2E test: POST articulo + assert `payload.articulo.sku !== null` en webhook_deliveries                                                                                                                      | ❌ W0       |
| 31-03-05           | 31-03                     | 2    | VAR-10      | SC#5       | Integridad referencial: 5 queries retornan 0                           | smoke SQL    | `scripts/phase31-validation.sh integrity` exit 0                                                                                                                                                            | ❌ W0       |
| 31-03-06           | 31-03                     | 2    | VAR-10      | —          | Trigger `trg_update_articulo_unidades` quedó ENABLED                   | smoke SQL    | `psql -tAc "SELECT tgenabled FROM pg_trigger WHERE tgname='trg_update_articulo_unidades'"` → `O`                                                                                                            | ❌ W0       |
| 31-03-07           | 31-03                     | 2    | VAR-10      | —          | `articulos.unidades` sincronizado con SUM(existencias.cantidad)        | smoke SQL    | Query de Critical Failure Mode #4 (debajo) → 0                                                                                                                                                              | ❌ W0       |
| 31-03-08           | 31-03                     | 2    | VAR-10      | —          | Frontend `/articulos/[sku]/editar` carga sin 404                       | manual + log | Playwright o curl + assert status 200                                                                                                                                                                       | ❌ W0       |
| 31-04-01           | 31-04 (Deploy 3 contract) | 3    | VAR-10      | —          | `articulo_codigo` column eliminada en 5 hijas                          | smoke SQL    | `psql -tAc "SELECT count(*) FROM information_schema.columns WHERE column_name='articulo_codigo' AND table_name IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos')"` → 0 | ❌ W0       |
| 31-04-02           | 31-04                     | 3    | VAR-10      | SC#2       | Backend simplificado: helper ya no doble-escribe                       | smoke unit   | `pnpm --filter backend test -- articulos-helper.spec.ts` (test de single-write)                                                                                                                             | ❌ W0       |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Antes de aplicar cualquier migration, crear estos artefactos de validación. Sin ellos, no hay forma de gatear entre deploys.

- [ ] `scripts/phase31-preflight-audit.sh` — Bash + psql que ejecuta las 4 queries de auditoría D-01 (null_sku, sku_eq_codigo, sku_diff_codigo, sku_dupes) y guarda output en `.planning/phases/31-.../31-PREFLIGHT-AUDIT.md`. Non-blocking.
- [ ] `scripts/phase31-validation.sh` — Bash + psql con sub-comandos: `integrity` (5 queries SC#5), `pk-swap` (verifica sku como PK), `triggers` (verifica trg_update_articulo_unidades ENABLED), `unidades-sync` (verifica articulos.unidades sincronizado). Exit 0 si todos OK, exit 1 si cualquiera falla.
- [ ] `apps/backend/test/articulos-phase31.e2e-spec.ts` — Test E2E supertest que cubre SC#3 (findOne sku + findByCodigo retornando [Articulo]) y SC#4 (POST articulo → assert webhook_deliveries.payload.articulo.sku !== null).
- [ ] `apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts` — Unit test de `ArticulosHelper.resolveSku()`: happy path (sku populated), edge case (sku null → fallback a stripSep(codigo)).
- [ ] Reusar `packages/utils/__tests__/composer.spec.ts` para verificar `stripSep()` (existente desde Phase 30 — no se crea, solo se garantiza que sigue pasando).
- [ ] `pg_dump` baseline pre-Deploy-1: `pg_dump -Fc -h $PGHOST -U $PGUSER -d $PGDB -f /var/backups/erp_sanchez/phase31/pre_deploy1_$(date +%Y%m%d_%H%M%S).dump` — verificar tamaño >0 y restoreabilidad smoke.

---

## Manual-Only Verifications

Algunas validaciones requieren observación humana o tráfico real durante el soak. No se automatizan.

| Behavior                                                   | Requirement                  | Why Manual                          | Test Instructions                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 24-48h soak entre deploys sin regresiones                  | SC#5 + estabilidad operativa | Requiere tráfico real prod          | Monitorear `count(*) WHERE articulo_sku IS NULL` cada hora; backend error logs sin spikes; trigger sigue actualizando `articulos.unidades`. Abort criteria: cualquier SC# != 0, error rate +20%, 404 spike en `/articulos/*`. |
| Frontend rekey `/articulos/[sku]/editar` carga sin errores | SC#3 (parcial)               | UI visual, navegación, links rotos  | Post-Deploy-2: navegar `/articulos`, click en cualquier artículo, verificar redirect a `/articulos/{sku}/editar` (no `/{codigo}/`), formulario carga, save funciona.                                                          |
| Notice en `/settings/webhooks` legible y correcto          | D-10                         | Texto en es-AR, presentación visual | Post-Deploy-2: visitar `/settings/webhooks`, verificar Alert con texto "Desde v1.3 el payload de articulo.\* incluye campo `sku` además de `codigo`. ..."                                                                     |
| Subscriptors externos no reportan rotura                   | D-09/D-11                    | Comunicación con terceros           | Si hay suscriptores externos conocidos, contactar pre-Deploy-2 con resumen del cambio de payload. Window 24h para que respondan.                                                                                              |
| Rollback funcional desde pg_dump                           | D-04                         | DR drill                            | Pre-Deploy-2: crear DB temporal `createdb erp_phase31_dr_drill` + `pg_restore` el dump + smoke `SELECT count(*) FROM articulos` → 101.021.                                                                                    |

---

## Critical Failure Modes

> Cómo detectar cada modo de falla. Las queries de detección son las que el planner debe asignar al validation step de cada PLAN.md.

| Modo de falla                                             | Query de detección                                                                                                                                                                                                                         | Cuándo correr                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ----------------------- |
| **PK swap dejó articulos sin PK**                         | `SELECT count(*) FROM information_schema.table_constraints WHERE table_name='articulos' AND constraint_type='PRIMARY KEY'` → debe ser 1                                                                                                    | Post-Deploy-2 (gate step)                         |
| **FK pointing a articulos.codigo persiste post-Deploy-2** | `SELECT conname FROM pg_constraint WHERE conrelid::regclass::text IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos') AND contype='f'` → todas en `_articulo_sku_fkey`, ninguna `_articulo_codigo_fkey` | Post-Deploy-2 (gate step)                         |
| **Trigger quedó DISABLED**                                | `SELECT tgenabled FROM pg_trigger WHERE tgname='trg_update_articulo_unidades'` → debe ser `O` (origin/enabled)                                                                                                                             | Post-Deploy-2 (gate step)                         |
| **articulos.unidades desincronizado**                     | `SELECT count(*) FROM articulos a LEFT JOIN (SELECT articulo_sku, SUM(cantidad) AS s FROM existencias GROUP BY articulo_sku) e ON e.articulo_sku=a.sku WHERE a.unidades != COALESCE(e.s, 0)` → debe ser 0                                  | Post-Deploy-2 (gate step)                         |
| **Webhook payload v2 sin sku**                            | POST articulo → wait 5s → `SELECT payload->'articulo'->'sku' FROM webhook_deliveries ORDER BY created_at DESC LIMIT 1` → debe ser texto no-null                                                                                            | Post-Deploy-2 (E2E test)                          |
| **Drift schema.ts ↔ DB**                                  | `pnpm --filter backend typecheck` rompe O queries con drizzle 500 silencioso. Pre-detectar con `pnpm --filter backend db:studio` comparando columnas.                                                                                      | Per task commit + post-migration                  |
| **Backend olvida double-write una ruta** (Deploy 1-2)     | Por cada hija: INSERT via API + `SELECT count(*) FROM <hija> WHERE articulo_sku IS NULL ORDER BY id DESC LIMIT 10` → todos populated                                                                                                       | Per task commit en Deploy 1, smoke E2E en Wave 1  |
| **inv_articulos_unique_idx rota durante PK swap**         | `SELECT count(*) FROM pg_indexes WHERE indexname='inv_articulos_unique_idx' AND indexdef LIKE '%articulo_sku%'` → debe ser 1                                                                                                               | Post-Deploy-2 (gate step)                         |
| **existencias PK compuesta no se rebuildeó**              | `SELECT a.attname FROM pg_attribute a JOIN pg_constraint c ON a.attnum=ANY(c.conkey) WHERE c.conrelid='existencias'::regclass AND c.contype='p'` → debe retornar `articulo_sku` y `deposito_id`                                            | Post-Deploy-2 (gate step)                         |
| **Restore del pg_dump no funciona**                       | `pg_restore --list /var/backups/.../pre_deploy2_X.dump                                                                                                                                                                                     | wc -l` → debe ser >0; smoke restore a DB temporal | Pre-Deploy-2 (DR drill) |

---

## Eval Suite — Plan-by-Plan Coverage Expectations

> Estas son las expectativas de cobertura que el plan-checker va a validar contra los PLAN.md generados. Cada plan debe asignar explícitamente los validation steps correspondientes.

**Plan 31-01 (Wave 0 — Preflight & Safety Net):**

- Acceptance criteria incluye exit 0 de `phase31-preflight-audit.sh` + creación de `31-PREFLIGHT-AUDIT.md`.
- Acceptance criteria incluye `pg_dump` con tamaño no-cero + smoke restore a DB temporal con count(\*) FROM articulos = 101.021.

**Plan 31-02 (Wave 1 — Deploy 1 expand):**

- Acceptance criteria incluye `0009_phase31_expand.sql` aplicada con `--single-transaction --set ON_ERROR_STOP=1`.
- Acceptance criteria incluye las 5 queries SC#5 = 0 post-migration.
- Acceptance criteria incluye `articulos.unidades` consistente post-overwrite (trigger sigue funcionando).
- Acceptance criteria incluye 24-48h soak completed sin SC# violations antes de gatear a Wave 2.

**Plan 31-03 (Wave 2 — Deploy 2 switch):**

- Acceptance criteria incluye pre-flight pg_dump full + smoke restore drill (CRITICAL).
- Acceptance criteria incluye `0010_phase31_switch.sql` aplicada exitosamente.
- Acceptance criteria incluye: SC#1, SC#2, SC#3, SC#4, SC#5 ✓ vía `phase31-validation.sh integrity`.
- Acceptance criteria incluye E2E test passing (`articulos-phase31.e2e-spec.ts`).
- Acceptance criteria incluye Frontend smoke `/articulos/{sku}/editar` retorna 200.
- Acceptance criteria incluye 24-48h soak completed.

**Plan 31-04 (Wave 3 — Deploy 3 contract):**

- Acceptance criteria incluye `0011_phase31_contract.sql` aplicada.
- Acceptance criteria incluye SC#2 final confirmado (`articulo_codigo` column = 0 occurrences en 5 hijas).
- Acceptance criteria incluye backend helper simplificado (sin double-write) testeado.
- Acceptance criteria incluye full stack rebuild + tests pasando.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify o Wave 0 dependencies declaradas
- [ ] Sampling continuity: no 3 consecutive tasks sin automated verify
- [ ] Wave 0 cubre todas las MISSING references (5 artefactos arriba)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (typecheck) / < 5s (SQL integrity)
- [ ] `nyquist_compliant: true` set in frontmatter (post Wave 0 implementation)

**Approval:** pending — set to `approved YYYY-MM-DD` once Wave 0 artifacts exist and the plan-checker confirms coverage.
