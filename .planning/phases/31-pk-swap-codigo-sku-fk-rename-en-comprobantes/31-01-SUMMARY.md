---
phase: 31
plan: '01'
plan_id: 31-01
subsystem: backend/scripts
status: checkpoint:human-action
tags: [phase31, pk-swap, testing-framework, preflight, validation]
dependency_graph:
  requires: []
  provides:
    - scripts/phase31-preflight-audit.sh
    - scripts/phase31-validation.sh
    - apps/backend/jest.config.cjs
    - apps/backend/test/jest-setup.ts
    - apps/backend/test/articulos-phase31.e2e-spec.ts
    - apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts
  affects:
    - apps/backend/package.json
tech_stack:
  added:
    - jest@^29.7.0
    - ts-jest@^29.1.2
    - supertest@^7.0.0
    - '@nestjs/testing@^10.0.0'
    - '@types/jest@^29.5.12'
    - '@types/supertest@^6.0.2'
  patterns:
    - Bash gate-keeper scripts con docker exec postgres psql
    - Jest skeleton tests con it.skip para dependencias futuras
key_files:
  created:
    - scripts/phase31-preflight-audit.sh
    - scripts/phase31-validation.sh
    - apps/backend/jest.config.cjs
    - apps/backend/test/jest-setup.ts
    - apps/backend/test/articulos-phase31.e2e-spec.ts
    - apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts
  modified:
    - apps/backend/package.json
decisions:
  - 'Wave 0 instala framework de testing como prep en lugar de diferirlo: SC#3/SC#4 son automated verifications necesarias entre Deploy 2 y Deploy 3'
  - 'Tests marcados it.skip hasta que helper (Plan 31-02) y ruta by-codigo (Plan 31-03) existan'
  - 'pnpm install gateado por checkpoint humano Task 3 (operador inspecciona diff de package.json antes de ejecutar)'
metrics:
  duration: '~15min'
  completed_date: '2026-05-18'
  tasks_total: 3
  tasks_completed: 2
  tasks_pending_human: 1
  files_created: 6
  files_modified: 1
---

# Phase 31 Plan 01: Safety Net Setup (Wave 0) Summary

**One-liner:** Scripts de auditoría/validación Phase 31 y framework Jest con skeletons RED para SC#3/SC#4.

## Tasks Completadas

| Task | Nombre                                     | Commit   | Archivos                                                                                                           |
| ---- | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Crear scripts preflight-audit + validation | 93702fbc | scripts/phase31-preflight-audit.sh, scripts/phase31-validation.sh                                                  |
| 2    | Framework Jest + skeleton tests            | 38b35edf | apps/backend/package.json, jest.config.cjs, jest-setup.ts, articulos-phase31.e2e-spec.ts, articulos-helper.spec.ts |

## Task Pendiente — CHECKPOINT:HUMAN-ACTION (Task 3)

Task 3 está bloqueada esperando acción del operador. Ver sección "Checkpoint Pendiente".

## Archivos Creados

### scripts/phase31-preflight-audit.sh

- **Path absoluto:** `/home/sanchez/proyectos/objetiva-comercios-admin/scripts/phase31-preflight-audit.sh`
- **Propósito:** D-01 — Auditoría informativa NON-BLOCKING de `articulos.sku` pre-cutover
- **Genera:** `.planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-PREFLIGHT-AUDIT.md`
- **Counts producidos:** `null_sku`, `sku_eq_codigo`, `sku_eq_stripsep`, `sku_diff_codigo`, `sku_dupes`, `total`
- **Comportamiento:** Siempre `exit 0` (informativo). Alerta si `sku_dupes > 0` pero no bloquea.
- **Sintaxis:** `bash -n` pasa. Ejecutable con `chmod +x`.

### scripts/phase31-validation.sh

- **Path absoluto:** `/home/sanchez/proyectos/objetiva-comercios-admin/scripts/phase31-validation.sh`
- **Propósito:** Gate-keeper entre deploys (integridad FK, PK swap, triggers, unidades-sync)
- **Sub-comandos:** `integrity | pk-swap | triggers | unidades-sync | all`
- **Uso:** `bash scripts/phase31-validation.sh all` — exit 1 al primer fallo
- **Queries SC#5:** 5 LEFT JOIN checks sobre `order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`
- **Sintaxis:** `bash -n` pasa. Ejecutable. Exit 1 sin argumentos (muestra usage).

### apps/backend/jest.config.cjs

- **Path:** `apps/backend/jest.config.cjs`
- **Preset:** `ts-jest`
- **testRegex:** `.*\.(spec|e2e-spec)\.ts$`
- **roots:** `['<rootDir>/src', '<rootDir>/test']`
- **testTimeout:** 30000ms
- **setupFilesAfterEnv:** `test/jest-setup.ts`

### apps/backend/test/jest-setup.ts

- **Path:** `apps/backend/test/jest-setup.ts`
- `NODE_ENV = 'test'`
- Carga `.env.test` si existe (parsing manual sin `require()` para satisfacer ESLint)

### apps/backend/src/modules/articulos/**tests**/articulos-helper.spec.ts

- **Path:** `apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts`
- **Estado:** SKELETON RED — 2 tests `it.skip`
- **Tests:**
  - `resolveSku returns canonical sku for existing articulo` — desbloquear en Plan 31-02
  - `resolveSku throws NotFoundException for missing articulo` — desbloquear en Plan 31-02
- **Dependencia:** `ArticulosHelper` no existe hasta Plan 31-02

### apps/backend/test/articulos-phase31.e2e-spec.ts

- **Path:** `apps/backend/test/articulos-phase31.e2e-spec.ts`
- **Estado:** SKELETON RED — 3 tests `it.skip`
- **Tests:**
  - `SC#3a: GET /api/articulos/:sku retorna 1 fila con campo sku` — desbloquear en Plan 31-03
  - `SC#3b: GET /api/articulos/by-codigo/:codigo retorna array` — desbloquear en Plan 31-03
  - `SC#4: POST /api/articulos emite webhook con payload.articulo.sku no-null` — desbloquear en Plan 31-02
- **Imports:** `INestApplication`, `supertest` (imports de `@nestjs/testing` comentados hasta Plan 31-03)

## Framework de Testing Instalado

Las siguientes devDependencies se agregaron a `apps/backend/package.json` (NO ejecutar `pnpm install` — gateado por Task 3):

| Paquete          | Version  |
| ---------------- | -------- |
| jest             | ^29.7.0  |
| ts-jest          | ^29.1.2  |
| supertest        | ^7.0.0   |
| @nestjs/testing  | ^10.0.0  |
| @types/jest      | ^29.5.12 |
| @types/supertest | ^6.0.2   |

**Scripts agregados:** `test`, `test:e2e`, `test:unit`

**IMPORTANTE:** `pnpm-lock.yaml` NO fue modificado. El `pnpm install` lo ejecuta el operador en Task 3.

## Checkpoint Pendiente (Task 3)

Task 3 es `checkpoint:human-action gate=blocking`. El operador debe ejecutar los siguientes pasos antes de que Plan 31-02 pueda arrancar:

**0. Inspeccionar diff de package.json + ejecutar `pnpm install`:**

```bash
# Verificar que el diff solo agrega las 6 devDependencies declaradas
git show 38b35edf -- apps/backend/package.json

# Si el diff es correcto, ejecutar:
cd apps/backend && pnpm install

# Verificar que pnpm-lock.yaml se actualizó y los tests corren (skip no falla):
pnpm --filter backend test
```

**1. Crear directorio de backups:**

```bash
sudo mkdir -p /var/backups/erp_sanchez/phase31
sudo chown $(whoami) /var/backups/erp_sanchez/phase31
```

**2. Ejecutar pg_dump full baseline:**

```bash
TS=$(date -u +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U sanchez -d erp_sanchez -Fc \
  -f /var/backups/erp_sanchez/phase31/pre_deploy1_${TS}.dump
docker exec postgres ls -lh /var/backups/erp_sanchez/phase31/pre_deploy1_${TS}.dump
```

Esperar tamaño > 0 (esperado 40-100 MB).

**3. Smoke restore-test:**

```bash
docker exec postgres createdb -U sanchez erp_phase31_smoke
docker exec postgres pg_restore -U sanchez -d erp_phase31_smoke /var/backups/erp_sanchez/phase31/pre_deploy1_${TS}.dump
docker exec postgres psql -U sanchez -d erp_phase31_smoke -tAc "SELECT count(*) FROM articulos"
docker exec postgres dropdb -U sanchez erp_phase31_smoke
```

Esperar count >= 100000.

**4. Ejecutar preflight audit:**

```bash
bash scripts/phase31-preflight-audit.sh
cat .planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-PREFLIGHT-AUDIT.md
```

**5. Crear 31-CUTOVER-CALENDAR.md** con horarios aprobados para Deploy 1/2/3 en:
`.planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-CUTOVER-CALENDAR.md`

**6. Reportar con resume-signal:** "approved" + path del .dump + counts del audit + confirmación de 31-CUTOVER-CALENDAR.md aprobado. Si `sku_dupes > 0`, reportar como blocker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint pre-commit hook bloqueó el commit de Task 2**

- **Found during:** Task 2 commit
- **Issue:** `@typescript-eslint/no-var-requires` en jest-setup.ts (usaba `require('dotenv')`). Unused imports `Test, TestingModule` en articulos-phase31.e2e-spec.ts.
- **Fix:** Reemplazé `require('dotenv')` con parsing manual de .env.test usando `fs` + `path` (estándar Node). Comenté los imports no utilizados en e2e-spec.ts.
- **Files modified:** `apps/backend/test/jest-setup.ts`, `apps/backend/test/articulos-phase31.e2e-spec.ts`
- **Commit:** 38b35edf (incluído en el mismo commit tras reestaging)

## Threat Surface

No se introdujeron nuevos endpoints de red. Los scripts bash tienen queries SQL hardcoded sin interpolación de input externo (T-31-01 mitigado). El framework de testing solo está declarado en package.json — sin instalación efectiva hasta Task 3 (T-31-SC aceptado).

## Self-Check

- [x] scripts/phase31-preflight-audit.sh existe, ejecutable, `bash -n` pasa
- [x] scripts/phase31-validation.sh existe, ejecutable, `bash -n` pasa, exit 1 sin args
- [x] apps/backend/package.json incluye jest, ts-jest, supertest, @nestjs/testing
- [x] apps/backend/jest.config.cjs existe
- [x] apps/backend/test/jest-setup.ts existe
- [x] apps/backend/test/articulos-phase31.e2e-spec.ts existe con 3 it.skip
- [x] apps/backend/src/modules/articulos/**tests**/articulos-helper.spec.ts existe con 2 it.skip
- [x] pnpm-lock.yaml NO modificado
- [x] Task 3 NO ejecutado (es human checkpoint gate=blocking)
- [x] Commits Task 1: 93702fbc, Task 2: 38b35edf
