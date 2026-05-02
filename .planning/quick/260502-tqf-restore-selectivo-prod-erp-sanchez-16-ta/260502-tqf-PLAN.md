---
phase: quick-260502-tqf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/restore-selectivo-260502.sh
  - .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md
autonomous: true
requirements:
  - QUICK-260502-TQF
mode: quick
forensic: true
---

<objective>
Documentar de forma reproducible el restore selectivo de 16 tablas en `erp_sanchez` (prod) ejecutado durante la sesión orquestadora del 2026-05-02, tras detectar (vía pre-flight backup de Phase 38-01) que la DB de producción había sido vaciada parcialmente entre Apr 30 02:20 UTC y May 1 02:20 UTC.

Purpose: Trabajo destructivo en prod ya ejecutado. Esta quick task NO re-ejecuta SQL — solo crea (a) script bash forense con los comandos exactos para auditoría/replicabilidad y (b) SUMMARY estructurado con timeline, evidencia, resultados verificables, drift residual y Pending Actions blocking.

Output:
- `scripts/restore-selectivo-260502.sh` — script forense con timeline, restore-test, pg_dump selectivo, aplicación atómica, verificación, cleanup
- `260502-tqf-SUMMARY.md` — registro estructurado del incidente y la recuperación con lecciones para memoria global
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/quick/260428-mig-aplicar-migration-prod-pendiente/260428-mig-SUMMARY.md
@.planning/quick/260429-rec-recuperar-datos-inventarios-existencias/260429-rec-SUMMARY.md

<forensic_notice>
Este plan es FORENSE. El trabajo destructivo en prod (`docker exec postgres psql ... -f /tmp/restore-selective.sql`) YA SE EJECUTÓ exitosamente durante la sesión orquestadora previa. El executor de este plan SOLO escribe archivos (script + SUMMARY). NO debe ejecutar comandos `docker exec`, `psql`, ni `pg_dump` contra `erp_sanchez`.

El propósito del script `scripts/restore-selectivo-260502.sh` es:
1. Documentar los comandos exactos en formato auditable
2. Permitir replicar el procedimiento si ocurriera un incidente idéntico
3. Servir de referencia para post-mortem / forensics

El script DEBE incluir un banner de advertencia explícito: "YA EJECUTADO — NO RE-CORRER SALVO EMERGENCIA IDÉNTICA".
</forensic_notice>

<incident_evidence>
Comparación de backups en `/opt/backup/postgres/erp_sanchez/`:

| Backup | Fecha | Tablas public | Estado |
|---|---|---|---|
| `erp_sanchez_backup_daily_20260427_0220.dump` | Apr 27 02:20 UTC | 8 | Pre-260428-mig (esperado) |
| `erp_sanchez_backup_daily_20260429_0220.dump` | Apr 29 02:20 UTC | 25 | BUENO (post-260428-mig + 260429-rec) |
| `erp_sanchez_backup_daily_20260430_0220.dump` | Apr 30 02:20 UTC | 25 | BUENO (origen del restore) |
| (faltante) | May 1 daily | — | NO GENERADO o eliminado |
| `erp_sanchez_backup_monthly_20260501_0220.dump` | May 1 02:20 UTC | 15 | YA VACIADO (incidente ocurrió antes) |
| `erp_sanchez_backup_daily_20260502_0220.dump` | May 2 02:20 UTC | 15 | Sigue vaciado |

Tablas perdidas (presentes en Apr 30, ausentes en May 1):
`business_settings`, `depositos`, `inventarios`, `inventario_sectores`, `inventarios_articulos`, `existencias`, `dispositivos_moviles`, `orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`, `api_keys`, `webhooks`, `webhook_deliveries` — 16 tablas.

Tablas intactas durante el incidente:
`articulos` (101021 filas), `comprobantes_*`, `prop_*` (Phase 29 schema, vacías), `drizzle.__drizzle_migrations`, `_prisma_migrations`, schemas `legacy_sanchez.*`, `n8n_ops.*`.
</incident_evidence>

<execution_summary>
Comandos ya ejecutados durante la sesión orquestadora (NO re-ejecutar):

1. **Pre-flight backup safety net** (vía `scripts/phase38-preflight-backup.sh`, ya merged):
   `/var/backups/erp_sanchez/backup-260502-1921.dump` (7.4 MB) — punto de rollback

2. **Validación pre-restore** (DB temporal `erp_apr30_check`):
   - Restore del backup Apr 30 a DB temporal
   - MD5 idéntico sobre 101021 codigos de articulos (current vs Apr 30)
   - 0 huérfanos en FKs de `existencias` e `inventarios_articulos` apuntando a `articulos`

3. **pg_dump selectivo** (16 tablas desde `erp_apr30_check`):
   ```bash
   docker exec postgres pg_dump -U sanchez -d erp_apr30_check \
     -t public.business_settings -t public.depositos -t public.inventarios \
     -t public.inventario_sectores -t public.inventarios_articulos -t public.existencias \
     -t public.dispositivos_moviles -t public.orders -t public.order_items \
     -t public.sales -t public.sale_items -t public.purchases -t public.purchase_items \
     -t public.api_keys -t public.webhooks -t public.webhook_deliveries \
     -F p --no-owner --no-acl -f /tmp/restore-selective.sql
   ```
   Resultado: 17098 líneas, 16 CREATE TABLE, 15 CREATE SEQUENCE, 33 CREATE INDEX, 16 COPY, 51 ALTER TABLE (incluye 5 FKs hacia `public.articulos`).

4. **Aplicación atómica a prod**:
   ```bash
   docker exec postgres psql -U sanchez -d erp_sanchez \
     --single-transaction --set ON_ERROR_STOP=1 -f /tmp/restore-selective.sql
   ```
   Exit 0 → COMMIT exitoso.

5. **Cleanup**: DROP de DBs temporales `erp_apr30_check`, `erp_may01_check`, `erp_validate`. Eliminado `/tmp/restore-selective.sql`.

6. **Verificación post-restore** (counts):
   - Tablas `public` en `erp_sanchez`: 11 → 27
   - `existencias`: 0 → 7873 ✓
   - `inventarios_articulos`: 0 → 7745 ✓
   - `business_settings`: 0 → 1 | `dispositivos_moviles`: 0 → 10 | `inventarios`: 0 → 1 | `inventario_sectores`: 0 → 1 | `depositos`: 0 → 1
   - Tablas schema-only (vacías por diseño): `orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`, `api_keys`, `webhooks`, `webhook_deliveries`
   - Intactas: `articulos` (101021), `comprobantes_*` (0/0/0), `prop_*` (Phase 29), `drizzle.__drizzle_migrations` (5 entries), `_prisma_migrations`, `legacy_sanchez.*`, `n8n_ops.*`
   - FK integrity: 0 huérfanos en `existencias` e `inventarios_articulos`
</execution_summary>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Crear script forense scripts/restore-selectivo-260502.sh</name>
  <files>scripts/restore-selectivo-260502.sh</files>
  <action>
Crear el script bash forense que documenta los comandos ejecutados durante el restore selectivo de prod del 2026-05-02. NO debe re-ejecutarse automáticamente; el banner advertencia debe ser claro.

**Patrón del repo (consultar `scripts/phase38-preflight-backup.sh` si existe):**
- `set -e` al tope (no `set -u`, no `set -o pipefail` si interfiere con verificaciones forenses)
- Banners separadores con `===` y emojis ASCII (`✓` éxito, `❌` error, `⚠` warning)
- Comentarios en español (consistencia con quick tasks 260428-mig y 260429-rec)
- Comandos contra Postgres siempre vía `docker exec postgres ...`

**Estructura obligatoria del script:**

1. **Shebang + header de bloque comentado** (10-20 líneas):
   - `#!/usr/bin/env bash`
   - Título: "Restore selectivo erp_sanchez — 2026-05-02 19:21 UTC (forense)"
   - Propósito: documentar reproducible los comandos del restore
   - **ADVERTENCIA EXPLÍCITA**: "YA EJECUTADO — NO RE-CORRER SALVO EMERGENCIA IDÉNTICA. Re-ejecutar destruirá tablas actuales si el contenido difiere del backup Apr 30."
   - Backup safety net: `/var/backups/erp_sanchez/backup-260502-1921.dump` (rollback)
   - Backup origen: `/opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump`

2. **Bloque comentado: Timeline del incidente** (5-7 líneas comentadas):
   - Apr 27 02:20: 8 tablas (pre-260428-mig)
   - Apr 29 02:20: 25 tablas (post-recuperación, BUENO)
   - Apr 30 02:20: 25 tablas (BUENO — origen del restore)
   - May 1 daily: NO GENERADO
   - May 1 02:20 monthly: 15 tablas (ya vaciado — incidente ocurrió entre Apr 30 02:20 y May 1 02:20)
   - May 2 02:20: 15 tablas (sigue vaciado)
   - Causa raíz: NO IDENTIFICADA (sospecha: `db:push --force` o equivalente durante smoke phase)

3. **Variables al tope** (configurables pero documentadas):
   ```bash
   BACKUP_ORIGEN="/opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump"
   BACKUP_SAFETY_NET="/var/backups/erp_sanchez/backup-260502-1921.dump"
   DB_TEMP="erp_apr30_check"
   DB_PROD="erp_sanchez"
   PG_USER="sanchez"
   DUMP_SQL="/tmp/restore-selective.sql"
   TABLAS=(
     business_settings depositos inventarios inventario_sectores
     inventarios_articulos existencias dispositivos_moviles
     orders order_items sales sale_items purchases purchase_items
     api_keys webhooks webhook_deliveries
   )
   ```

4. **Guard explícito al inicio del flujo ejecutable**:
   ```bash
   echo "=== RESTORE SELECTIVO erp_sanchez (FORENSE) ==="
   echo "❌ Este script ya fue ejecutado el 2026-05-02 19:21 UTC."
   echo "❌ Re-ejecutarlo es DESTRUCTIVO si el estado actual difiere del backup."
   echo ""
   read -p "Escribir literalmente 'EJECUTAR DE NUEVO' para continuar: " confirmacion
   if [ "$confirmacion" != "EJECUTAR DE NUEVO" ]; then
     echo "✓ Abortado. (Comportamiento esperado para uso forense.)"
     exit 0
   fi
   ```

5. **Step 1 — Restore-test del backup origen a DB temporal** (replicable):
   ```bash
   echo "=== Step 1: Restore-test del backup Apr 30 a DB temporal ==="
   docker exec postgres psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $DB_TEMP;"
   docker exec postgres psql -U "$PG_USER" -c "CREATE DATABASE $DB_TEMP;"
   docker exec -i postgres pg_restore -U "$PG_USER" -d "$DB_TEMP" --no-owner --no-acl < "$BACKUP_ORIGEN"
   echo "✓ Backup restaurado en $DB_TEMP"
   ```

6. **Step 2 — Validación pre-restore** (MD5 codigos articulos + huérfanos FK):
   ```bash
   echo "=== Step 2: Validación de integridad cruzada ==="
   MD5_PROD=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
     "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;")
   MD5_TEMP=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
     "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;")
   if [ "$MD5_PROD" != "$MD5_TEMP" ]; then
     echo "❌ MD5 mismatch — articulos divergieron. Abortar."
     exit 1
   fi
   echo "✓ MD5 idéntico ($MD5_PROD) sobre articulos.codigo"

   HUERFANOS_EX=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
     "SELECT count(*) FROM existencias e LEFT JOIN articulos a ON a.codigo = e.articulo_codigo WHERE a.codigo IS NULL;")
   HUERFANOS_IA=$(docker exec postgres psql -U "$PG_USER" -d "$DB_TEMP" -tAc \
     "SELECT count(*) FROM inventarios_articulos ia LEFT JOIN articulos a ON a.codigo = ia.articulo_codigo WHERE a.codigo IS NULL;")
   echo "✓ Huérfanos en existencias: $HUERFANOS_EX (esperado 0)"
   echo "✓ Huérfanos en inventarios_articulos: $HUERFANOS_IA (esperado 0)"
   ```

7. **Step 3 — pg_dump selectivo de las 16 tablas** (comando exacto):
   ```bash
   echo "=== Step 3: pg_dump selectivo de 16 tablas ==="
   TABLAS_FLAGS=$(printf -- "-t public.%s " "${TABLAS[@]}")
   docker exec postgres pg_dump -U "$PG_USER" -d "$DB_TEMP" \
     $TABLAS_FLAGS \
     -F p --no-owner --no-acl -f "$DUMP_SQL"
   docker cp "postgres:$DUMP_SQL" "$DUMP_SQL"
   LINEAS=$(wc -l < "$DUMP_SQL")
   echo "✓ Dump generado: $LINEAS líneas (esperado ~17098)"
   ```

8. **Step 4 — Aplicación atómica a prod** (single-transaction obligatorio):
   ```bash
   echo "=== Step 4: Aplicación atómica a $DB_PROD ==="
   echo "⚠ COMMIT/ROLLBACK automático vía --single-transaction"
   docker cp "$DUMP_SQL" "postgres:$DUMP_SQL"
   docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" \
     --single-transaction --set ON_ERROR_STOP=1 -f "$DUMP_SQL"
   echo "✓ Restore aplicado (COMMIT exitoso)"
   ```

9. **Step 5 — Verificación post-restore** (counts + FK integrity):
   ```bash
   echo "=== Step 5: Verificación post-restore ==="
   for tabla in "${TABLAS[@]}"; do
     COUNT=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc "SELECT count(*) FROM $tabla;")
     echo "  $tabla: $COUNT filas"
   done
   HUERF_EX=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
     "SELECT count(*) FROM existencias e LEFT JOIN articulos a ON a.codigo = e.articulo_codigo WHERE a.codigo IS NULL;")
   HUERF_IA=$(docker exec postgres psql -U "$PG_USER" -d "$DB_PROD" -tAc \
     "SELECT count(*) FROM inventarios_articulos ia LEFT JOIN articulos a ON a.codigo = ia.articulo_codigo WHERE a.codigo IS NULL;")
   echo "✓ 0 huérfanos en existencias: $HUERF_EX"
   echo "✓ 0 huérfanos en inventarios_articulos: $HUERF_IA"
   ```

10. **Step 6 — Cleanup** (DBs temporales + tmp file):
    ```bash
    echo "=== Step 6: Cleanup ==="
    docker exec postgres psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $DB_TEMP;"
    docker exec postgres rm -f "$DUMP_SQL"
    rm -f "$DUMP_SQL"
    echo "✓ DB temporal eliminada, tmp files limpiados"
    echo ""
    echo "=== RESTORE COMPLETO ==="
    echo "Safety net rollback: $BACKUP_SAFETY_NET"
    ```

11. **Permisos**: tras crear el archivo, ejecutar `chmod +x scripts/restore-selectivo-260502.sh` (incluir esta acción al final del task — el executor debe hacerlo).

**Decisiones de diseño explícitas (documentar como comentarios al pie del script):**
- Single-transaction garantiza atomicidad: si CUALQUIER CREATE/ALTER/COPY falla, ROLLBACK total. No hay estado intermedio.
- `--no-owner --no-acl` en pg_dump y pg_restore: evita conflictos con roles de prod vs DB temporal.
- DB temporal `erp_apr30_check` permite generar dump filtrado sin tocar el archivo `.dump` original (que es `-Fc` custom format y no soporta `-t` directamente).
- 16 tablas listadas explícitamente: NO se usa wildcard. Cualquier tabla nueva en backup que no esté en la lista NO se restaura — protege `articulos`, `comprobantes_*`, `prop_*`, `drizzle.__drizzle_migrations`.

**NO incluir en el script:**
- `set -u` (los temp vars como `$confirmacion` pueden estar vacíos)
- Loops de retry / fallback automático (forense = trazabilidad lineal)
- Llamadas a APIs externas, curl, healthchecks del backend (fuera del scope del restore)
  </action>
  <verify>
    <automated>bash -n scripts/restore-selectivo-260502.sh && grep -q "single-transaction" scripts/restore-selectivo-260502.sh && grep -q "EJECUTAR DE NUEVO" scripts/restore-selectivo-260502.sh && grep -q "ON_ERROR_STOP=1" scripts/restore-selectivo-260502.sh && grep -q "Huérfanos\|huérfanos" scripts/restore-selectivo-260502.sh && test -x scripts/restore-selectivo-260502.sh</automated>
  </verify>
  <done>
    Archivo `scripts/restore-selectivo-260502.sh` existe, sintaxis válida (`bash -n` exit 0), tiene permisos de ejecución, contiene los 6 steps numerados, banner de advertencia explícito con guard `EJECUTAR DE NUEVO`, comando con `--single-transaction` y `ON_ERROR_STOP=1`, verificación de huérfanos en FK, y bloque comentado con timeline del incidente.
  </done>
</task>

<task type="auto">
  <name>Task 2: Crear SUMMARY estructurado de la quick task</name>
  <files>.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md</files>
  <action>
Crear el SUMMARY siguiendo el patrón de `260428-mig-SUMMARY.md` y `260429-rec-SUMMARY.md`. Idioma español. Denso pero útil — sin relleno.

**Frontmatter obligatorio:**
```yaml
---
plan: 260502-tqf
one_liner: Restore selectivo de 16 tablas en erp_sanchez desde backup Apr 30 tras detectar data wipe parcial entre Apr 30 02:20 UTC y May 1 02:20 UTC durante pre-flight de Phase 38
status: complete
forensic: true
commits:
  - (pendiente al commitear plan): 'docs(quick-260502-tqf): document selective restore of 16 tables in erp_sanchez prod'
deviations: []
---
```

**Secciones obligatorias (en este orden):**

### 1. Resumen ejecutivo
2-3 párrafos. Qué pasó, qué se restauró, estado final. Mencionar:
- Detección casual durante `/gsd-execute-phase 38` Plan 38-01 (pre-flight backup) — no había monitoreo proactivo
- 16 tablas restauradas atómicamente desde backup Apr 30
- `articulos` (101021) intacto durante todo el incidente
- Causa raíz NO identificada (forensics pendiente)

### 2. Timeline del incidente
Tabla markdown con backups de `/opt/backup/postgres/erp_sanchez/`:

| Backup | Fecha (UTC) | Tablas public | Estado |
|---|---|---|---|
| `erp_sanchez_backup_daily_20260427_0220.dump` | Apr 27 02:20 | 8 | Pre-260428-mig (esperado) |
| `erp_sanchez_backup_daily_20260429_0220.dump` | Apr 29 02:20 | 25 | BUENO (post-recovery) |
| `erp_sanchez_backup_daily_20260430_0220.dump` | Apr 30 02:20 | 25 | BUENO — origen del restore |
| (ninguno) | May 1 daily | — | NO GENERADO o eliminado |
| `erp_sanchez_backup_monthly_20260501_0220.dump` | May 1 02:20 | 15 | YA VACIADO |
| `erp_sanchez_backup_daily_20260502_0220.dump` | May 2 02:20 | 15 | Sigue vaciado |

Comentar: ventana del incidente = entre Apr 30 02:20 UTC y May 1 02:20 UTC. Es la única banda horaria donde una operación destructiva pudo haber corrido sin observador humano.

### 3. Trabajo ejecutado
Lista numerada 1-7 (replicar el detalle de `<execution_summary>` del context block, en español, con bloques de código exactos):

1. Diagnóstico vía pre-flight backup de Plan 38-01 (`scripts/phase38-preflight-backup.sh`)
2. Evidencia recopilada (referencia a tabla de backups)
3. Pre-flight backup safety net (`/var/backups/erp_sanchez/backup-260502-1921.dump`, 7.4 MB)
4. Validación pre-restore (DB temporal `erp_apr30_check`, MD5 idéntico de codigos, 0 huérfanos FK)
5. Generación del dump selectivo (comando `pg_dump` con flags `-t` × 16, resultado: 17098 líneas, 16 CREATE TABLE, 15 CREATE SEQUENCE, 33 CREATE INDEX, 16 COPY, 51 ALTER TABLE incluyendo 5 FKs)
6. Aplicación atómica (comando `psql --single-transaction --set ON_ERROR_STOP=1`, exit 0, COMMIT)
7. Cleanup de DBs temporales (`erp_apr30_check`, `erp_may01_check`, `erp_validate`) y `/tmp/restore-selective.sql`

Cada step con bloque de código bash exacto.

### 4. Resultado verificable
Tabla pre/post:

| Métrica | Antes | Después | Match esperado |
|---|---|---|---|
| Tablas en schema `public` | 11 | 27 | ✓ |
| `existencias` | 0 | 7873 | ✓ (vs Apr 30 backup) |
| `inventarios_articulos` | 0 | 7745 | ✓ |
| `business_settings` | 0 | 1 | ✓ |
| `dispositivos_moviles` | 0 | 10 | ✓ |
| `inventarios` | 0 | 1 | ✓ |
| `inventario_sectores` | 0 | 1 | ✓ |
| `depositos` | 0 | 1 | ✓ |
| `articulos` | 101021 | 101021 | ✓ (intacto) |
| Huérfanos FK `existencias` → `articulos` | n/a | 0 | ✓ |
| Huérfanos FK `inventarios_articulos` → `articulos` | n/a | 0 | ✓ |

Tablas schema-only restauradas (vacías, sin filas en backup): `orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`, `api_keys`, `webhooks`, `webhook_deliveries`.

Intactas: `articulos`, `comprobantes_cabecera/detalle/pagos`, `prop_*` (Phase 29 schema), `drizzle.__drizzle_migrations` (5 entries), `_prisma_migrations`, schemas `legacy_sanchez.*`, `n8n_ops.*`.

### 5. Drift residual conocido (NO se aborda en esta task)
Lista bullets:
- `_journal.json` local sigue con entries 0000, 0001, 0002, 0004, 0005 (falta 0003) y `__drizzle_migrations` en prod tiene 5 entries pero el FS tiene 6 archivos `.sql` (0000-0005). **Esto era el scope original de Phase 38 que quedó pausada** — pendiente decidir destino.
- `inventarios_articulos.sector_id`: columna huérfana sin FK (residual de quick task 260429-rec).
- `inventario_sectores.columnas`: jsonb mismatch con schema.ts (`$type<string[]>` pero DB tiene números).

### 6. Anti-patrón a registrar globalmente
Sección con título exacto: **Anti-patrón: `db:push --force` (o equivalente) durante smoke phase puede vaciar tablas no relacionadas con el target del smoke**.

Hipótesis (sin evidencia confirmada): durante una sesión de smoke testing de Phase 29 (`prop_*`), un comando del estilo `pnpm db:push --force` o `drizzle-kit push --force` corrido contra prod (en vez de dev) habría detectado las 16 tablas de `migration-prod.sql` (260428-mig) como "no en schema TS" y propuesto droppearlas — `--force` saltea el prompt interactivo.

**Recomendación:** Agregar `feedback_db_push_force_prod.md` a la memoria global del usuario en:
`~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/feedback_db_push_force_prod.md`

Contenido sugerido del feedback:
- NUNCA correr `db:push`, `drizzle-kit push`, `prisma db push` con flags `--force`/`--accept-data-loss` contra prod.
- Si el flag se necesita en CI/scripts, hardcodear `DATABASE_URL` apuntando solo a dev/staging.
- Considerar agregar guard en `apps/backend/package.json` que detecte `NODE_ENV=production` y aborte `db:push`.

### 7. Pending Actions (BLOCKING)
Lista numerada con cómo verificar cada una. Marcar `[ ]` (no resueltas):

1. **[ ] Smoke manual del admin web en producción** (BLOQUEANTE)
   - Verificar: login con cuenta admin → `/articulos` (debe listar 101021 articulos paginados) → `/inventarios` (debe mostrar el "Primer inventario" finalizado con 7745 items) → `/configuracion` (debe cargar `business_settings.business_name`).
   - URL: `http://erp.sanchezrepuestos.com.ar`
   - Cómo verificar: usar skill `playwright-testing` o navegador manual. Confirmar 0 errores 500 en logs del backend (`docker compose logs erp-backend --tail 100`).

2. **[ ] Decidir destino de Phase 38** (BLOQUEANTE)
   - Phase 38 estaba pausada después de Plan 38-01 (pre-flight backup). El scope original (drift de `_journal.json`) sigue válido pero ahora hay drift adicional (sector_id huérfano, jsonb mismatch).
   - Opciones: (a) abortar Phase 38, marcar deprecada en ROADMAP; (b) replanificar Phase 38 con scope ampliado (incluir drift residual de este restore); (c) continuar Phase 38 con scope original asumiendo que el resto se atiende en otra fase.
   - Cómo verificar: usuario decide via `/gsd:discuss-phase 38` o equivalente.

3. **[ ] Forensics del wipe** (NO BLOQUEANTE pero recomendado antes de cerrar)
   - Investigar qué corrió entre Apr 30 02:20 UTC y May 1 02:20 UTC.
   - Cómo verificar:
     - `git log --since="2026-04-30" --until="2026-05-01" --all --oneline` (commits del periodo)
     - `cat ~/.bash_history | grep -E "db:push|drizzle-kit|psql.*DROP"` (historial bash del periodo)
     - Logs Docker del periodo: `docker compose logs --since="2026-04-30T02:20:00Z" --until="2026-05-01T02:20:00Z" erp-backend postgres`
     - Logs de cron / `systemctl status` para ver si algún job programado escaló.

4. **[ ] Escribir feedback global del anti-patrón** (BLOQUEANTE para cierre del task)
   - Crear `~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/feedback_db_push_force_prod.md`.
   - Cómo verificar: archivo existe y contenido cubre los 3 puntos de la sección 6.
   - Actualizar `MEMORY.md` agregando línea en `## Feedback`: `- [NUNCA db:push --force contra prod](feedback_db_push_force_prod.md) — Comando destruye tablas no presentes en schema TS, causa data loss silencioso`.

### 8. Referencias
- Backup safety net (rollback inmediato): `/var/backups/erp_sanchez/backup-260502-1921.dump` (7.4 MB, generado 2026-05-02 19:21 UTC)
- Backup origen del restore: `/opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump`
- Script forense: `scripts/restore-selectivo-260502.sh`
- Pre-flight script (ya merged): `scripts/phase38-preflight-backup.sh`
- Quick tasks relacionadas:
  - `260428-mig`: aplicó `migration-prod.sql` y creó las 16 tablas el Apr 28
  - `260429-rec`: pobló `inventarios_articulos` (7745) y sintetizó `existencias` (7873) el Apr 29
  - Estas dos tasks dejaron prod en el estado "BUENO" que el backup de Apr 30 capturó y este restore recuperó

**NO incluir** `must_haves` en frontmatter (mode quick, no validate).
**NO incluir** secciones genéricas como "Lecciones aprendidas" o "Próximos pasos" — todo va en Pending Actions con verify concreto.
  </action>
  <verify>
    <automated>test -f .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "^plan: 260502-tqf" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "^status: complete" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "Timeline del incidente" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "Pending Actions" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "Anti-patrón" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "feedback_db_push_force_prod" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "backup-260502-1921.dump" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md && grep -q "20260430_0220.dump" .planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md</automated>
  </verify>
  <done>
    SUMMARY.md existe en path exacto, frontmatter con `plan: 260502-tqf` + `status: complete` + `forensic: true`, contiene las 8 secciones (Resumen / Timeline / Trabajo ejecutado / Resultado verificable / Drift residual / Anti-patrón / Pending Actions / Referencias), referencia explícita a `backup-260502-1921.dump` (rollback) y `erp_sanchez_backup_daily_20260430_0220.dump` (origen), 4 Pending Actions BLOCKING con cómo verificar cada una, recomendación de feedback global con path absoluto bajo `~/.claude/projects/`.
  </done>
</task>

</tasks>

<verification>
- `bash -n scripts/restore-selectivo-260502.sh` exit 0 (sintaxis válida)
- `scripts/restore-selectivo-260502.sh` ejecutable (`-x`)
- `260502-tqf-SUMMARY.md` existe con frontmatter válido y las 8 secciones requeridas
- Ningún comando `docker exec`, `psql`, `pg_dump`, `pg_restore` ejecutado durante este plan (es forense — solo escribe archivos)
- Ambos archivos consistentes entre sí: el script implementa lo que el SUMMARY documenta como "Trabajo ejecutado"
</verification>

<success_criteria>
- Trabajo ya hecho en prod queda documentado de forma reproducible y auditable
- Cualquier persona del equipo puede leer el SUMMARY en 5 minutos y entender: qué pasó, qué se restauró, qué queda pendiente, cómo verificar cada pendiente
- Si ocurre un incidente similar, `scripts/restore-selectivo-260502.sh` sirve como template (con guard explícito que evita ejecución accidental)
- Anti-patrón queda capturado para memoria global → reduce probabilidad de recurrencia
- Pending Actions blocking quedan visibles para el orquestador (smoke, decisión Phase 38, forensics, feedback global)
</success_criteria>

<output>
Tras ejecutar las 2 tasks, no se requiere SUMMARY adicional generado por el executor — la Task 2 ES el SUMMARY de esta quick task.

Commit message sugerido (conventional commits, inglés):
`docs(quick-260502-tqf): document selective restore of 16 tables in erp_sanchez prod`

Archivos a commitear:
- `scripts/restore-selectivo-260502.sh`
- `.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-PLAN.md`
- `.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md`
</output>
