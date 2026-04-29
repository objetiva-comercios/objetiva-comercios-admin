---
plan: 260429-rec
one_liner: Recuperados datos de inventarios/depositos/existencias desde admin_base_sanchez al nuevo schema en erp_sanchez
status: complete
commits:
  - b47db5d6: 'docs(quick-260429-rec): recover inventarios/depositos/existencias data from admin_base_sanchez'
deviations: []
---

# Quick Task 260429-rec: Recuperacion de datos historicos

## Resumen
Tras restaurar el schema vacio (260428-mig), se migraron datos historicos desde `admin_base_sanchez` y se sintetizaron existencias desde `articulos.unidades`. Resultado:

| Tabla | Antes | Despues | Origen |
|---|---|---|---|
| depositos | 0 | 1 | sintetico ("Principal") |
| dispositivos_moviles | 0 | 10 | admin_base_sanchez (6 conocidos) + huerfanos detectados (4) |
| inventario_sectores | 0 | 1 | admin_base_sanchez ("Rulemanes") |
| inventarios | 0 | 1 | admin_base_sanchez ("Primer inventario", finalizado) |
| inventarios_articulos | 0 | 7745 | admin_base_sanchez (filtrados: 7747 - 2 huerfanos por FK) |
| existencias | 0 | 7873 | sintetizado desde articulos.unidades > 0 (deposito 1) |

## Pasos ejecutados

### Step 1 — Carga de schema legacy temporal
```bash
pg_dump -U sanchez -d admin_base_sanchez \
  -t public.inventarios -t public.inventarios_articulos \
  -t public.inventario_sectores -t public.dispositivos_moviles \
  --no-owner --no-acl --no-comments \
  | sed 's|public\.|legacy_admin_base.|g' \
  | psql -U sanchez -d erp_sanchez
```

### Step 2 — Migracion atomica de inventarios
Transaccion BEGIN/COMMIT con 5 INSERTs:

```sql
-- 1. Deposito Principal
INSERT INTO depositos (id, nombre, activo) VALUES (1, 'Principal', true);

-- 2. Dispositivos (mapeo TEXT->INTEGER preservando id legacy en identificador)
INSERT INTO dispositivos_moviles (nombre, identificador, descripcion, activo)
SELECT
  COALESCE(d.nombre, 'Desconocido (' || ia.id_disp || ')'),
  ia.id_disp, d.descripcion, true
FROM (
  SELECT DISTINCT id_dispositivo AS id_disp
  FROM legacy_admin_base.inventarios_articulos
  WHERE id_dispositivo <> 'pedido' AND unidades > 0
) ia
LEFT JOIN legacy_admin_base.dispositivos_moviles d ON d.id = ia.id_disp;

-- 3. Sectores
INSERT INTO inventario_sectores (id, deposito_id, nombre, columnas, ...)
SELECT s.id, 1, s.nombre, to_jsonb(s.columnas), NOW(), NOW()
FROM legacy_admin_base.inventario_sectores s;

-- 4. Inventario
INSERT INTO inventarios (id, nombre, fecha, deposito_id, descripcion, estado, ...)
SELECT i.id, i.nombre, i.fecha::timestamp, 1, i.descripcion, 'finalizado', ...
FROM legacy_admin_base.inventarios i;

-- 5. Inventarios articulos (con joins para validar FKs)
INSERT INTO inventarios_articulos (...)
SELECT l.id_inventario, l.erp_codigo, l.unidades, dm.id, NULL, NULL, ...
FROM legacy_admin_base.inventarios_articulos l
JOIN dispositivos_moviles dm ON dm.identificador = l.id_dispositivo
JOIN articulos a ON a.codigo = l.erp_codigo
WHERE l.id_dispositivo <> 'pedido' AND l.unidades > 0;
```

Resultado: 1+10+1+1+7745 filas insertadas, COMMIT exitoso.

### Step 3 — Synth existencias + trigger PG
```bash
psql -U sanchez -d erp_sanchez < apps/backend/src/db/migrate-unidades.sql
```
Resultado:
- 7873 existencias creadas (1 por articulo con unidades > 0)
- Funcion `update_articulo_unidades()` creada
- Trigger `trg_update_articulo_unidades` instalado en existencias
- 101.021 articulos.unidades recalculados
- 0 discrepancias en check final de consistencia

### Step 4 — Cleanup
```sql
DROP SCHEMA legacy_admin_base CASCADE;
```

## Filtros aplicados (decisiones del usuario)
- `id_dispositivo <> 'pedido'` (no se importan registros del dispositivo logico de pedidos)
- `unidades > 0` (solo conteos positivos)
- Resultado: ningun registro excluido por estos filtros (todos los inv_articulos cumplian ambos)

## Mapeo de dispositivos (TEXT id -> INTEGER id)

| Nuevo id | Nombre | Identificador legacy | Articulos contados |
|---|---|---|---|
| 1 | Desconocido (070ac2e492f5cdd8) | 070ac2e492f5cdd8 | 1502 |
| 2 | Desconocido (0b1b433636520a33) | 0b1b433636520a33 | 1712 |
| 3 | Cristian | 5dd2d19cc932b076 | 174 |
| 4 | Ventas | 81a3d2120d99e4fa | 13 |
| 5 | Alberto | a242110804754ddf | 1089 |
| 6 | Leo | c3475e255eead780 | 130 |
| 7 | Adrian | d217242a862cc1ac | 2126 |
| 8 | Desconocido (d4f8ac18b6809edd) | d4f8ac18b6809edd | 930 |
| 9 | Desconocido (dd95218c1359e454) | dd95218c1359e454 | 15 |
| 10 | Pablo | f1ff2bc6fb716c65 | 56 |

Si en el futuro se identifica el operador real de los 4 dispositivos "Desconocido", se puede renombrar via UPDATE.

## Items no migrados
- 2 inventarios_articulos cuyo `erp_codigo` ya no existe en `articulos.codigo` (articulos borrados en el ERP despues del inventario)
- 1 dispositivo legacy: `id='pedido'` ("Pedidos caja") — excluido por filtro del usuario, no se uso en ningun inv_articulo de todas formas

## Verificacion E2E
- DB: counts y sample data correctos
- Trigger PG funcionando (consistencia articulos.unidades = SUM(existencias) = 0 discrepancias)
- Admin frontend (`erp.sanchezrepuestos.com.ar/dashboard`) carga, redirige a /login (sin sesion)
- No hay errores SQL en logs del backend

## Datos NO migrados (no existian en ningun lugar)
- `business_settings`: queda con default row creado por la migration (1 fila default)
- `orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`: tablas vacias por diseno (no habia datos historicos)
- `api_keys`, `webhooks`, `webhook_deliveries`: tablas vacias por diseno

## Follow-up: drift schema vs DB en inventarios_articulos

Tras la migracion inicial, se detecto que `migration-prod.sql` (Apr 9 14:31) era anterior al refactor `c735e9c1` (Apr 9 22:28) que reemplazo `sectorId` por `columna` en el schema TS. La DB quedo con `sector_id` y SIN `columna`, mientras que el codigo Drizzle esperaba `columna` y NO `sector_id`. Ningun query habia fallado en logs porque nadie habia entrado a la seccion de inventarios entre Apr 10 y Apr 29.

### Fix aplicado
- Nueva migracion: `apps/backend/drizzle/0003_add_columna_inv_articulos.sql`
  ```sql
  ALTER TABLE inventarios_articulos ADD COLUMN IF NOT EXISTS columna integer;
  CREATE INDEX IF NOT EXISTS inv_articulos_columna_idx ON inventarios_articulos (columna);
  ```
- Backfill desde `legacy_admin_base.inventarios_articulos.columna` matcheando por `(inventario_id, articulo_codigo)`: **7745 UPDATE** (todos los registros con columna recuperada).
- 100 columnas distintas preservadas. Top: columna 1 (3295 articulos, sin asignar/default), 75 (311), 77 (279), 16 (240), 73 (168 — Rulemanes).
- Backend reiniciado, arranco limpio.

### Drift residual conocido
- `inventarios_articulos.sector_id`: columna huerfana en DB (no esta en schema TS, drizzle la ignora). No se borro por la regla "NUNCA borrar tablas/columnas sin autorizacion explicita". Si se quiere limpiar, requiere `ALTER TABLE inventarios_articulos DROP COLUMN sector_id;` con confirmacion previa.
- `inventario_sectores.columnas` en DB es jsonb con numeros, pero schema TS lo declara como `$type<string[]>()`. Es un mismatch de tipado pero JSON es flexible — funciona en runtime.
- Migracion `0003_*` agregada al filesystem pero NO al `meta/_journal.json` ni a `meta/0003_snapshot.json` (solo drizzle-kit puede regenerar snapshots correctamente). La proxima vez que se corra `pnpm db:generate`, drizzle generara su propia migracion correspondiente — el ALTER ya aplicado sera no-op por `IF NOT EXISTS`.
