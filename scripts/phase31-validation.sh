#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Phase 31 — Validation gate-keeper entre deploys
# Uso: scripts/phase31-validation.sh <check>
#   check: integrity | pk-swap | triggers | unidades-sync | all
# =============================================================================

USAGE="Uso: $(basename "$0") <check>

  Checks disponibles:
    integrity      5 queries SC#5: FK orphan check (order_items, sale_items,
                   purchase_items, existencias, inventarios_articulos).
                   Esperado: 0 en todos.
    pk-swap        Verifica que la PK de articulos sea 'sku' (post-Deploy-2).
                   Esperado: 'sku'.
    triggers       Verifica que trg_update_articulo_unidades este habilitado.
                   Esperado: 'O'.
    unidades-sync  Verifica que unidades de articulos coincide con suma en existencias.
                   Esperado: 0 desincronizados.
    all            Corre integrity + pk-swap + triggers + unidades-sync en secuencia.
                   Exit 1 al primer fallo.

  Ejemplos:
    bash scripts/phase31-validation.sh integrity
    bash scripts/phase31-validation.sh all
"

if [ $# -eq 0 ]; then
  echo "$USAGE"
  exit 1
fi

CHECK="$1"

# Verificar que el container postgres esta running
if ! docker ps --format '{{.Names}}' | grep -q '^postgres$'; then
  echo "❌ Container 'postgres' no está corriendo. Iniciar con docker compose up -d y reintentar."
  exit 1
fi

# -----------------------------------------------------------------------------
# Funcion helper: psql query
# -----------------------------------------------------------------------------
run_query() {
  docker exec postgres psql -U sanchez -d erp_sanchez -tAc "$1" 2>/dev/null | tr -d '[:space:]'
}

# -----------------------------------------------------------------------------
# check: integrity — SC#5 FK orphan checks (5 tablas)
# Cada query debe retornar 0
# -----------------------------------------------------------------------------
check_integrity() {
  echo "--- integrity: FK orphan checks ---"
  local FAILED=0

  local VAL
  VAL=$(run_query "SELECT count(*) FROM order_items LEFT JOIN articulos a ON order_items.articulo_sku = a.sku WHERE a.sku IS NULL;")
  if [ "$VAL" = "0" ]; then
    echo "  ✓ order_items orphans: 0"
  else
    echo "  ❌ order_items orphans: expected 0 got ${VAL}"
    FAILED=1
  fi

  VAL=$(run_query "SELECT count(*) FROM sale_items LEFT JOIN articulos a ON sale_items.articulo_sku = a.sku WHERE a.sku IS NULL;")
  if [ "$VAL" = "0" ]; then
    echo "  ✓ sale_items orphans: 0"
  else
    echo "  ❌ sale_items orphans: expected 0 got ${VAL}"
    FAILED=1
  fi

  VAL=$(run_query "SELECT count(*) FROM purchase_items LEFT JOIN articulos a ON purchase_items.articulo_sku = a.sku WHERE a.sku IS NULL;")
  if [ "$VAL" = "0" ]; then
    echo "  ✓ purchase_items orphans: 0"
  else
    echo "  ❌ purchase_items orphans: expected 0 got ${VAL}"
    FAILED=1
  fi

  VAL=$(run_query "SELECT count(*) FROM existencias LEFT JOIN articulos a ON existencias.articulo_sku = a.sku WHERE a.sku IS NULL;")
  if [ "$VAL" = "0" ]; then
    echo "  ✓ existencias orphans: 0"
  else
    echo "  ❌ existencias orphans: expected 0 got ${VAL}"
    FAILED=1
  fi

  VAL=$(run_query "SELECT count(*) FROM inventarios_articulos LEFT JOIN articulos a ON inventarios_articulos.articulo_sku = a.sku WHERE a.sku IS NULL;")
  if [ "$VAL" = "0" ]; then
    echo "  ✓ inventarios_articulos orphans: 0"
  else
    echo "  ❌ inventarios_articulos orphans: expected 0 got ${VAL}"
    FAILED=1
  fi

  if [ "$FAILED" -ne 0 ]; then
    echo ""
    echo "❌ integrity: FAILED — FK orphans detectados. NO continuar con el siguiente deploy."
    return 1
  fi
  echo "  ✓ integrity: PASSED (0 orphans en 5 tablas)"
  return 0
}

# -----------------------------------------------------------------------------
# check: pk-swap — PK de articulos debe ser 'sku' (post-Deploy-2)
# -----------------------------------------------------------------------------
check_pk_swap() {
  echo "--- pk-swap: PK column de articulos ---"
  local VAL
  VAL=$(run_query "SELECT a.attname FROM pg_attribute a JOIN pg_constraint c ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid WHERE c.conrelid='articulos'::regclass AND c.contype='p';")

  if [ "$VAL" = "sku" ]; then
    echo "  ✓ pk-swap: sku (PK correcto post-Deploy-2)"
    return 0
  else
    echo "  ❌ pk-swap: expected 'sku' got '${VAL}'"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# check: triggers — trg_update_articulo_unidades debe estar habilitado ('O')
# -----------------------------------------------------------------------------
check_triggers() {
  echo "--- triggers: trg_update_articulo_unidades ---"
  local VAL
  VAL=$(run_query "SELECT tgenabled FROM pg_trigger WHERE tgname='trg_update_articulo_unidades';")

  if [ "$VAL" = "O" ]; then
    echo "  ✓ triggers: O (habilitado)"
    return 0
  else
    echo "  ❌ triggers: expected 'O' got '${VAL}'"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# check: unidades-sync — conteo de desincronizados debe ser 0
# -----------------------------------------------------------------------------
check_unidades_sync() {
  echo "--- unidades-sync: articulos.unidades vs existencias ---"
  local VAL
  VAL=$(run_query "SELECT count(*) FROM articulos a LEFT JOIN (SELECT articulo_sku, SUM(cantidad) AS s FROM existencias GROUP BY articulo_sku) e ON e.articulo_sku=a.sku WHERE a.unidades != COALESCE(e.s, 0);")

  if [ "$VAL" = "0" ]; then
    echo "  ✓ unidades-sync: 0 desincronizados"
    return 0
  else
    echo "  ❌ unidades-sync: expected 0 got ${VAL} articulos desincronizados"
    return 1
  fi
}

# -----------------------------------------------------------------------------
# Router
# -----------------------------------------------------------------------------
case "$CHECK" in
  integrity)
    check_integrity
    ;;
  pk-swap)
    check_pk_swap
    ;;
  triggers)
    check_triggers
    ;;
  unidades-sync)
    check_unidades_sync
    ;;
  all)
    echo "Phase 31 — Validacion completa (all checks)"
    echo "============================================================"
    check_integrity || exit 1
    echo ""
    check_pk_swap || exit 1
    echo ""
    check_triggers || exit 1
    echo ""
    check_unidades_sync || exit 1
    echo ""
    echo "============================================================"
    echo "✓ ALL CHECKS PASSED — Phase 31 gate OK"
    echo "============================================================"
    ;;
  *)
    echo "❌ Check desconocido: '${CHECK}'"
    echo ""
    echo "$USAGE"
    exit 1
    ;;
esac
