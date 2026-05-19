---
generated: 2026-05-18T23:50:00Z
phase: 31
status: approved
revision: 1
soak_strategy: pre_productivo_sin_soak
approver: sanchez (operador) — confirmado en sesion 2026-05-18
---

# 31-CUTOVER-CALENDAR — Calendario aprobado para Phase 31

## Contexto del calendario

El plan original de Phase 31 asumia un sistema en produccion con trafico real y
prescribia **24-48h de soak** entre cada deploy (D1 expand → D2 switch → D3
contract). El soak servia para detectar regresiones en escrituras concurrentes:
rutas backend olvidadas que escriban `articulo_codigo` sin `articulo_sku`, sync
ERP que arroje datos con shape viejo, seeds que no fueron actualizados, etc.

**Estado real verificado el 2026-05-18 (ver `project_pre_productivo` en memoria):**

- `order_items`, `sale_items`, `purchase_items`, `webhook_deliveries`: 0 filas
- `articulos`: 101.021 filas (catalogo importado) pero 0 modificadas en ultimos 7 dias
- Backend lleva 31h+ corriendo sin requests reales
- Traefik sin accesos al dominio publico en los logs recientes

Sin trafico transaccional real, el soak no aporta nada — no hay escrituras
concurrentes que medir. La estrategia revisada **elimina los soaks** y ejecuta
los 3 deploys de forma consecutiva en la misma sesion, manteniendo TODAS las
otras protecciones (pg_dump entre deploys, validation queries, atomic commits,
restore-test capability).

## Calendario aprobado

| Deploy                         | Fecha/hora prevista    | Duracion estimada    | Validation gate                                             |
| ------------------------------ | ---------------------- | -------------------- | ----------------------------------------------------------- |
| Plan 31-01 safety net          | 2026-05-18 17:30 UTC-3 | 1.5h (ya completado) | ✓ pg_dump baseline + preflight audit OK                     |
| Deploy 1 (Plan 31-02 expand)   | 2026-05-18 21:00 UTC-3 | ~30-45 min           | scripts/phase31-validation.sh integrity exit 0              |
| Deploy 2 (Plan 31-03 switch)   | 2026-05-18 22:00 UTC-3 | ~45-60 min           | scripts/phase31-validation.sh all exit 0                    |
| Deploy 3 (Plan 31-04 contract) | 2026-05-18 23:30 UTC-3 | ~30 min              | scripts/phase31-validation.sh all exit 0 + e2e tests verdes |

Total estimado de la sesion: **~3-4h**, todo en la misma noche del 2026-05-18.

## Recaudos durante la sesion

Cada deploy ejecuta este checklist antes de continuar al siguiente:

1. **Snapshot pg_dump full antes de aplicar la migration:**
   ```bash
   TS=$(date -u +%Y%m%d_%H%M%S)
   docker exec postgres pg_dump -U sanchez -d erp_sanchez -Fc \
     > /var/backups/erp_sanchez/phase31/pre_deploy<N>_${TS}.dump
   ```
2. **Aplicar migration con transaccion atomica:**
   ```bash
   cat apps/backend/drizzle/00<NN>_phase31_<step>.sql | docker exec -i postgres \
     psql --single-transaction --set ON_ERROR_STOP=1 -U sanchez -d erp_sanchez
   ```
3. **Ejecutar validation queries** (gate keeper definido en `scripts/phase31-validation.sh`):
   - Post-D1: `bash scripts/phase31-validation.sh integrity` — 5 queries SC#5 deben retornar 0
   - Post-D2: `bash scripts/phase31-validation.sh all` — integrity + pk-swap + triggers + unidades-sync
   - Post-D3: `bash scripts/phase31-validation.sh all` + run E2E tests jest
4. **Si una validation falla:** ABORT, restore desde el dump pre-deploy y reportar al usuario.
5. **Atomic commit** de cada deploy: SQL + schema.ts + service changes en un solo commit.

## Abort criteria

- Cualquier query de validation retorna != 0 (FK orphan, PK no-sku, trigger disabled, unidades-sync drift).
- `pg_restore` del dump pre-deploy NO completa exit 0.
- Migration tira error inesperado durante apply (lock timeout, constraint violation, etc.).
- Tests jest post-deploy fallan en algun escenario clave (SC#3/SC#4).
- Encuentro tabla con datos transaccionales nuevos durante la sesion (indica que entro trafico real — pausar inmediatamente).

## Metricas que NO se monitorean (vs plan original)

- **Latencia P95/P99 sobre articulos:** N/A — sin trafico real.
- **Error rate post-deploy en API:** N/A — no hay clientes consumiendo /api/articulos.
- **Webhook delivery success rate:** N/A — no hay subscribers reales.
- **Concurrencia de upserts en existencias/inventarios:** N/A — sin trafico.

Si en algun momento de la sesion ARRANCAN escrituras reales del usuario (sync ERP
nocturno, otro miembro del equipo cargando productos, etc.), pausar Phase 31
inmediatamente y revisar este calendar. Estado actual: solo nosotros tocamos el
backend.

## Que reemplaza al soak

Los recaudos arriba (pg_dump entre deploys + validation queries + atomic commits

- restore capability ya probada en restore-test smoke) reemplazan funcionalmente
  el soak de 24-48h:

* pg_dump = rollback inmediato si algo falla.
* Validation queries = deteccion sintetica de la misma clase de bugs que el
  soak detectaria con trafico real (FK orphans, PK colisiones, trigger desync).
* Atomic commits = cada cambio es revertible con `git revert`.
* restore-test ya validado pre-D1 con `erp_phase31_smoke` (101k articulos restored OK).

## Aprobacion

- **Quien aprueba:** sanchez (operador del VPS, dueño del proyecto).
- **Cuando:** 2026-05-18, sesion de Claude Code Phase 31 execute.
- **Condicion:** El usuario explicitamente autorizo "trabajar toda la noche
  tomando todos los recaudos posibles" tras confirmar que no hay trafico real.
- **Revocacion:** Si en algun momento se detecta trafico real entrante, este
  calendar queda invalidado y hay que volver al plan original con soaks de 24-48h.
