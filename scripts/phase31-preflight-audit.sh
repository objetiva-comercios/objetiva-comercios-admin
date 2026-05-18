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

# Ejecutar la query de auditoria D-01
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

echo "Counts obtenidos:"
echo "  null_sku:       ${NULL_SKU}"
echo "  sku_eq_codigo:  ${SKU_EQ_CODIGO}"
echo "  sku_eq_stripsep: ${SKU_EQ_STRIPSEP}"
echo "  sku_diff_codigo: ${SKU_DIFF_CODIGO}"
echo "  sku_dupes:      ${SKU_DUPES}"
echo "  total:          ${TOTAL}"
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

## Counts pre-cutover

| Columna          | Valor           |
| ---------------- | --------------- |
| null_sku         | ${NULL_SKU}     |
| sku_eq_codigo    | ${SKU_EQ_CODIGO}    |
| sku_eq_stripsep  | ${SKU_EQ_STRIPSEP}  |
| sku_diff_codigo  | ${SKU_DIFF_CODIGO}  |
| sku_dupes        | ${SKU_DUPES}        |
| total            | ${TOTAL}            |

## Interpretacion

- **null_sku**: Articulos donde \`sku IS NULL\`. Plan 31-02 D-02 hace overwrite ciego (\`UPDATE articulos SET sku = stripSep(codigo)\`); estos pasan a tener sku asignado.
- **sku_eq_codigo**: Articulos donde \`sku\` ya es identico a \`codigo\`. Indica que no se aplico stripSep previamente; o que el codigo no tenia separadores (sin cambio funcional post-overwrite).
- **sku_eq_stripsep**: Articulos donde \`sku\` ya coincide con \`stripSep(codigo)\`. Idealmente = total post-D-02. Pre-cutover indica cuantos ya estan en estado final.
- **sku_diff_codigo**: Articulos donde \`sku\` fue seteado manualmente distinto al codigo. ATENCION: el overwrite D-02 los sobreescribe; si este numero es grande, investigar antes de continuar.
- **sku_dupes**: Duplicados de sku post-colision. Si > 0 con la simulacion de stripSep, significa que dos codigos distintos convergen al mismo sku tras remover separadores (colision). ESCALAR al usuario antes de continuar — Phase 31 NO puede hacer PK swap con duplicados en sku.
- **total**: Total de filas en tabla articulos.

## Decision

- Plan 31-02 ejecuta \`UPDATE articulos SET sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g')\` (overwrite ciego segun D-02).
- Si **sku_dupes > 0** luego de simular el overwrite, existen codigos que colisionan tras stripSep. Esto BLOQUEA el PK swap. Escalar al usuario — la fase no avanza hasta resolver manualmente las colisiones.
- Este script siempre exit 0 (informativo, no-blocking por decision D-01 cerrada en CONTEXT.md).
MARKDOWN

echo "Preflight audit guardado en $OUT"
echo ""

# Alerta si sku_dupes > 0
if [ "${SKU_DUPES}" -gt 0 ] 2>/dev/null; then
  echo "⚠️  ATENCION: sku_dupes = ${SKU_DUPES} > 0"
  echo "   Existen codigos que colisionan tras aplicar stripSep."
  echo "   Escalar al usuario antes de continuar con Plan 31-02."
  echo "   (Este script sigue siendo exit 0 por D-01 — la alerta es informativa)"
  echo ""
fi

echo "============================================================"
echo "✓ Preflight audit completo (non-blocking, siempre exit 0)"
echo "  Ver: ${OUT}"
echo "============================================================"

exit 0
