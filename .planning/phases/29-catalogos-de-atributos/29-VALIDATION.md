---
phase: 29
slug: catalogos-de-atributos
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-30
updated: 2026-04-30
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by gsd-planner from RESEARCH.md `## Validation Architecture` § "Camino mínimo viable".

`wave_0_complete` se promueve a `true` cuando los tasks Wave 0 (Plan 04 Task 0, Plan 04 Task 1A, Plan 06 Task 0) hayan corrido con éxito durante `/gsd-execute-phase`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework — unit** | Vitest (apps/web) — config en `apps/web/vitest.config.ts`, environment `node` |
| **Framework — E2E**  | Playwright via project skill `playwright-testing` (NO MCP) — config en `apps/web/playwright.config.ts`, browser chromium |
| **Backend Jest** | NO en Phase 29 — diferido a v1.4 (validación E2E vía Playwright cubre los endpoints) |
| **Quick run command** | `pnpm --filter @objetiva/web test --run` (Vitest, runtime ~3s) |
| **Full suite command** | `pnpm --filter @objetiva/web test --run && pnpm --filter @objetiva/web test:e2e` (Vitest + Playwright, runtime ~30-45s) |
| **Estimated runtime** | quick: ~3s · full: ~30-45s con backend levantado |

Wave 0 instala las dependencias (`vitest`, `@playwright/test`) y configura los scripts en `apps/web/package.json` antes de ejecutar cualquier task de implementación.

---

## Sampling Rate

- **After every task commit:** Run quick suite (`pnpm --filter @objetiva/web test --run`)
- **After every plan wave (Plan 04, 05, 06):** Run full suite (Vitest + Playwright)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3s para Vitest unit; 45s para suite E2E completa

Nota: Plans 01-03 (backend + DB) se validan con `pnpm --filter @objetiva/backend type-check && pnpm --filter @objetiva/backend build` en lugar de tests unitarios, dado que no hay Jest backend en esta fase. La cobertura del comportamiento backend se ejerce E2E en Plan 06.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T01-01 | 01 | 1 | CAT-01, CAT-03, CAT-04 | n/a | Schema declarado con UNIQUE LOWER + CHECK regex | type-check + grep | `pnpm --filter @objetiva/backend type-check && grep -c "definePropTable" apps/backend/src/db/schema.ts` | apps/backend/src/db/schema.ts | ⬜ pending |
| T01-02 | 01 | 1 | CAT-03 | n/a | Migration auto contiene 6 CREATE TABLE + CHECK + UNIQUE LOWER | grep ddl | `grep -c "CREATE TABLE \"prop_" apps/backend/drizzle/0004_phase29_propiedades.sql` (esperar 6) | apps/backend/drizzle/0004_phase29_propiedades.sql | ⬜ pending |
| T01-03 | 01 | 1 | CAT-04 (prep) | n/a | Trigger SQL preparado pero comentado (D-02) | grep | `grep -q "BLOQUE COMENTADO" apps/backend/drizzle/0005_phase29_cache_trigger.sql` | apps/backend/drizzle/0005_phase29_cache_trigger.sql | ⬜ pending |
| T02-01 | 02 | 2 | CAT-01, CAT-03, CAT-04 | n/a | Migrations aplicadas dockerizado, sin DROP | psql count | `docker compose exec -T postgres psql -U postgres -d objetiva_dev -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'prop\\_%'" \| grep -qx '6'` | DB tables | ⬜ pending |
| T02-02 | 02 | 2 | CAT-03 | n/a | CHECK + UNIQUE LOWER + UNIQUE abrev rechazan inputs inválidos | psql DO blocks | misma sql query post-smoke verifica `count = 6` y deja `WHERE abrev='TS'` con count 0 | DB constraints | ⬜ pending |
| T03-01 | 03 | 3 | CAT-01, CAT-03 | n/a | constants + DTOs con regex validation | type-check + grep | `pnpm --filter @objetiva/backend type-check && grep -q "@Matches(/\\^\\[A-Z0-9\\]{1,8}\\$/" apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` | DTOs + constants | ⬜ pending |
| T03-02 | 03 | 3 | CAT-03 | n/a | Service detecta 23505 → ConflictException por constraint | type-check + grep | `pnpm --filter @objetiva/backend type-check && grep -c "code === '23505'" apps/backend/src/modules/propiedades/propiedades.service.ts` | service | ⬜ pending |
| T03-03 | 03 | 3 | CAT-01, CAT-04 | n/a | Controller registra 5 endpoints + RBAC admin | build + grep | `pnpm --filter @objetiva/backend build && grep -c "@Roles('admin')" apps/backend/src/modules/propiedades/propiedades.controller.ts` (esperar 3) | controller + module + AppModule | ⬜ pending |
| T03-04 | 03 | 3 | CAT-01 | n/a | Smoke: módulo cargado y ruta accesible | curl | `curl -sf http://localhost:3001/api/propiedades/marca > /dev/null \|\| [ $? -eq 22 ]` (200 o 401 ambos válidos = ruta existe) — los 11 sub-tests funcionales se ejercen E2E en Plan 06 | endpoint reachable | ⬜ pending |
| T04-00 | 04 | 4 | CAT-04 (E2E prep) | n/a | Wave 0: usuario admin E2E creado en Supabase | mcp / sql | Approach A: supabase MCP crea `e2e-admin@test.local` con `app_metadata.role=admin` (idempotente — verifica existencia primero); Approach B: `pnpm --filter @objetiva/backend db:seed:e2e` ejecutable cuando `E2E_SEED=true` | env vars E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD definidos | ⬜ pending |
| T04-01A | 04 | 4 | CAT-02 | n/a | RED: test de suggestAbrev falla porque impl no existe | vitest | `pnpm --filter @objetiva/web test --run abrev.test 2>&1 \| grep -E "(Cannot find module\|fail\|FAIL)"` (exit 0 = fail esperado) | apps/web/src/lib/abrev.test.ts | ⬜ pending |
| T04-01B | 04 | 4 | CAT-02 | n/a | GREEN: impl pasa los 10 tests | vitest | `pnpm --filter @objetiva/web test --run abrev.test 2>&1 \| grep -qE "10 (passed\|tests passed)"` | apps/web/src/lib/abrev.ts | ⬜ pending |
| T04-02 | 04 | 4 | CAT-01 | n/a | 4 fetchers + entry sidebar disponibles | type-check + grep | `pnpm --filter @objetiva/web type-check && grep -q "label: 'Propiedades'" apps/web/src/config/navigation.ts && grep -q "label: 'Artículos'" apps/web/src/config/navigation.ts` | api.client.ts + navigation.ts | ⬜ pending |
| T05-01 | 05 | 5 | CAT-01, CAT-02 | n/a | 3 dialogs con suggestAbrev en Create + UPPERCASE forzado | type-check + grep | `pnpm --filter @objetiva/web type-check && grep -q "suggestAbrev" apps/web/src/components/propiedades/propiedad-create-dialog.tsx && ! grep -q "suggestAbrev" apps/web/src/components/propiedades/propiedad-edit-dialog.tsx` (lo cumple D-17 solo en Create) | 3 dialog files | ⬜ pending |
| T05-02 | 05 | 5 | CAT-01, CAT-04 | n/a | Tabla + Tabs lazy + DropdownMenu actions | type-check + grep | `pnpm --filter @objetiva/web type-check && grep -q "DropdownMenu" apps/web/src/components/propiedades/propiedad-table.tsx && grep -cE "<TableHead" apps/web/src/components/propiedades/propiedad-table.tsx` (5 cols) | table + page | ⬜ pending |
| T05-03 | 05 | 5 | CAT-01 | n/a | Ruta /propiedades compila en Next 14 | next build | `pnpm --filter @objetiva/web build 2>&1 \| grep -E "Compiled successfully\|generating static pages"` | apps/web/src/app/(dashboard)/propiedades/page.tsx | ⬜ pending |
| T06-00 | 06 | 6 | CAT-04 (E2E prep) | n/a | Wave 0: confirmar que credenciales E2E del Plan 04-00 existen | env check | `[ -n "$E2E_ADMIN_EMAIL" ] && [ -n "$E2E_ADMIN_PASSWORD" ]` | env present | ⬜ pending |
| T06-01 | 06 | 6 | CAT-01..04 | n/a | E2E full flow + duplicado (Shimano vs SHIMANO) + component contract test | playwright + vitest | `pnpm --filter @objetiva/web test --run propiedad-create-dialog.test 2>&1 \| grep -qE "passed" && pnpm --filter @objetiva/web test:e2e 2>&1 \| grep -qE "(passed\|✓)"` | spec + component test | ⬜ pending |
| T06-02 | 06 | 6 | CAT-01..04 | n/a | UI-SPEC compliance + D-19 + copywriting | grep + manual visual | `grep -q "creada correctamente" apps/web/src/components/propiedades/propiedad-create-dialog.tsx && grep -q "actualizada correctamente" apps/web/src/components/propiedades/propiedad-edit-dialog.tsx && grep -q "desactivada" apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx && grep -q "Vas a desactivar" apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx` + checkpoint humano para los 15 puntos visuales | checkpoint | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — filled by /gsd-execute-phase.*

---

## Wave 0 Requirements

Tasks que deben correr ANTES que cualquier otro task del mismo plan o de planes downstream:

- [ ] **W0-1 (Plan 04 Task 0):** Vitest + scripts agregados a `apps/web` — `pnpm add -D vitest` + `vitest.config.ts` + `package.json` scripts. Bloquea Plan 04 Task 1A (RED) y 1B (GREEN).
- [ ] **W0-2 (Plan 04 Task 0 — E2E creds):** Approach A — Supabase MCP crea usuario `e2e-admin@test.local` (rol admin) **o** Approach B — `apps/backend/src/db/seed-e2e.ts` corrido con `E2E_SEED=true`. Documenta `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` en `apps/web/.env.test` (gitignored). Bloquea Plan 06 Task 1.
- [ ] **W0-3 (Plan 06 Task 0):** Playwright instalado + `playwright.config.ts` + `test:e2e` script en `package.json` + chromium descargado (`playwright install chromium`). Bloquea Plan 06 Task 1.
- [ ] **W0-4 (Plan 04 Task 1A):** RED — `apps/web/src/lib/abrev.test.ts` creado con 10 cases; corre y FALLA porque `abrev.ts` no existe. Es la primera mitad del TDD enforcement de B-3.

`wave_0_complete = true` solo cuando los 4 puntos están ✅.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 15-point UI-SPEC visual audit (Plan 06 Task 2 — Tabler aesthetic, lazy tabs, copywriting, no regresiones) | CAT-01..04 + D-19 | La compliance estética visual y la "ausencia de regresiones" en otras rutas no se pueden verificar 100% con greps; `Vas a desactivar`, `creada correctamente`, copy es-MX argentino y otras frases sí están automatizadas vía grep en el grep gate del `<verify>` del task, pero la verificación visual final (e.g. border-radius del Dialog == `rounded-md`, padding de inputs == `h-9`, sidebar muestra el icono Tags entre Artículos y Compras) requiere ojo humano. | Seguir los 15 puntos de `<how-to-verify>` de Plan 06 Task 2. Approve solo cuando los 15 pasen. |
| D-19 enforcement: ArticuloForm NO importa `PropiedadCreateDialog` | CAT-02 (parcial) + D-19 | Es una ausencia que se verifica con `! grep ...`; está semi-automatizada pero requiere reasoning humano sobre qué componentes de futuras phases podrían introducir regresión. | `! grep -q "PropiedadCreateDialog" apps/web/src/components/articulos/articulo-form.tsx` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (verificable contra Per-Task Verification Map)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (cumplido — toda task tiene grep o type-check)
- [ ] Wave 0 covers all MISSING references (vitest config, playwright config, E2E creds, RED test scaffold)
- [ ] No watch-mode flags (todos los comandos usan `--run` o equivalentes idempotentes)
- [ ] Feedback latency < 45s para full suite, < 3s para quick (Vitest)
- [ ] `nyquist_compliant: true` en frontmatter ✅
- [ ] `wave_0_complete: true` se promueve por `/gsd-execute-phase` cuando los 4 wave-0 tasks pasan

**Approval:** pending (será marcado por `/gsd-execute-phase` o `/gsd-verify-work` al final de la fase).
