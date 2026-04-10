---
plan: 260409-lik
one_liner: Migró articulos.unidades → existencias para depósito principal, creó trigger PG para campo calculado, limpió DTOs
status: complete
commits:
  - 89fec50: 'feat(quick-260409-lik): add migration SQL and ANALYSIS.md for unidades model unification'
  - 79ed24b: 'chore(quick-260409-lik): remove unidades from DTOs (now trigger-maintained)'
deviations: []
---

# Quick Task 260409-lik: Auditar modelo stock/depositos/unidades

## What Changed

### Task 1: Migration SQL + ANALYSIS.md (89fec50)

- `apps/backend/src/db/migrate-unidades.sql`: Script idempotente ejecutado en producción
  - Migró 7,522 artículos con unidades > 0 → tabla existencias (deposito_id=1)
  - Creó trigger PG `trg_update_articulo_unidades` que mantiene `articulos.unidades` = SUM(existencias.cantidad)
  - Recalculó todos los artículos, 0 inconsistencias verificadas
- `.planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/ANALYSIS.md`: Documentación completa del modelo

### Task 2: Limpiar DTOs (79ed24b)

- `apps/backend/src/modules/articulos/dto/create-articulo.dto.ts`: Campo `unidades` removido (ahora read-only via trigger)
- `apps/backend/src/modules/articulos/dto/update-articulo.dto.ts`: Campo `unidades` removido

## Production Actions Completed

- Migration SQL ejecutado: 7,522 existencias creadas
- Trigger PG activo en tabla existencias
- Backend rebuildeado y deployado
