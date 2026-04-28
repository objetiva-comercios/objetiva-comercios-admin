---
plan: 260428-mig
one_liner: Aplicada migration-prod.sql pendiente desde Abr 9 — restauradas 16 tablas y 2 columnas en produccion, admin operativo
status: complete
commits:
  - TBD: 'fix(quick-260428-mig): apply pending migration-prod.sql to restore admin DB schema'
deviations: []
---

# Quick Task 260428-mig: Aplicar migration-prod.sql pendiente

## Que se ejecuto

### Task 1 — Migration aplicada
```bash
(echo "BEGIN;"; cat apps/backend/src/db/migration-prod.sql; echo "COMMIT;") \
  | docker exec -i postgres psql -U sanchez -d erp_sanchez -v ON_ERROR_STOP=1
```

Resultado: 16 CREATE TABLE + 2 ALTER TABLE ADD COLUMN + 39 CREATE INDEX, todos exitosos. Transaccion commiteada.

Tablas creadas en `erp_sanchez`:
- `business_settings`, `orders`, `order_items`, `sales`, `sale_items`
- `purchases`, `purchase_items`, `depositos`, `existencias`
- `inventarios`, `inventarios_articulos`, `inventario_sectores`, `dispositivos_moviles`
- `api_keys`, `webhooks`, `webhook_deliveries`

Columnas agregadas a `articulos`: `categoria`, `subcategoria`.

Estado final: 21 tablas en schema `public` (antes: 5).

### Task 2 — Backend reiniciado
```bash
docker compose restart erp-backend
```
Logs: `[NestApplication] Nest application successfully started`. Sin errores.

### Task 3 — Verificacion E2E
- `GET /api/health` => 200 OK con `{"status":"ok"}`
- `GET /api/articulos` (sin auth) => 401 (antes: 500)
- `GET /api/sales/stats` (sin auth) => 401 (antes: 500)
- `GET /api/purchases` (sin auth) => 401 (antes: 500)
- Playwright en `http://erp.sanchezrepuestos.com.ar/dashboard`:
  - Redirige a `/login?returnTo=/dashboard` (esperado, sin sesion)
  - Page Title: `Comercio Ejemplo - Admin` (renderizado por `business_settings`, antes daba 500)
  - Solo error de consola: 404 favicon (irrelevante)
- Sin nuevos errores SQL en logs del backend post-fix.

## Datos preservados
- `articulos`: 101.021 filas intactas
- `comprobantes_cabecera/detalle/pagos`: intactas (tablas del sistema Prisma original, conviven OK con el schema admin)
- `_prisma_migrations`: intacta

## Causa raiz documentada
Quick task `260409-jwl` ("Sync Drizzle schema with production DB", Abr 9) genero `apps/backend/src/db/migration-prod.sql` con CREATE TABLE IF NOT EXISTS de las 16 tablas faltantes. Su SUMMARY explicitamente marco esto como Pending Action:

```
## Pending Actions
- Run migration-prod.sql on production DB
- Rebuild Docker images
- Redeploy containers
```

Pasos 2 y 3 se ejecutaron el Abr 10 (rebuild + redeploy). Paso 1 (correr el SQL) no se ejecuto. Sintoma latente 14 dias hasta primer uso real del admin (Apr 24 8:58 PM => primer error en logs).

## Lecciones / mejoras para el futuro
1. Los Pending Actions de un SUMMARY que tocan produccion deberian bloquear el cierre del task — quedaron documentados en el archivo pero invisibles fuera de el.
2. Considerar agregar healthcheck al container del backend que ejecute una query simple (`SELECT 1 FROM business_settings`) para detectar drift schema/DB temprano.
3. El error real de Postgres (`relation does not exist`) queda enmascarado por el wrapper de drizzle-orm que solo muestra `Failed query`. Sumar logging del `cause` ayudaria al diagnostico.
