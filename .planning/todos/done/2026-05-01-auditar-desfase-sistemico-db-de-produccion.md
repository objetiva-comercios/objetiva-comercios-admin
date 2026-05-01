---
created: 2026-05-01T15:00:51.396Z
title: Auditar desfase sistémico DB de producción VPS
area: database
files:
  - apps/backend/drizzle/0002_kind_jamie_braddock.sql
  - apps/backend/drizzle/0003_add_columna_inv_articulos.sql
  - apps/backend/drizzle/0004_phase29_propiedades.sql
  - apps/backend/drizzle/0005_phase29_cache_trigger.sql
  - apps/backend/drizzle/meta/_journal.json
---

## Problem

`__drizzle_migrations` en la DB de producción del VPS (`erp_sanchez` en container `postgres`)
registra hashes para 0000, 0001, 0002, 0004 y 0005, **pero múltiples tablas no existen**.

Tablas faltantes detectadas:

- `business_settings` (definida en 0002 según journal)
- `inv_articulos` (alterada en 0003 — el archivo SQL existe pero no está en `_journal.json`)
- Tablas para los módulos `/orders`, `/sales`, `/purchases`, `/dispositivos`, `/webhooks`,
  `/api-keys`, `/inventarios` (todas tienen routes mapeados pero queries fallan)

Además convive `_prisma_migrations` (schema legacy de cuando se usaba Prisma antes de migrar
a Drizzle), lo que sugiere que el desfase viene de esa migración histórica.

Phase 29 (`prop_*`) se descubrió rota durante smoke playwright (`/propiedades` → 500
"Internal server error"). `pnpm db:migrate` reportó "applied successfully" sin hacer nada
porque drizzle vio los hashes en `__drizzle_migrations` y skip. Resolución temporal:
las 6 tablas `prop_*` fueron creadas manualmente vía
`psql -f apps/backend/drizzle/0004_phase29_propiedades.sql` el 2026-05-01.

**Riesgo:** el próximo `db:push` o `db:migrate` con migrations nuevas seguirá fallando
silenciosamente porque drizzle confía en `__drizzle_migrations` como source of truth.
Cualquier feature que dependa de tablas listadas-pero-inexistentes va a 500-ear en prod.

## Solution

TBD — opciones a evaluar:

1. **Reconciliación full** — comparar schema esperado (drizzle-kit `introspect` o el snapshot
   de `meta/0002_snapshot.json`) contra `\dt` real, generar SQL de catch-up y aplicarlo
   manualmente. Después limpiar `_prisma_migrations` legacy.

2. **Reset controlado** — backup → drop schema → re-apply todas las migrations desde 0000.
   Riesgo: pérdida de data en `articulos` + `comprobantes_*`. Requiere export/import.

3. **Repair journal** — borrar entries de `__drizzle_migrations` que correspondan a tablas
   inexistentes y re-correr `pnpm db:migrate`. Más limpio pero requiere mapping
   hash→tabla manual.

Antes de elegir camino: hacer dump completo (`pg_dump erp_sanchez`) como safety net.

## Contexto adicional

- VPS: hostname `ocsanchez`, IP pública `31.97.29.162`
- DB: `postgres` container (compartido), `localhost:5432` desde host = `postgres:5432` desde
  network `sanchez_docker_network`
- Detectado el 2026-05-01 durante review post-implementación de phase 29
- Memory relevante: `feedback_pending_actions_prod.md` — exactamente el patrón que avisa
  ("pending actions latentes que no se ejecutan en prod")
- Memory relevante: `feedback_never_drop_tables.md` — opciones 2 y 3 requieren autorización
  explícita antes de tocar
