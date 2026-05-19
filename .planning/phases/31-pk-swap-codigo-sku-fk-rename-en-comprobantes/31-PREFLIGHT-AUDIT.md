---
generated: 2026-05-19T01:40:28Z
query: D-01 articulos.sku pre-cutover audit
blocking: false
---

# 31-PREFLIGHT-AUDIT: Counts pre-cutover de articulos.sku

> Generado por `scripts/phase31-preflight-audit.sh` el 2026-05-19T01:40:28Z
> NON-BLOCKING — solo informativo. Ver sección "Decision" para criterios de escalado.

## Counts pre-cutover (estado actual de articulos.sku)

| Columna         | Valor  |
| --------------- | ------ |
| null_sku        | 101020 |
| sku_eq_codigo   | 0      |
| sku_eq_stripsep | 0      |
| sku_diff_codigo | 1      |
| sku_dupes       | 0      |
| total           | 101021 |

## Simulacion del overwrite D-02 (sku := codigoToSku(codigo) — Phase 31 D-17)

Aplica la formula `codigoToSku` (`-` -> `_`, espacio -> `~`, resto sin cambio) en memoria sobre `articulos.codigo` para detectar colisiones que romperian el PK swap (Plan 31-03 `ADD PRIMARY KEY (sku)` fallaria con duplicate key).

La formula original `stripSep` de Phase 29 D-12 fue sobreescrita en Phase 31 (cierre 2026-05-18) porque producia 200 grupos de colision sobre 101k filas; `codigoToSku` produce 0 colisiones sobre la misma base.

| Columna                 | Valor |
| ----------------------- | ----- |
| sim_collision_groups    | 0     |
| sim_articulos_afectados | 0     |
| sim_max_dup_count       | 0     |

## Interpretacion

- **null_sku**: Articulos donde `sku IS NULL`. Plan 31-02 D-02 hace overwrite ciego (`UPDATE articulos SET sku = stripSep(codigo)`); estos pasan a tener sku asignado.
- **sku_eq_codigo**: Articulos donde `sku` ya es identico a `codigo`. Indica que no se aplico stripSep previamente; o que el codigo no tenia separadores (sin cambio funcional post-overwrite).
- **sku_eq_stripsep**: Articulos donde `sku` ya coincide con `stripSep(codigo)`. Idealmente = total post-D-02. Pre-cutover indica cuantos ya estan en estado final.
- **sku_diff_codigo**: Articulos donde `sku` fue seteado manualmente distinto al codigo. ATENCION: el overwrite D-02 los sobreescribe; si este numero es grande, investigar antes de continuar.
- **sku_dupes**: Duplicados de sku _en el estado actual_. Casi siempre 0 porque la mayoria de los sku son NULL pre-cutover.
- **sim_collision_groups**: Grupos de codigos que colisionarian al mismo sku post-overwrite D-02 bajo la formula codigoToSku. CRITICO: si > 0, el PK swap (Plan 31-03) fallaria con duplicate key.
- **sim_articulos_afectados**: Total de filas involucradas en los grupos de colision.
- **total**: Total de filas en tabla articulos.

## Decision

- Plan 31-02 ejecuta `UPDATE articulos SET sku = regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g')` (overwrite D-02 con formula D-17).
- Si **sim_collision_groups > 0**, existen codigos que colisionan tras la transformacion. Esto BLOQUEA el PK swap. Escalar al usuario — la fase no avanza hasta resolver manualmente las colisiones.
- Este script siempre exit 0 (informativo, no-blocking por decision D-01 cerrada en CONTEXT.md). El blocker se gestiona via reporte manual al planner.
