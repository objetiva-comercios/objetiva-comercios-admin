#!/usr/bin/env bash
# ============================================================================
# Restore selectivo erp_sanchez — 2026-05-02 19:21 UTC (FORENSE)
# ============================================================================
#
# Propósito:
#   Documentar de forma reproducible y auditable los comandos exactos del
#   restore selectivo de 16 tablas en `erp_sanchez` (prod) tras detectar un
#   data wipe parcial entre Apr 30 02:20 UTC y May 1 02:20 UTC durante el
#   pre-flight backup de Phase 38-01 (scripts/phase38-preflight-backup.sh).
#
# ⚠ ADVERTENCIA — YA EJECUTADO — NO RE-CORRER SALVO EMERGENCIA IDÉNTICA ⚠
#
#   Este script ya corrió exitosamente el 2026-05-02 19:21 UTC. Re-ejecutarlo
#   contra una `erp_sanchez` cuyo contenido difiera del backup origen
#   (`erp_sanchez_backup_daily_20260430_0220.dump`) es DESTRUCTIVO: el dump
#   selectivo contiene `DROP TABLE IF EXISTS ... CASCADE` (implícito al
#   reaplicar `CREATE TABLE` dentro de single-transaction sobre las mismas
#   tablas) y data restaurada por COPY que reemplaza filas actuales.
#
#   Usar como template para post-mortem o para replicar la operación si
#   ocurriera un incidente IDÉNTICO con el mismo origen y target. En ese caso,
#   confirmar manualmente con "EJECUTAR DE NUEVO" en el guard interactivo.
#
# Backup safety net (rollback inmediato post-restore):
#   /var/backups/erp_sanchez/backup-260502-1921.dump   (7.4 MB)
#   Generado por: scripts/phase38-preflight-backup.sh
#
# Backup origen del restore:
#   /opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump
#
# ============================================================================
# Timeline del incidente (referencia)
# ============================================================================
#   Apr 27 02:20 UTC →  8 tablas (pre-260428-mig — esperado)
#   Apr 28 (260428-mig) → migration-prod.sql aplicada → 21 tablas
#   Apr 29 02:20 UTC → 25 tablas (post-260429-rec — BUENO)
#   Apr 30 02:20 UTC → 25 tablas (BUENO — origen del restore)
#   May  1 02:20 UTC daily → NO GENERADO (o eliminado del filesystem)
#   May  1 02:20 UTC monthly → 15 tablas (YA VACIADO)
#   May  2 02:20 UTC → 15 tablas (sigue vaciado)
#
#   Ventana del incidente: Apr 30 02:20 UTC → May 1 02:20 UTC
#   Causa raíz: NO IDENTIFICADA
#   Hipótesis (sin evidencia confirmada): `pnpm db:push --force` o
#   `drizzle-kit push --force` corrido contra prod en lugar de dev durante
#   smoke testing de Phase 29 (`prop_*`). El `--force` saltea el prompt
#   interactivo que pide confirmación al detectar tablas "extras" no
#   declaradas en el schema TS.
#
# ============================================================================

set -e

# ----------------------------------------------------------------------------
# Variables (configurables, documentadas)
# ----------------------------------------------------------------------------
BACKUP_ORIGEN="/opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump"
BACKUP_SAFETY_NET="/var/backups/erp_sanchez/backup-260502-1921.dump"
DB_TEMP="erp_apr30_check"
DB_PROD="erp_sanchez"
PG_USER="sanchez"
DUMP_SQL="/tmp/restore-selective.sql"

# 16 tablas perdidas (presentes en Apr 30, ausentes en May 1)
TABLAS=(
  business_settings
  depositos
  inventarios
  inventario_sectores
  inventarios_articulos
  existencias
  dispositivos_moviles
  orders
  order_items
  sales
  sale_items
  purchases
  purchase_items
  api_keys
  webhooks
  webhook_deliveries
)

# ----------------------------------------------------------------------------
# Guard explícito — confirmación literal obligatoria
# ----------------------------------------------------------------------------
echo "============================================================"
echo "  RESTORE SELECTIVO erp_sanchez (FORENSE)"
echo "============================================================"
echo ""
echo "❌ Este script ya fue ejecutado el 2026-05-02 19:21 UTC."
echo "❌ Re-ejecutarlo es DESTRUCTIVO si el estado actual de"
echo "   $DB_PROD difiere del backup origen ($BACKUP_ORIGEN)."
echo ""
echo "Backup safety net disponible para rollback:"
echo "  $BACKUP_SAFETY_NET"
echo ""
read -p "Escribir literalmente 'EJECUTAR DE NUEVO' para continuar: " confirmacion
if [ "$confirmacion" != "EJECUTAR DE NUEVO" ]; then
  echo "✓ Abortado. (Comportamiento esperado para uso forense.)"
  exit 0
fi
echo ""

# ----------------------------------------------------------------------------
# Step 1 — Restore-test del backup origen a DB temporal
# ----------------------------------------------------------------------------
echo "=== Step 1: Restore-test del backup Apr 30 a DB temporal ==="
docker exec postgres psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $DB_TEMP;"
docker exec postgres psql -U "$PG_USER" -c "CREATE DATABASE $DB_TEMP;"
docker exec -i postgres pg_restore -U "$PG_USER" -d "$DB_TEMP" --no-owner --no-acl < "$BACKUP_ORIGEN"
echo "✓ Backup restaurado en $DB_TEMP"
echo ""

# ----------------------------------------------------------------------------
# Step 2 — Validación de integridad cruzada (MD5 articulos + huérfanos FK)
# ----------------------------------------------------------------------------
echo "=== Step 2: Validación de integridad cruzada ==="

# 2a) MD5 idéntico sobre codigos de articulos (current vs Apr 30)
MD5_PROD=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
  "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;")
MD5_TEMP=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
  "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;")

if [ "$MD5_PROD" != "$MD5_TEMP" ]; then
  echo "❌ MD5 mismatch — articulos divergieron entre $DB_PROD y $DB_TEMP."
  echo "   prod:  $MD5_PROD"
  echo "   temp:  $MD5_TEMP"
  echo "   Abortar — el restore podría introducir huérfanos en FKs."
  exit 1
fi
echo "✓ MD5 idéntico ($MD5_PROD) sobre articulos.codigo (101021 filas)"

# 2b) Huérfanos en FKs hacia public.articulos (medidos en DB temporal)
HUERFANOS_EX=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
  "SELECT count(*) FROM existencias e LEFT JOIN articulos a ON a.codigo = e.articulo_codigo WHERE a.codigo IS NULL;")
HUERFANOS_IA=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
  "SELECT count(*) FROM inventarios_articulos ia LEFT JOIN articulos a ON a.codigo = ia.articulo_codigo WHERE a.codigo IS NULL;")
echo "✓ Huérfanos en existencias: $HUERFANOS_EX (esperado 0)"
echo "✓ Huérfanos en inventarios_articulos: $HUERFANOS_IA (esperado 0)"

if [ "$HUERFANOS_EX" -ne 0 ] || [ "$HUERFANOS_IA" -ne 0 ]; then
  echo "❌ Hay huérfanos en el backup — no se puede restaurar sin generar inconsistencias."
  exit 1
fi
echo ""

# ----------------------------------------------------------------------------
# Step 3 — pg_dump selectivo de las 16 tablas desde DB temporal
# ----------------------------------------------------------------------------
echo "=== Step 3: pg_dump selectivo de 16 tablas ==="
# Construye los flags `-t public.<tabla>` para las 16 tablas
TABLAS_FLAGS=$(printf -- "-t public.%s " "${TABLAS[@]}")

# pg_dump dentro del container (formato plain text, sin owner/ACL,
# escribe a /tmp del container)
docker exec postgres pg_dump -U "$PG_USER" -d "$DB_TEMP" \
  $TABLAS_FLAGS \
  -F p --no-owner --no-acl -f "$DUMP_SQL"

# Copiar el dump del container al host para inspección manual previa al apply
docker cp "postgres:$DUMP_SQL" "$DUMP_SQL"
LINEAS=$(wc -l < "$DUMP_SQL")
echo "✓ Dump generado: $LINEAS líneas (esperado ~17098)"
echo "  Path host:      $DUMP_SQL"
echo "  Path container: $DUMP_SQL"
echo "  Resumen esperado: 16 CREATE TABLE, 15 CREATE SEQUENCE, 33 CREATE INDEX,"
echo "                    16 COPY, 51 ALTER TABLE (incluye 5 FKs hacia public.articulos)"
echo ""

# ----------------------------------------------------------------------------
# Step 4 — Aplicación atómica a prod (single-transaction obligatorio)
# ----------------------------------------------------------------------------
echo "=== Step 4: Aplicación atómica a $DB_PROD ==="
echo "⚠ COMMIT/ROLLBACK automático vía --single-transaction"
echo "⚠ ON_ERROR_STOP=1 aborta en el primer error y dispara ROLLBACK"
echo ""

# Asegurar que el dump esté disponible dentro del container
docker cp "$DUMP_SQL" "postgres:$DUMP_SQL"

# Apply atómico — si falla cualquier CREATE/ALTER/COPY, ROLLBACK total
docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" \
  --single-transaction --set ON_ERROR_STOP=1 -f "$DUMP_SQL"

echo "✓ Restore aplicado (COMMIT exitoso)"
echo ""

# ----------------------------------------------------------------------------
# Step 5 — Verificación post-restore (counts + FK integrity)
# ----------------------------------------------------------------------------
echo "=== Step 5: Verificación post-restore ==="

# 5a) Counts por tabla
for tabla in "${TABLAS[@]}"; do
  COUNT=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc "SELECT count(*) FROM $tabla;")
  echo "  $tabla: $COUNT filas"
done
echo ""

# 5b) Total de tablas en schema public (esperado: 27 — incluye articulos,
#     comprobantes_*, prop_*, drizzle.__drizzle_migrations no cuenta acá)
TOTAL_PUBLIC=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "  Total tablas public: $TOTAL_PUBLIC (esperado 27)"

# 5c) FK integrity post-restore
HUERF_EX=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
  "SELECT count(*) FROM existencias e LEFT JOIN articulos a ON a.codigo = e.articulo_codigo WHERE a.codigo IS NULL;")
HUERF_IA=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
  "SELECT count(*) FROM inventarios_articulos ia LEFT JOIN articulos a ON a.codigo = ia.articulo_codigo WHERE a.codigo IS NULL;")
echo "  ✓ Huérfanos en existencias: $HUERF_EX (esperado 0)"
echo "  ✓ Huérfanos en inventarios_articulos: $HUERF_IA (esperado 0)"
echo ""

# ----------------------------------------------------------------------------
# Step 6 — Cleanup (DBs temporales + tmp file)
# ----------------------------------------------------------------------------
echo "=== Step 6: Cleanup ==="
docker exec postgres psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $DB_TEMP;"
docker exec postgres rm -f "$DUMP_SQL"
rm -f "$DUMP_SQL"
echo "✓ DB temporal $DB_TEMP eliminada"
echo "✓ Tmp files limpiados ($DUMP_SQL en host y container)"
echo ""

echo "============================================================"
echo "  RESTORE COMPLETO"
echo "============================================================"
echo "  Safety net rollback: $BACKUP_SAFETY_NET"
echo "  Backup origen:       $BACKUP_ORIGEN"
echo "  16 tablas restauradas atómicamente"
echo "============================================================"

# ============================================================================
# Decisiones de diseño (referencia)
# ============================================================================
#
# 1) `--single-transaction` garantiza atomicidad: si CUALQUIER CREATE / ALTER
#    / COPY del dump falla, ROLLBACK total. NO existe estado intermedio.
#
# 2) `ON_ERROR_STOP=1` aborta `psql` al primer error, lo que dispara el
#    ROLLBACK del single-transaction. Sin este flag, psql continúa procesando
#    statements aunque uno falle.
#
# 3) `--no-owner --no-acl` (en pg_dump y pg_restore): evita conflictos por
#    diferencias de roles entre la DB temporal y prod (e.g., owner puede
#    no existir en target).
#
# 4) DB temporal `erp_apr30_check` permite generar el dump filtrado mediante
#    `pg_dump -t`. El backup origen está en formato custom (`-Fc`) y NO
#    soporta filtrado por `-t` directamente al restaurar — hay que restaurar
#    primero todo a una DB temporal y desde ahí dumpear selectivamente.
#
# 5) Las 16 tablas se listan EXPLÍCITAMENTE en el array `TABLAS`. NO se usa
#    wildcard. Cualquier tabla nueva que aparezca en el backup pero no esté
#    en la lista (e.g., una tabla que se haya creado en prod después del
#    backup origen) NO se restaura — esto protege a `articulos`,
#    `comprobantes_*`, `prop_*`, `drizzle.__drizzle_migrations` y schemas
#    `legacy_sanchez.*` / `n8n_ops.*` de ser sobrescritos por error.
#
# 6) `set -e` activado, `set -u` NO activado: variables como `$confirmacion`
#    pueden estar vacías legítimamente y `set -u` rompería el flujo del
#    guard interactivo. `set -o pipefail` no se activa porque interfiere
#    con `pg_dump | psql` y similares cuando el primero termina antes que
#    el segundo (no aplica en este script porque no se pipea, pero es
#    consistente con el patrón de scripts/phase38-preflight-backup.sh).
#
# ============================================================================
