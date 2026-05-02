---
phase: 38-reconciliar-drift-sistemico-de-db-de-produccion
plan: 01
subsystem: database
tags:
  - drizzle
  - postgresql
  - backup
  - migrations
  - prod
  - bash

# Dependency graph
requires: []
provides:
  - "scripts/phase38-preflight-backup.sh — script idempotente para pg_dump + restore-test + count diff sobre erp_sanchez"
  - "Backup canonico .dump esperado en /var/backups/erp_sanchez/ (ejecucion humana en VPS)"
affects:
  - 38-02
  - 38-03
  - 38-04
  - 38-05
  - 38-06

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bash idempotente con set -e + glifos ✓/❌ + banners de seccion (consistente con scripts/test-auth.sh)"
    - "Comandos PG via docker exec postgres (feedback_docker_compose.md)"
    - "Backup pg_dump -F c restorable via pg_restore (formato canonico)"
    - "Naming canonico backup-YYMMDD-HHMM.dump con guard anti-overwrite"
    - "Restore-test obligatorio en DB temporal con drop final"

key-files:
  created:
    - scripts/phase38-preflight-backup.sh
  modified: []

key-decisions:
  - "D-05 (pre-flight gate) implementado como script unico ejecutable en VPS"
  - "Restore-test en DB temporal erp_restore_test con drop SIEMPRE (incluso si counts mismatch) — preserva el dump pero no deja ruido"
  - "Validacion de 6 tablas criticas con count diff (articulos, existencias, inventarios_articulos, comprobantes_cabecera, comprobantes_detalle, comprobantes_pagos)"
  - "Si restore falla o counts mismatch: ABORT total de Phase 38 + backup preservado para forensics"

patterns-established:
  - "Pre-flight backup pattern: pg_dump -F c → docker cp host → restore-test → count diff → drop temp DB"
  - "Naming canonico de backups en VPS: /var/backups/erp_sanchez/backup-YYMMDD-HHMM.dump"

requirements-completed:
  - SC-PRE

# Metrics
duration: 2min (Task 1 only; Task 2 pending human action on VPS)
completed: 2026-05-02
---

# Phase 38 Plan 01: Pre-flight backup script Summary

**Script bash idempotente para pg_dump + restore-test + count diff sobre erp_sanchez antes de cualquier modificacion de tracking de migraciones**

## Performance

- **Duration:** ~2 min (Task 1 only)
- **Started:** 2026-05-02T19:12:49Z
- **Task 1 completed:** 2026-05-02T19:14:22Z
- **Plan status:** PARTIAL — Task 1 done, Task 2 awaiting human action on VPS
- **Tasks completed:** 1 of 2
- **Files created:** 1

## Accomplishments

- Creado `scripts/phase38-preflight-backup.sh` (92 lineas, ejecutable, sintaxis bash valida)
- Implementa los 5 steps documentados en D-05 del CONTEXT.md:
  1. Verificacion de path `/var/backups/erp_sanchez/` y guard anti-colision de naming
  2. `pg_dump -F c` dentro del container postgres
  3. `docker cp` del .dump al host (persistencia D-15)
  4. Restore-test en DB temporal `erp_restore_test` con `pg_restore -e` (warnings OK, errors abortan)
  5. Diff de row counts en 6 tablas criticas + drop de DB temporal en cualquier caso
- Cumple acceptance criteria: ejecutable, `set -e`, glifos `✓`/`❌`, banner separators, 11 invocaciones de `docker exec postgres`, naming canonico D-15 con guard
- NO toca `__drizzle_migrations` ni `_journal.json` (esos son scope de plans 38-02..38-04). La unica mencion de esas entidades es en un mensaje de `echo` que documenta lo que NO debe pasar si el script falla.

## Task Commits

1. **Task 1: Crear script preflight backup + restore-test + count diff** — `e9557311` (chore)
2. **Task 2: Ejecutar el script en VPS y aprobar el reporte** — PENDING (checkpoint:human-action)

## Files Created/Modified

- `scripts/phase38-preflight-backup.sh` — Script bash idempotente que ejecuta el flujo D-05 completo (pg_dump, restore-test, count diff sobre 6 tablas criticas, drop temp DB, persistencia en /var/backups/erp_sanchez/ del VPS)

## Decisions Made

None — followed plan as specified. Todas las decisiones D-05 / D-15 ya estaban resueltas en CONTEXT.md y reflejadas en el `<action>` block del plan; este executor las copio fielmente.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Pending Actions (Human, on VPS)

**Task 2 es un checkpoint:human-action obligatorio antes de avanzar a Plan 38-02.** El script NO se ejecuta en este worktree porque:

1. Requiere acceso al container `postgres` real con datos de prod
2. Requiere acceso al filesystem del VPS para persistir `/var/backups/erp_sanchez/backup-*.dump`
3. Es el GATE de avance de toda la Phase 38 — falla del restore-test = abortar fase

### Steps que el operador debe ejecutar (en SSH al VPS)

1. Asegurar que `/var/backups/erp_sanchez/` existe y es escribible:
   ```bash
   sudo mkdir -p /var/backups/erp_sanchez
   sudo chown $(whoami) /var/backups/erp_sanchez
   ```
2. Pullear el script al VPS (segun el flujo de deploy del proyecto: `git pull` en el repo del VPS o `scp` del archivo).
3. Ejecutar:
   ```bash
   bash scripts/phase38-preflight-backup.sh
   ```
4. Verificar que el output termina con `✓ ALL CHECKS PASSED` y los 6 counts matchean.
5. Verificar persistencia del backup:
   ```bash
   ls -la /var/backups/erp_sanchez/backup-*.dump
   docker exec postgres psql -U sanchez -lqt | grep erp_restore_test  # debe estar vacio
   ```
6. Firmar `approved` para liberar Plan 38-02; firmar `abort` si el script fallo (Phase 38 entera se aborta y se abre nuevo todo).

### Datos a registrar tras la ejecucion

Cuando el operador firme `approved`, esta seccion del SUMMARY debe completarse con:

- **Backup path final** (con timestamp real, ej `/var/backups/erp_sanchez/backup-260502-1530.dump`)
- **Tamano del backup** en bytes/MB
- **Counts de las 6 tablas criticas** (snapshot de prod)
- **Confirmacion de drop de erp_restore_test**

## User Setup Required

**Task 2 requiere acceso humano al VPS shell.** Variables/dashboard:

| Service   | Why                                                                 | Steps                                                                                        |
| --------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| vps-shell | pg_dump dentro de container postgres + persistencia en /var/backups | SSH al VPS, asegurar /var/backups/erp_sanchez/ existe, ejecutar `bash scripts/phase38-preflight-backup.sh` |

No env vars adicionales requeridos (el script usa el rol `sanchez` ya configurado en el container postgres).

## Next Phase Readiness

- **Plan 38-01 NO completo hasta Task 2 firmada.** El script existe y esta verificado por sintaxis, pero la ejecucion contra prod es checkpoint humano por diseño (D-05 gate).
- **Plan 38-02 (Reparacion de _journal.json local) BLOQUEADO** hasta que el operador firme `approved` post-ejecucion. Sin restore-test exitoso, NO se toca tracking de migraciones (politica `feedback_never_drop_tables.md`).
- Si la ejecucion en VPS falla: Phase 38 entera se aborta y se abre nuevo todo en `.planning/todos/pending/` documentando el fallo (counts mismatch, pg_restore error, etc.).

## CHECKPOINT REACHED

**Type:** human-action
**Plan:** 38-01
**Progress:** 1/2 tasks complete

### Completed Tasks

| Task | Name                                              | Commit     | Files                              |
| ---- | ------------------------------------------------- | ---------- | ---------------------------------- |
| 1    | Crear script preflight backup + restore + counts  | `e9557311` | `scripts/phase38-preflight-backup.sh` |

### Current Task

**Task 2:** Ejecutar el script en VPS y aprobar el reporte
**Status:** awaiting human action
**Blocked by:** ejecucion humana en VPS shell requerida (no automatizable desde un agente — requiere acceso a postgres prod y filesystem del VPS)

### Awaiting

Operador debe SSH al VPS, ejecutar `bash scripts/phase38-preflight-backup.sh`, validar `✓ ALL CHECKS PASSED` + 6/6 counts matching, y firmar `approved` (o `abort` si fallo). Plans 38-02..38-06 quedan bloqueados hasta entonces.

---

## Self-Check: PASSED

- `scripts/phase38-preflight-backup.sh` exists (FOUND)
- Commit `e9557311` exists in git log (FOUND)
- `.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/38-01-SUMMARY.md` exists (FOUND)

---

*Phase: 38-reconciliar-drift-sistemico-de-db-de-produccion*
*Plan: 01*
*Status: Task 1 complete + committed; Task 2 pending checkpoint:human-action*
*Last updated: 2026-05-02*
