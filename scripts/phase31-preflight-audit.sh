#!/usr/bin/env bash
set -euo pipefail

echo "Phase 31 — Preflight Audit D-01 (informativo, non-blocking)"
echo "============================================================"
echo ""

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUT=".planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-PREFLIGHT-AUDIT.md"

# Verificar que el container postgres esta running
if ! docker ps --format '{{.Names}}' | grep -q '^postgres$'; then
  echo "❌ Container 'postgres' no está corriendo. Iniciar con docker compose up -d y reintentar."
  exit 1
fi

echo "Ejecutando audit informativo sobre articulos.sku..."
echo ""

# Ejecutar la query de auditoria D-01 sobre estado actual de articulos.sku
RESULT=$(docker exec postgres psql -U sanchez -d erp_sanchez -tA -F'|' -c "
SELECT
  count(*) FILTER (WHERE sku IS NULL) AS null_sku,
  count(*) FILTER (WHERE sku = codigo) AS sku_eq_codigo,
  count(*) FILTER (WHERE sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g')) AS sku_eq_stripsep,
  count(*) FILTER (WHERE sku IS NOT NULL AND sku != codigo) AS sku_diff_codigo,
  count(*) FILTER (WHERE sku IS NOT NULL) - count(DISTINCT sku) FILTER (WHERE sku IS NOT NULL) AS sku_dupes,
  count(*) AS total
FROM articulos;
" 2>/dev/null)

NULL_SKU=$(echo "$RESULT" | cut -d'|' -f1)
SKU_EQ_CODIGO=$(echo "$RESULT" | cut -d'|' -f2)
SKU_EQ_STRIPSEP=$(echo "$RESULT" | cut -d'|' -f3)
SKU_DIFF_CODIGO=$(echo "$RESULT" | cut -d'|' -f4)
SKU_DUPES=$(echo "$RESULT" | cut -d'|' -f5)
TOTAL=$(echo "$RESULT" | cut -d'|' -f6)

# Simular el overwrite D-02 y detectar colisiones que romperian el PK swap (Plan 31-03)
SIM_RESULT=$(docker exec postgres psql -U sanchez -d erp_sanchez -tA -F'|' -c "
WITH stripsim AS (
  SELECT regexp_replace(codigo, '[-_.[:space:]]+', '', 'g') AS sku_sim
  FROM articulos
),
groupsim AS (
  SELECT sku_sim, count(*) AS dup_count
  FROM stripsim
  GROUP BY sku_sim
  HAVING count(*) > 1
)
SELECT
  COALESCE(count(*), 0) AS sim_collision_groups,
  COALESCE(sum(dup_count), 0) AS sim_articulos_afectados,
  COALESCE(max(dup_count), 0) AS sim_max_dup_count
FROM groupsim;
" 2>/dev/null)

SIM_COLLISION_GROUPS=$(echo "$SIM_RESULT" | cut -d'|' -f1)
SIM_ARTICULOS_AFECTADOS=$(echo "$SIM_RESULT" | cut -d'|' -f2)
SIM_MAX_DUP_COUNT=$(echo "$SIM_RESULT" | cut -d'|' -f3)

echo "Counts obtenidos:"
echo "  null_sku:                ${NULL_SKU}"
echo "  sku_eq_codigo:           ${SKU_EQ_CODIGO}"
echo "  sku_eq_stripsep:         ${SKU_EQ_STRIPSEP}"
echo "  sku_diff_codigo:         ${SKU_DIFF_CODIGO}"
echo "  sku_dupes (actual):      ${SKU_DUPES}"
echo "  total:                   ${TOTAL}"
echo ""
echo "Simulacion del overwrite D-02 (sku := stripSep(codigo)):"
echo "  sim_collision_groups:    ${SIM_COLLISION_GROUPS}"
echo "  sim_articulos_afectados: ${SIM_ARTICULOS_AFECTADOS}"
echo "  sim_max_dup_count:       ${SIM_MAX_DUP_COUNT}"
echo ""

# Generar el archivo markdown
mkdir -p "$(dirname "$OUT")"

cat > "$OUT" <<MARKDOWN
---
generated: ${TIMESTAMP}
query: D-01 articulos.sku pre-cutover audit
blocking: false
---

# 31-PREFLIGHT-AUDIT: Counts pre-cutover de articulos.sku

> Generado por \`scripts/phase31-preflight-audit.sh\` el ${TIMESTAMP}
> NON-BLOCKING — solo informativo. Ver sección "Decision" para criterios de escalado.

## Counts pre-cutover (estado actual de articulos.sku)

| Columna          | Valor           |
| ---------------- | --------------- |
| null_sku         | ${NULL_SKU}     |
| sku_eq_codigo    | ${SKU_EQ_CODIGO}    |
| sku_eq_stripsep  | ${SKU_EQ_STRIPSEP}  |
| sku_diff_codigo  | ${SKU_DIFF_CODIGO}  |
| sku_dupes        | ${SKU_DUPES}        |
| total            | ${TOTAL}            |

## Simulacion del overwrite D-02 (sku := stripSep(codigo))

Aplica regexp_replace en memoria sobre \`articulos.codigo\` para detectar colisiones que romperian el PK swap (Plan 31-03 \`ADD PRIMARY KEY (sku)\` fallaria con duplicate key).

| Columna                  | Valor           |
| ------------------------ | --------------- |
| sim_collision_groups     | ${SIM_COLLISION_GROUPS}     |
| sim_articulos_afectados  | ${SIM_ARTICULOS_AFECTADOS}  |
| sim_max_dup_count        | ${SIM_MAX_DUP_COUNT}        |

## Interpretacion

- **null_sku**: Articulos donde \`sku IS NULL\`. Plan 31-02 D-02 hace overwrite ciego (\`UPDATE articulos SET sku = stripSep(codigo)\`); estos pasan a tener sku asignado.
- **sku_eq_codigo**: Articulos donde \`sku\` ya es identico a \`codigo\`. Indica que no se aplico stripSep previamente; o que el codigo no tenia separadores (sin cambio funcional post-overwrite).
- **sku_eq_stripsep**: Articulos donde \`sku\` ya coincide con \`stripSep(codigo)\`. Idealmente = total post-D-02. Pre-cutover indica cuantos ya estan en estado final.
- **sku_diff_codigo**: Articulos donde \`sku\` fue seteado manualmente distinto al codigo. ATENCION: el overwrite D-02 los sobreescribe; si este numero es grande, investigar antes de continuar.
- **sku_dupes**: Duplicados de sku *en el estado actual*. Casi siempre 0 porque la mayoria de los sku son NULL pre-cutover.
- **sim_collision_groups**: Grupos de codigos que colisionarian al mismo sku post-overwrite D-02. CRITICO: si > 0, el PK swap (Plan 31-03) fallaria con duplicate key.
- **sim_articulos_afectados**: Total de filas involucradas en los grupos de colision.
- **total**: Total de filas en tabla articulos.

## Decision

- Plan 31-02 ejecuta \`UPDATE articulos SET sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g')\` (overwrite ciego segun D-02).
- Si **sim_collision_groups > 0**, existen codigos que colisionan tras stripSep. Esto BLOQUEA el PK swap. Escalar al usuario — la fase no avanza hasta resolver manualmente las colisiones (mergear duplicados, renombrar codigos, o cambiar la formula de sku).
- Este script siempre exit 0 (informativo, no-blocking por decision D-01 cerrada en CONTEXT.md). El blocker se gestiona via reporte manual al planner.
MARKDOWN

echo "Preflight audit guardado en $OUT"
echo ""

# Alerta si sku_dupes (estado actual) > 0
if [ "${SKU_DUPES}" -gt 0 ] 2>/dev/null; then
  echo "⚠️  ATENCION: sku_dupes (actual) = ${SKU_DUPES} > 0"
  echo "   Existen sku duplicados en el estado actual (preexistentes)."
  echo "   (Este script sigue siendo exit 0 por D-01 — la alerta es informativa)"
  echo ""
fi

# Alerta si la simulacion del overwrite D-02 detecta colisiones (BLOQUEA Plan 31-03)
if [ "${SIM_COLLISION_GROUPS}" -gt 0 ] 2>/dev/null; then
  echo "🚨 BLOCKER: sim_collision_groups = ${SIM_COLLISION_GROUPS} > 0"
  echo "   El overwrite D-02 (sku := stripSep(codigo)) produciria duplicados de sku."
  echo "   ${SIM_ARTICULOS_AFECTADOS} articulos involucrados en ${SIM_COLLISION_GROUPS} grupos de colision."
  echo "   Maximo dup_count por grupo: ${SIM_MAX_DUP_COUNT}."
  echo "   Plan 31-03 (ADD PRIMARY KEY (sku)) fallaria con duplicate key."
  echo "   ESCALAR al usuario — Plan 31-02 NO debe ejecutarse hasta resolver."
  echo "   (Este script sigue siendo exit 0 por D-01 — la alerta es informativa)"
  echo ""
fi

echo "============================================================"
echo "✓ Preflight audit completo (non-blocking, siempre exit 0)"
echo "  Ver: ${OUT}"
echo "============================================================"

exit 0
