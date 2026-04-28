---
slug: 260428-mig
title: Aplicar migration-prod.sql pendiente desde Abr 9 — restaurar admin
date: 2026-04-28
status: in-progress
---

# Plan

## Problema reportado
Usuario reporta: "no se ven las secciones, faltan tablas en la base de datos".

## Diagnostico (systematic-debugging)
- Backend en produccion (`erp.sanchezrepuestos.com.ar`) responde 500 en todos los endpoints menos `/api/health`.
- Error real de Postgres: `relation "business_settings" does not exist`.
- DB `erp_sanchez` solo tenia 5 tablas: articulos + comprobantes_* + _prisma_migrations.
- Faltaban 16 tablas del admin + 2 columnas en articulos.
- Causa raiz: el quick task `260409-jwl` (Abr 9) genero `apps/backend/src/db/migration-prod.sql` para crear las tablas en produccion, pero el SUMMARY explicitamente lo marco como Pending Action y nunca se ejecuto. El backend se rebuilo el Abr 10 con el nuevo schema esperando tablas que no existian.
- Sintoma latente 14 dias (Apr 10 -> Apr 24) hasta que alguien intento usar el admin.

## Tareas

### Task 1 — Aplicar migration-prod.sql en transaccion atomica
- Comando: `(echo BEGIN; cat apps/backend/src/db/migration-prod.sql; echo COMMIT;) | docker exec -i postgres psql -U sanchez -d erp_sanchez -v ON_ERROR_STOP=1`
- Verificacion: `\dt` debe mostrar las 21 tablas (5 originales + 16 nuevas).
- Riesgo: bajo. SQL idempotente (66 sentencias `IF NOT EXISTS`), 0 DROPs.

### Task 2 — Reiniciar backend
- `docker compose restart erp-backend`
- Verificar `Nest application successfully started` en logs.

### Task 3 — Verificacion E2E
- `curl /api/health` => 200
- Endpoints de auth-protected => 401 (no 500)
- Playwright: navegar al dashboard, verificar que carga sin errores SQL en consola
- Logs backend post-restart sin errores de DB

## Decisiones de scope
- NO se ejecuta migrate-unidades.sql (del quick task lik) porque depende de existencias y depositos recien creados (vacios) — sin datos para migrar.
- NO se modifica codigo: el bug es operativo (paso pendiente del Apr 9), no de software.
- Datos NO afectados: articulos sigue intacto con 101.021 filas; las tablas creadas estan vacias (su estado correcto antes de uso).
