# Analisis: Modelo de Stock / Depositos / Unidades

**Fecha:** 2026-04-09
**Estado:** Migracion lista para produccion

## Estado Actual (pre-migracion)

### Tablas involucradas

| Tabla | Campo | Rol | Estado |
|-------|-------|-----|--------|
| `articulos` | `unidades` | Stock total del articulo | Manual, inconsistente con existencias |
| `articulos` | `erp_unidades` | Dato informativo del ERP | Solo lectura, intacto |
| `existencias` | `cantidad` | Stock por deposito | Fuente de verdad multi-deposito, pero vacia |
| `depositos` | `id`, `nombre` | Depositos fisicos | Deposito principal (id=1) cargado en produccion |

### Conteos verificados (produccion)

- **100,990** articulos totales
- **7,522** articulos con `unidades > 0`
- **25,683** unidades totales (SUM de articulos.unidades)
- **0** registros en tabla `existencias` (vacia)

### Inconsistencias encontradas

1. **articulos.unidades es manual** -- se setea via API en create/update, sin relacion con existencias
2. **existencias esta vacia** -- la tabla multi-deposito existe pero nunca se poblo
3. **Dos fuentes de verdad** -- `articulos.unidades` (manual) y `existencias.cantidad` (vacia) deberian ser lo mismo
4. **erp_unidades != unidades** -- son datos de fuentes distintas (ERP externo vs sistema interno)

## Cambios Aplicados

### 1. Migration SQL (`apps/backend/src/db/migrate-unidades.sql`)

Script idempotente para ejecutar en produccion. Orden de operaciones:

1. **Pre-check**: Verifica que deposito principal (id=1) existe
2. **Migracion de datos**: `articulos.unidades` -> `existencias.cantidad` para deposito_id=1
   - Solo articulos donde `unidades > 0` (7,522 registros)
   - `ON CONFLICT DO UPDATE` para idempotencia
3. **Trigger function**: `update_articulo_unidades()` -- recalcula `articulos.unidades` = SUM(existencias.cantidad)
4. **Trigger**: `trg_update_articulo_unidades` en tabla `existencias` (AFTER INSERT/UPDATE OF cantidad/DELETE)
5. **Recalculo global**: Sincroniza TODOS los articulos (no solo los migrados)
6. **Verificaciones**: Conteos y check de consistencia (debe dar 0 inconsistencias)

### 2. DTOs limpiados

- `create-articulo.dto.ts`: Campo `unidades` removido (ya no writable via API)
- `update-articulo.dto.ts`: Campo `unidades` removido (ya no writable via API)
- `erp_unidades` permanece intacto en ambos DTOs

### 3. Schema sin cambios

- La columna `articulos.unidades` permanece en el schema (ahora es read-only, mantenida por trigger)
- La columna `articulos.erp_unidades` no fue tocada

## Estado Final (post-migracion)

### Flujo de datos

```
existencias cambia (INSERT/UPDATE/DELETE)
        |
        v
trg_update_articulo_unidades (trigger PG)
        |
        v
articulos.unidades = SUM(existencias.cantidad)
```

### Invariantes garantizados

1. `articulos.unidades` = SUM de todas las `existencias.cantidad` para ese articulo
2. No se puede escribir `unidades` via API (removido de DTOs)
3. El trigger se ejecuta automaticamente en cada cambio a `existencias`
4. `erp_unidades` es independiente y permanece como dato informativo del ERP

### Modelo final

| Campo | Escritura | Lectura | Fuente |
|-------|-----------|---------|--------|
| `articulos.unidades` | Trigger (automatico) | API, frontend | SUM(existencias.cantidad) |
| `articulos.erp_unidades` | API (sync ERP) | API, frontend | Sistema ERP externo |
| `existencias.cantidad` | API (gestion stock) | API, frontend | Usuario / integraciones |
