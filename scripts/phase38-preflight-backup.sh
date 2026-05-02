#!/usr/bin/env bash
set -e

echo "Phase 38 — Pre-flight backup + restore-test (D-05)"
echo "============================================================"
echo ""

# 0) Computar nombre canónico (D-15): backup-YYMMDD-HHMM.dump
TIMESTAMP="$(date +%y%m%d-%H%M)"
BACKUP_NAME="backup-${TIMESTAMP}.dump"
BACKUP_PATH_HOST="/var/backups/erp_sanchez/${BACKUP_NAME}"
BACKUP_PATH_CTR="/tmp/${BACKUP_NAME}"

echo "Backup target: ${BACKUP_PATH_HOST}"
echo ""

# 1) Verificar que /var/backups/erp_sanchez/ existe y es escribible
if [ ! -d /var/backups/erp_sanchez ]; then
  echo "❌ /var/backups/erp_sanchez/ does not exist. Create it first: sudo mkdir -p /var/backups/erp_sanchez && sudo chown $(whoami) /var/backups/erp_sanchez"
  exit 1
fi

# 2) Verificar que no hay colisión de nombre (D-15: naming explícito, NO overwrite silencioso)
if [ -f "${BACKUP_PATH_HOST}" ]; then
  echo "❌ Backup ${BACKUP_PATH_HOST} already exists. Refusing to overwrite. Wait 1 minute and re-run, or move the existing file."
  exit 1
fi

# 3) pg_dump dentro del container
echo "Step 1: pg_dump erp_sanchez (custom format, restorable via pg_restore)"
docker exec postgres pg_dump -U sanchez -d erp_sanchez -F c -f "${BACKUP_PATH_CTR}"
echo "✓ pg_dump complete"
echo ""

# 4) Mover el .dump del container al host
echo "Step 2: Move dump from container to host"
docker cp "postgres:${BACKUP_PATH_CTR}" "${BACKUP_PATH_HOST}"
docker exec postgres rm -f "${BACKUP_PATH_CTR}"
echo "✓ Dump persisted at ${BACKUP_PATH_HOST}"
ls -la "${BACKUP_PATH_HOST}"
echo ""

# 5) Crear DB temporal y restaurar
echo "Step 3: Restore-test in erp_restore_test"
docker exec postgres dropdb -U sanchez --if-exists erp_restore_test
docker exec postgres createdb -U sanchez erp_restore_test
docker cp "${BACKUP_PATH_HOST}" "postgres:${BACKUP_PATH_CTR}"
# pg_restore puede emitir warnings no fatales (ej: roles ya existentes); -e hace que cualquier ERROR aborte
docker exec postgres pg_restore -U sanchez -d erp_restore_test -e "${BACKUP_PATH_CTR}" || {
  echo "❌ pg_restore failed. Aborting Phase 38 — do NOT touch __drizzle_migrations or _journal.json."
  docker exec postgres dropdb -U sanchez --if-exists erp_restore_test
  docker exec postgres rm -f "${BACKUP_PATH_CTR}"
  exit 1
}
docker exec postgres rm -f "${BACKUP_PATH_CTR}"
echo "✓ Restore-test complete"
echo ""

# 6) Diff de row counts en 6 tablas críticas
echo "Step 4: Row count diff between erp_sanchez and erp_restore_test"
TABLES=("articulos" "existencias" "inventarios_articulos" "comprobantes_cabecera" "comprobantes_detalle" "comprobantes_pagos")
DIFF_FOUND=0
for T in "${TABLES[@]}"; do
  C1=$(docker exec postgres psql -U sanchez -d erp_sanchez -tAc "SELECT count(*) FROM ${T}")
  C2=$(docker exec postgres psql -U sanchez -d erp_restore_test -tAc "SELECT count(*) FROM ${T}")
  if [ "$C1" = "$C2" ]; then
    echo "  ✓ ${T}: ${C1} (match)"
  else
    echo "  ❌ ${T}: erp_sanchez=${C1} erp_restore_test=${C2} (MISMATCH)"
    DIFF_FOUND=1
  fi
done
echo ""

# 7) Drop DB temporal SIEMPRE (incluso si hay diff)
echo "Step 5: Drop erp_restore_test"
docker exec postgres dropdb -U sanchez erp_restore_test
echo "✓ erp_restore_test dropped"
echo ""

if [ $DIFF_FOUND -ne 0 ]; then
  echo "❌ ABORT: row counts mismatch. Phase 38 must NOT proceed. Open a new todo and investigate."
  echo "   Backup is preserved at ${BACKUP_PATH_HOST} for forensics."
  exit 1
fi

echo "============================================================"
echo "✓ ALL CHECKS PASSED"
echo "  Backup:   ${BACKUP_PATH_HOST}"
echo "  Tables:   6/6 row counts match between prod and restored"
echo "  Next:     Plan 38-02 (local journal repair) is now safe to start"
echo "============================================================"
