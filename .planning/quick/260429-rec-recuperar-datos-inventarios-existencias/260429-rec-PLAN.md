---
slug: 260429-rec
title: Recuperar datos de inventarios/depositos/existencias desde admin_base_sanchez
date: 2026-04-29
status: in-progress
---

# Plan

## Contexto
Tras el quick task 260428-mig (que aplico migration-prod.sql y creo las 16 tablas faltantes), el admin volvio a funcionar pero las tablas quedaron vacias. El usuario indico que la data original de inventarios/depositos/existencias se monto en la base `admin_base_sanchez` (extraida en su momento desde la base `sanchez`). Hay que recuperarla.

## Source data audit

| DB origen | Tabla | Filas | Notas |
|---|---|---|---|
| admin_base_sanchez | inventarios | 1 | "Primer inventario", fecha 2026-01-01 |
| admin_base_sanchez | inventarios_articulos | 7747 | 7745 tras filtros (2 huerfanos por articulo) |
| admin_base_sanchez | inventario_sectores | 1 | "Rulemanes", columnas={137,138,73,178...} |
| admin_base_sanchez | dispositivos_moviles | 7 | nombres: Cristian, Alberto, Pablo, Adrian, Ventas, Leo, "Pedidos caja" (id='pedido') |

## Schema diffs detectados

### inventarios
- `nombre` text -> varchar(255)
- `fecha` date -> timestamp
- **falta** `deposito_id` -> default a 1 (Principal)
- **falta** `estado` -> default 'finalizado' (decidido)

### inventarios_articulos
- `id_inventario` -> `inventario_id`
- `erp_codigo` -> `articulo_codigo`
- `unidades` -> `cantidad_contada`
- `id_dispositivo` (text) -> `dispositivo_id` (integer): **requiere mapeo TEXT->INTEGER**
- `columna` -> sin mapeo (sector_id NULL)

### inventario_sectores
- `columnas` integer[] -> jsonb (cast directo)
- **falta** `deposito_id` -> 1

### dispositivos_moviles
- `id` (text) -> auto integer + `identificador` text para preservar id legacy

## Decisiones aplicadas
1. Deposito principal: id=1, nombre='Principal'
2. Estado del inventario migrado: 'finalizado'
3. Dispositivos huerfanos detectados en inv_articulos (4): crear con nombre 'Desconocido (id_legacy)'
4. 2 inv_articulos con erp_codigo sin match en articulos.codigo: skip por FK
5. Sintetizar existencias: si (correr migrate-unidades.sql original)

## Filtros del usuario
- `id_dispositivo <> 'pedido'` (excluir el dispositivo logico de pedidos)
- `unidades > 0` (solo conteos positivos)
- Resultado: 0 filas excluidas por estos filtros (ningun inv_articulo tenia 'pedido' o unidades<=0)

## Tareas

### Task 1 — Setup schema temporal
- Cargar `admin_base_sanchez` tablas en `erp_sanchez.legacy_admin_base` via pg_dump | sed | psql

### Task 2 — Migracion atomica (transaccion 1)
- INSERT depositos (1 fila)
- INSERT dispositivos_moviles (10 filas: 6 conocidos + 4 huerfanos detectados; 'pedido' excluido)
- INSERT inventario_sectores (1 fila, deposito_id=1)
- INSERT inventarios (1 fila, deposito_id=1, estado='finalizado')
- INSERT inventarios_articulos (7745 filas con join a dispositivos_moviles + articulos)
- COMMIT con verificacion

### Task 3 — Synth existencias (transaccion 2)
- Correr `apps/backend/src/db/migrate-unidades.sql`:
  - INSERT existencias desde articulos.unidades (deposito_id=1)
  - CREATE FUNCTION + TRIGGER para mantener articulos.unidades = SUM(existencias)
  - UPDATE articulos.unidades sincronizando todos
  - Verificacion de consistencia (debe dar 0 discrepancias)

### Task 4 — Cleanup
- DROP SCHEMA legacy_admin_base CASCADE

### Task 5 — Verificacion
- Counts finales
- Sample data inspection
- Playwright check del admin
