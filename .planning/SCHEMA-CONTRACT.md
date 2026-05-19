# SCHEMA-CONTRACT — Columnas con contrato externo

**Proposito:** Este documento lista columnas de la base de datos `erp_sanchez` que son consumidas por aplicaciones externas a `objetiva-comercios-admin`. **No se renombran ni se dropean sin coordinacion previa.** Cualquier migracion que toque estas columnas debe anunciarse antes (PR, mensaje, lo que sea) para que los consumidores migren sus queries.

El contrato es schema-as-API: no hay HTTP API ni webhooks entre los sistemas. Comparten la instancia de Postgres directamente.

## Consumidores externos

| Consumidor                                        | Acceso                       | Como lee                                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sanchez-pedidos-backend` (Pedidos a Proveedores) | `pg.Pool` directo, read-only | Conecta a `host=postgres db=erp_sanchez user=sanchez` desde la red docker compartida `sanchez_docker_network`. Endpoints relevantes: `/api/stock`, `/api/sectores`, `/api/proveedores`, `/api/comprobantes/:codigoArticulo`. |

## Columnas comprometidas

### `articulos`

| Columna        | Tipo                                                    | Garantia                                                                                                                    |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `sku`          | text NOT NULL, PRIMARY KEY (desde Phase 31 Deploy 2)    | Identificador unico. No se renombra. La PK fue `codigo` antes de Phase 31; el cambio quedo registrado en el changelog.      |
| `codigo`       | text NULL, indexada no-unique (desde Phase 31 Deploy 2) | Agrupador. Puede repetirse cuando se introduzcan variantes (Phase 32).                                                      |
| `unidades`     | integer, mantenido por trigger                          | Suma de `existencias.cantidad` para el sku. Trigger `trg_update_articulo_unidades` (ver abajo). Confiable como stock total. |
| `nombre`       | text NULL                                               | Sin cambios planeados.                                                                                                      |
| `categoria`    | text NULL                                               | Reemplaza semanticamente al dropeado `rubro` (Phase 30).                                                                    |
| `subcategoria` | text NULL                                               | Reemplaza al dropeado `subrubro` (Phase 30).                                                                                |
| `familia`      | text NULL                                               | Clasificacion adicional.                                                                                                    |
| `precio`       | numeric(10,2) NULL                                      | Sin cambios planeados.                                                                                                      |
| `costo`        | numeric(10,2) NULL                                      | Sin cambios planeados.                                                                                                      |
| `activo`       | boolean NULL default true                               | Soft-delete flag.                                                                                                           |

### `existencias`

| Columna        | Tipo                                                                     | Garantia                                                                            |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `articulo_sku` | text NOT NULL, FK a `articulos.sku` ON UPDATE CASCADE ON DELETE RESTRICT | Reemplaza a `articulo_codigo` (dropeada Phase 31 Deploy 3).                         |
| `deposito_id`  | integer NOT NULL, FK a `depositos.id`                                    | Sin cambios planeados.                                                              |
| `cantidad`     | integer NOT NULL default 0                                               | Stock por deposito. Cambios disparan el trigger que recalcula `articulos.unidades`. |
| `stock_minimo` | integer NULL                                                             | Sin cambios planeados.                                                              |
| `stock_maximo` | integer NULL                                                             | Sin cambios planeados.                                                              |
| `updated_at`   | timestamp                                                                | Ultima modificacion de la fila.                                                     |

PK compuesta: `(articulo_sku, deposito_id)` (post Phase 31 Deploy 3; antes era `(articulo_codigo, deposito_id)`).

### `inventarios`

| Columna       | Tipo                                     | Garantia                                         |
| ------------- | ---------------------------------------- | ------------------------------------------------ | -------- | ------------ |
| `id`          | integer NOT NULL, PK                     | Sin cambios planeados.                           |
| `nombre`      | varchar(255) NOT NULL                    | Sin cambios planeados.                           |
| `fecha`       | timestamp NOT NULL                       | Fecha NOMINAL del inventario. Asignada al crear. |
| `deposito_id` | integer NOT NULL, FK a `depositos.id`    | Sin cambios planeados.                           |
| `estado`      | varchar(20) NOT NULL default 'pendiente' | `pendiente                                       | en_curso | finalizado`. |
| `created_at`  | timestamp NOT NULL default now()         | Cuando se creo el registro contenedor.           |
| `updated_at`  | timestamp NOT NULL default now()         | Ultima modificacion del header.                  |

### `inventarios_articulos`

| Columna            | Tipo                                                                     | Garantia                                                                                                    |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`               | integer NOT NULL, PK                                                     | Sin cambios planeados.                                                                                      |
| `inventario_id`    | integer NOT NULL, FK a `inventarios.id` ON DELETE CASCADE                | Sin cambios planeados.                                                                                      |
| `articulo_sku`     | text NOT NULL, FK a `articulos.sku` ON UPDATE CASCADE ON DELETE RESTRICT | Reemplaza a `articulo_codigo` (dropeada Phase 31 Deploy 3).                                                 |
| `cantidad_contada` | integer NOT NULL default 0                                               | Conteo fisico del item.                                                                                     |
| `created_at`       | timestamp NOT NULL                                                       | Cuando se conto el item (preservado del sistema de origen, no compartido entre items del mismo inventario). |
| `updated_at`       | timestamp NOT NULL                                                       | Ultima modificacion del item.                                                                               |
| `dispositivo_id`   | integer NULL, FK a `dispositivos_moviles.id` ON DELETE SET NULL          | Dispositivo que escaneo.                                                                                    |
| `columna`          | integer NULL                                                             | Posicion fisica (Phase 34 podria renombrar a `ubicacion`, ver Deferred Ideas en `ROADMAP.md`).              |

Unique: `(inventario_id, articulo_sku)`.

## Trigger comprometido

`trg_update_articulo_unidades` en tabla `existencias`:

- Dispara AFTER INSERT, DELETE, UPDATE OF cantidad.
- Recalcula `articulos.unidades = SUM(existencias.cantidad)` para el `articulo_sku` afectado.
- Estado actual: ENABLED.
- **Garantia:** se mantiene ENABLED en produccion. Si en alguna migration se hace DISABLE temporal, queda dentro de la misma transaccion atomica y al COMMIT vuelve a estar ENABLED + con recompute manual del estado de `unidades` antes de habilitar (patron P-02 capa 1 del proyecto). Si por error queda deshabilitado fuera de migration, es un incidente a reportar.

## Reglas para cambios sobre estas columnas

1. **Renombre o drop:** anunciar antes via PR/mensaje y dar ventana razonable a los consumidores para migrar.
2. **Cambio de tipo:** mismo proceso. Aumentar precision/scale es safe; cambiar text → varchar(N) con N pequeno requiere coordinacion.
3. **Cambio de constraint** (NOT NULL, FK, UNIQUE, PK): coordinar con consumidores. PK o UNIQUE changes pueden romper queries con `DISTINCT ON` o `GROUP BY`.
4. **Trigger:** si se reemplaza o renombra `trg_update_articulo_unidades`, garantizar que el comportamiento (denormalizacion de `articulos.unidades`) se mantenga, sino los consumidores que leen `articulos.unidades` directo veran drift.

## Changelog (cambios que afectaron a consumidores)

| Fecha      | Phase    | Cambio                                                                                                                                                                                                                                                                                                                          | Migracion previa requerida                                                                                           |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-02-XX | Phase 30 | DROP COLUMN `articulos.rubro`, `articulos.subrubro`, `articulos.adjetivo`, `articulos.prop_aux_1..5` (commit `5201d251`).                                                                                                                                                                                                       | Usar `articulos.categoria` en lugar de `rubro`, `articulos.subcategoria` en lugar de `subrubro`.                     |
| 2026-05-19 | Phase 31 | Sobreescritura de `articulos.sku` con `codigoToSku(codigo)` (formula D-17, `-` → `_`, whitespace → `~`). Cambio de PK de `codigo` a `sku`. ADD COLUMN `articulo_sku` + DROP COLUMN `articulo_codigo` en `order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos` (commits `24a4b47d`, `85d40934`). | JOINs con hijas usan `articulo_sku` en lugar de `articulo_codigo`. `articulos.codigo` queda como agrupador NO unico. |

## Migracion sugerida para `/api/stock` de Pedidos a Proveedores

Query pre-Phase 30/31 (rota hoy):

```sql
SELECT a.codigo, a.rubro, ia.cantidad_contada
FROM articulos a
LEFT JOIN inventarios_articulos ia ON ia.articulo_codigo = a.codigo
```

Query equivalente post-Phase 31:

```sql
SELECT
  a.sku,
  a.codigo,
  a.categoria,
  ia.cantidad_contada,
  ia.updated_at AS fecha_inventario
FROM articulos a
LEFT JOIN LATERAL (
  SELECT cantidad_contada, updated_at
  FROM inventarios_articulos
  WHERE articulo_sku = a.sku
  ORDER BY updated_at DESC
  LIMIT 1
) ia ON true
```

El `LEFT JOIN LATERAL` con `LIMIT 1` retorna solo el ultimo conteo por sku. Pedidos puede agregar joins con `comprobantes_tango` y la logica de rotacion/cobertura sin tocar este patron.
