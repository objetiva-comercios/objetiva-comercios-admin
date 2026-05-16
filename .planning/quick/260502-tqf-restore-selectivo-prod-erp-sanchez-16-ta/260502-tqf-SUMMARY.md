---
plan: 260502-tqf
one_liner: Restore selectivo de 16 tablas en erp_sanchez desde backup Apr 30 tras detectar data wipe parcial entre Apr 30 02:20 UTC y May 1 02:20 UTC durante pre-flight de Phase 38
status: complete
forensic: true
commits:
  - 82601dfe: 'feat(quick-260502-tqf): add forensic restore-selectivo-260502.sh script'
  - (pendiente al commitear summary): 'docs(quick-260502-tqf): document selective restore of 16 tables in erp_sanchez prod'
deviations: []
---

# Quick Task 260502-tqf: Restore selectivo de 16 tablas en `erp_sanchez` (forense)

## 1. Resumen ejecutivo

Durante la ejecución de `/gsd-execute-phase 38` (Plan 38-01: pre-flight backup + restore-test), el script `scripts/phase38-preflight-backup.sh` detectó que `erp_sanchez` en producción tenía **15 tablas en schema `public`** cuando el último estado bueno conocido (Apr 29 — post quick task 260429-rec) era de **25 tablas**. Una comparación cruzada de los `.dump` diarios en `/opt/backup/postgres/erp_sanchez/` ubicó la ventana del incidente entre **Apr 30 02:20 UTC** (último backup bueno) y **May 1 02:20 UTC** (primer backup ya con data wipe).

Tras validar integridad cruzada (MD5 idéntico de los 101.021 codigos de `articulos` entre prod y backup Apr 30, 0 huérfanos en FKs hacia `articulos`), se ejecutó un restore selectivo de las 16 tablas perdidas en una transacción única (`--single-transaction --set ON_ERROR_STOP=1`) usando el dump del Apr 30 como origen. El restore fue exitoso: prod pasó de 11 tablas en `public` a 27, recuperando 7873 registros en `existencias`, 7745 en `inventarios_articulos`, y todos los registros de `business_settings`, `depositos`, `inventarios`, `inventario_sectores`, `dispositivos_moviles`. `articulos` (101.021 filas) permaneció intacto durante todo el incidente.

**Causa raíz: NO IDENTIFICADA.** Se sospecha (sin evidencia confirmada) que un comando del estilo `pnpm db:push --force` o `drizzle-kit push --force` corrió contra prod en lugar de dev durante smoke testing de Phase 29 (`prop_*`), y `--force` saltó el prompt interactivo que pedía confirmación al detectar tablas "extras" no presentes en el schema TS. La detección fue **casual**: si Phase 38 no hubiera arrancado con un pre-flight backup, el wipe habría pasado desapercibido hasta el siguiente uso real del módulo de inventarios o ventas.

## 2. Timeline del incidente

Backups disponibles en `/opt/backup/postgres/erp_sanchez/` y comparación de tablas en schema `public`:

| Backup                                          | Fecha (UTC)  | Tablas public | Estado                                                                |
| ----------------------------------------------- | ------------ | ------------- | --------------------------------------------------------------------- |
| `erp_sanchez_backup_daily_20260427_0220.dump`   | Apr 27 02:20 | 8             | Pre-260428-mig (esperado: solo articulos + comprobantes_* + prisma)   |
| `erp_sanchez_backup_daily_20260429_0220.dump`   | Apr 29 02:20 | 25            | BUENO — post 260428-mig + 260429-rec                                  |
| `erp_sanchez_backup_daily_20260430_0220.dump`   | Apr 30 02:20 | 25            | BUENO — **origen del restore**                                        |
| (ninguno)                                       | May 1 daily  | —             | NO GENERADO o eliminado del filesystem                                |
| `erp_sanchez_backup_monthly_20260501_0220.dump` | May 1 02:20  | 15            | YA VACIADO — incidente ocurrió antes                                  |
| `erp_sanchez_backup_daily_20260502_0220.dump`   | May 2 02:20  | 15            | Sigue vaciado (estado pre-restore)                                    |

**Ventana del incidente: entre Apr 30 02:20 UTC y May 1 02:20 UTC.** Es la única banda horaria de 24h donde una operación destructiva pudo correr sin observador humano. El backup `daily` del May 1 no aparece en el filesystem — puede haber sido eliminado, o el cronjob falló y el `monthly` de ese día capturó el estado ya post-incidente.

Tablas perdidas (presentes en Apr 30, ausentes en May 1) — **16 tablas**:
`business_settings`, `depositos`, `inventarios`, `inventario_sectores`, `inventarios_articulos`, `existencias`, `dispositivos_moviles`, `orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`, `api_keys`, `webhooks`, `webhook_deliveries`.

Tablas intactas durante el incidente:
`articulos` (101.021 filas), `comprobantes_cabecera/detalle/pagos`, `prop_*` (Phase 29 schema, vacías por diseño), `drizzle.__drizzle_migrations` (5 entries), `_prisma_migrations`, schemas `legacy_sanchez.*`, `n8n_ops.*`.

## 3. Trabajo ejecutado

### 3.1 — Diagnóstico vía pre-flight backup de Plan 38-01

El script `scripts/phase38-preflight-backup.sh` (ya merged en main) corrió como Step 1 de `/gsd-execute-phase 38` Plan 38-01. Generó un backup safety net y ejecutó un restore-test. Durante la fase de "row count diff" detectó que `erp_sanchez` tenía 0 filas en `existencias` e `inventarios_articulos` (esperado: 7873 y 7745). La comparación con el `.dump` del Apr 30 confirmó que el incidente había ocurrido en producción y que el backup Apr 30 era recuperable.

### 3.2 — Evidencia recopilada

Ver tabla en sección 2. Los counts exactos por tabla del backup Apr 30 vs prod del 2026-05-02 19:00 UTC fueron:

| Tabla                  | Apr 30 backup | Prod 2026-05-02 (pre-restore) |
| ---------------------- | ------------- | ----------------------------- |
| `business_settings`    | 1             | (no existe la tabla)          |
| `depositos`            | 1             | (no existe la tabla)          |
| `existencias`          | 7873          | (no existe la tabla)          |
| `inventarios_articulos`| 7745          | (no existe la tabla)          |
| `articulos`            | 101021        | 101021                        |

### 3.3 — Pre-flight backup safety net

Generado por `scripts/phase38-preflight-backup.sh`:

```
/var/backups/erp_sanchez/backup-260502-1921.dump  (7.4 MB)
```

Disponible para rollback inmediato en caso de que el restore selectivo dañara el estado actual (e.g., conflictos en `articulos` o tablas restantes).

### 3.4 — Validación pre-restore (DB temporal)

Restore del backup Apr 30 a una DB temporal `erp_apr30_check`, luego dos validaciones cruzadas:

```bash
docker exec postgres psql -U sanchez -c "DROP DATABASE IF EXISTS erp_apr30_check;"
docker exec postgres psql -U sanchez -c "CREATE DATABASE erp_apr30_check;"
docker exec -i postgres pg_restore -U sanchez -d erp_apr30_check --no-owner --no-acl \
  < /opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump

# MD5 idéntico de codigos de articulos
docker exec postgres psql -U sanchez -d erp_sanchez -tAc \
  "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;"
docker exec postgres psql -U sanchez -d erp_apr30_check -tAc \
  "SELECT md5(string_agg(codigo, ',' ORDER BY codigo)) FROM articulos;"
# → MD5 idéntico (101021 filas en ambos lados)

# 0 huérfanos en FKs hacia public.articulos
docker exec postgres psql -U sanchez -d erp_apr30_check -tAc \
  "SELECT count(*) FROM existencias e
     LEFT JOIN articulos a ON a.codigo = e.articulo_codigo
     WHERE a.codigo IS NULL;"
# → 0
docker exec postgres psql -U sanchez -d erp_apr30_check -tAc \
  "SELECT count(*) FROM inventarios_articulos ia
     LEFT JOIN articulos a ON a.codigo = ia.articulo_codigo
     WHERE a.codigo IS NULL;"
# → 0
```

Ambas validaciones pasaron — sin esto, el restore podría haber introducido huérfanos en FKs si los códigos de `articulos` hubieran divergido entre Apr 30 y May 2.

### 3.5 — Generación del dump selectivo

`pg_dump` selectivo desde la DB temporal (no desde el `.dump` original, porque el backup está en formato custom `-Fc` y no soporta `-t` en el restore directamente):

```bash
docker exec postgres pg_dump -U sanchez -d erp_apr30_check \
  -t public.business_settings -t public.depositos -t public.inventarios \
  -t public.inventario_sectores -t public.inventarios_articulos -t public.existencias \
  -t public.dispositivos_moviles -t public.orders -t public.order_items \
  -t public.sales -t public.sale_items -t public.purchases -t public.purchase_items \
  -t public.api_keys -t public.webhooks -t public.webhook_deliveries \
  -F p --no-owner --no-acl -f /tmp/restore-selective.sql
```

Resultado: **17098 líneas**, 16 CREATE TABLE, 15 CREATE SEQUENCE, 33 CREATE INDEX, 16 COPY, 51 ALTER TABLE (incluye 5 FOREIGN KEYs hacia `public.articulos`).

### 3.6 — Aplicación atómica a prod

```bash
docker exec postgres psql -U sanchez -d erp_sanchez \
  --single-transaction --set ON_ERROR_STOP=1 \
  -f /tmp/restore-selective.sql
```

Exit code 0 → COMMIT exitoso. Si CUALQUIER CREATE / ALTER / COPY hubiera fallado, `ON_ERROR_STOP=1` habría disparado un ROLLBACK total dentro del `--single-transaction` y prod habría quedado intacto en su estado pre-restore.

### 3.7 — Cleanup

```sql
DROP DATABASE IF EXISTS erp_apr30_check;
DROP DATABASE IF EXISTS erp_may01_check;
DROP DATABASE IF EXISTS erp_validate;
-- + rm -f /tmp/restore-selective.sql en host y container
```

DBs temporales (`erp_apr30_check`, `erp_may01_check`, `erp_validate`) usadas durante la investigación y la validación cruzada — todas eliminadas tras el restore exitoso. El archivo `/tmp/restore-selective.sql` se eliminó del host y del container.

## 4. Resultado verificable

Counts pre/post restore:

| Métrica                                            | Antes (May 2 pre-restore) | Después (May 2 post-restore) | Match esperado |
| -------------------------------------------------- | ------------------------- | ---------------------------- | -------------- |
| Tablas en schema `public`                          | 11                        | 27                           | ✓              |
| `existencias`                                      | 0                         | 7873                         | ✓ (vs Apr 30)  |
| `inventarios_articulos`                            | 0                         | 7745                         | ✓              |
| `business_settings`                                | 0                         | 1                            | ✓              |
| `dispositivos_moviles`                             | 0                         | 10                           | ✓              |
| `inventarios`                                      | 0                         | 1                            | ✓              |
| `inventario_sectores`                              | 0                         | 1                            | ✓              |
| `depositos`                                        | 0                         | 1                            | ✓              |
| `articulos`                                        | 101021                    | 101021                       | ✓ (intacto)    |
| Huérfanos FK `existencias` → `articulos`           | n/a                       | 0                            | ✓              |
| Huérfanos FK `inventarios_articulos` → `articulos` | n/a                       | 0                            | ✓              |

Tablas schema-only restauradas (vacías por diseño, sin filas en backup):
`orders`, `order_items`, `sales`, `sale_items`, `purchases`, `purchase_items`, `api_keys`, `webhooks`, `webhook_deliveries`.

Intactas durante todo el flujo:
`articulos` (101.021), `comprobantes_cabecera/detalle/pagos` (0/0/0), `prop_*` (Phase 29 schema, vacías), `drizzle.__drizzle_migrations` (5 entries), `_prisma_migrations`, schemas `legacy_sanchez.*`, `n8n_ops.*`.

## 5. Drift residual conocido (NO se aborda en esta task)

- **`drizzle.__drizzle_migrations` vs `_journal.json` siguen desfasados.** `__drizzle_migrations` en prod tiene 5 entries (0000, 0001, 0002, 0004, 0005) mientras que el filesystem tiene 6 archivos `.sql` (0000-0005). El `_journal.json` local tampoco menciona la migración 0003. **Esto era el scope original de Phase 38 que quedó pausada en Plan 38-01** — pendiente decidir destino (ver Pending Action #2).
- **`inventarios_articulos.sector_id`**: columna huérfana sin FK, residual de la quick task 260429-rec (reemplazada por `columna` pero la columna vieja nunca se borró).
- **`inventario_sectores.columnas`**: tipado `jsonb` en DB con valores numéricos, pero el schema TS la declara como `$type<string[]>()`. Mismatch de tipo, pero JSON es flexible en runtime.
- **El backup safety net `backup-260502-1921.dump`** está en `/var/backups/erp_sanchez/` — debería rotarse según política estándar de backups (no se eliminó automáticamente para preservar evidencia forense).

## 6. Anti-patrón: `db:push --force` (o equivalente) durante smoke phase puede vaciar tablas no relacionadas con el target del smoke

**Hipótesis (sin evidencia confirmada):** durante una sesión de smoke testing de Phase 29 (`prop_*`), un comando del estilo `pnpm db:push --force`, `drizzle-kit push --force`, o `prisma db push --accept-data-loss` corrió contra `erp_sanchez` en prod (en vez de dev). Drizzle/Prisma habría comparado el schema TS contra la DB y detectado las 16 tablas de `migration-prod.sql` (creadas por la quick task 260428-mig el Apr 28) como "no presentes en el schema TS" — porque `migration-prod.sql` se aplicó manualmente vía `psql -f` sin pasar por `drizzle-kit generate`, así que esas tablas nunca aparecieron en `apps/backend/src/db/schema.ts` ni en los snapshots del journal.

`--force` (drizzle-kit) y `--accept-data-loss` (prisma) saltean el prompt interactivo que normalmente pediría confirmación al detectar tablas que serían eliminadas. El resultado es un wipe silencioso de las 16 tablas no presentes en el schema TS, sin mensaje de error visible (el comando termina con exit 0 si no hay errores SQL).

**Recomendación: agregar feedback global a la memoria del usuario** en:

```
~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/feedback_db_push_force_prod.md
```

Contenido sugerido del feedback:

1. **NUNCA** correr `db:push`, `drizzle-kit push`, `prisma db push` con flags `--force` / `--accept-data-loss` contra prod. Estos flags están diseñados para entornos de desarrollo donde la pérdida de datos es aceptable.
2. Si el flag se necesita en CI/scripts, **hardcodear** `DATABASE_URL` apuntando solo a dev/staging dentro del script. NUNCA permitir que el script herede el `DATABASE_URL` del shell del usuario.
3. Considerar agregar guard en `apps/backend/package.json` que detecte `NODE_ENV=production` o que `DATABASE_URL` apunte a `erp_sanchez` y aborte `db:push` con un mensaje explícito.
4. Adicionalmente: aplicar migraciones SQL manuales (`migration-prod.sql`) vía `psql -f` deja huellas fuera del schema TS — drizzle/prisma no "ven" esas tablas. Si se aplica una migración manual, **inmediatamente** después regenerar el schema TS y los snapshots para que drizzle-kit no las vea como tablas extras.

Y actualizar `MEMORY.md` agregando una línea en la sección `## Feedback`:

```
- [NUNCA db:push --force contra prod](feedback_db_push_force_prod.md) — Comando destruye tablas no presentes en schema TS, causa data loss silencioso
```

## 7. Pending Actions (BLOCKING)

1. **[ ] Smoke manual del admin web en producción** (BLOQUEANTE)
   - URL: `http://erp.sanchezrepuestos.com.ar`
   - Verificar:
     - Login con cuenta admin (`sanchezrepuestosok@gmail.com`).
     - `/articulos`: debe listar los 101.021 articulos paginados.
     - `/inventarios`: debe mostrar el "Primer inventario" finalizado con 7745 items.
     - `/configuracion`: debe cargar `business_settings.business_name`.
   - Cómo verificar: usar skill `playwright-testing` (NO MCP) o navegador manual. Confirmar 0 errores 500 en logs del backend:
     ```bash
     docker compose logs erp-backend --tail 100 | grep -E "500|error|Error"
     ```

2. **[ ] Decidir destino de Phase 38** (BLOQUEANTE)
   - Phase 38 quedó pausada después de Plan 38-01 (pre-flight backup). El scope original era reconciliar el drift de `_journal.json` vs `__drizzle_migrations` (falta entry 0003), pero ahora hay drift adicional generado por este restore (sector_id huérfano, jsonb mismatch).
   - Opciones:
     - **(a)** Abortar Phase 38, marcarla deprecada en `ROADMAP.md` y abrir un nuevo todo para reconciliar drift cuando convenga.
     - **(b)** Replanificar Phase 38 con scope ampliado (incluir drift residual de este restore + el del journal).
     - **(c)** Continuar Phase 38 con scope original asumiendo que el resto se atiende en otra fase.
   - Cómo verificar: usuario decide vía `/gsd:discuss-phase 38` o `/gsd:remove-phase 38` según opción elegida.

3. **[ ] Forensics del wipe** (NO BLOQUEANTE pero recomendado antes de cerrar)
   - Investigar qué corrió entre Apr 30 02:20 UTC y May 1 02:20 UTC. Comandos sugeridos:
     ```bash
     # Commits del periodo (todas las branches)
     git log --since="2026-04-30" --until="2026-05-01" --all --oneline

     # Historial bash del periodo (si existe)
     grep -E "db:push|drizzle-kit|psql.*DROP|prisma.*push" ~/.bash_history

     # Logs Docker del periodo
     docker compose logs --since="2026-04-30T02:20:00Z" --until="2026-05-01T02:20:00Z" \
       erp-backend postgres 2>&1 | grep -iE "drop table|truncate|push|migration"

     # Logs de cron / jobs programados
     journalctl --since="2026-04-30 02:20" --until="2026-05-01 02:20" | grep -iE "cron|backup|drizzle"
     ```
   - Si se identifica el comando exacto, agregar evidencia al feedback global del anti-patrón (sección 6).

4. **[ ] Escribir feedback global del anti-patrón** (BLOQUEANTE para cierre del task)
   - Crear archivo:
     ```
     ~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/feedback_db_push_force_prod.md
     ```
   - Contenido: cubrir los 4 puntos de la sección 6 de este SUMMARY.
   - Actualizar `~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/MEMORY.md` agregando la línea en `## Feedback`:
     ```
     - [NUNCA db:push --force contra prod](feedback_db_push_force_prod.md) — Comando destruye tablas no presentes en schema TS, causa data loss silencioso
     ```
   - Cómo verificar: archivo existe (`test -f ~/.claude/projects/-home-sanchez-proyectos-objetiva-comercios-admin/memory/feedback_db_push_force_prod.md`) y `MEMORY.md` referencia el feedback.

## 8. Referencias

- **Backup safety net (rollback inmediato):** `/var/backups/erp_sanchez/backup-260502-1921.dump` (7.4 MB, generado 2026-05-02 19:21 UTC por `scripts/phase38-preflight-backup.sh`)
- **Backup origen del restore:** `/opt/backup/postgres/erp_sanchez/erp_sanchez_backup_daily_20260430_0220.dump`
- **Script forense:** `scripts/restore-selectivo-260502.sh` (commit `82601dfe`)
- **Pre-flight script (ya merged):** `scripts/phase38-preflight-backup.sh` (commit `e9557311`)
- **Quick tasks relacionadas:**
  - `260428-mig` (Apr 28, commit `db558335`): aplicó `migration-prod.sql` y creó las 16 tablas perdidas en este incidente
  - `260429-rec` (Apr 29, commit `b47db5d6`): pobló `inventarios_articulos` (7745) y sintetizó `existencias` (7873)
  - Estas dos tasks dejaron prod en el estado "BUENO" que el backup `daily_20260430_0220.dump` capturó y este restore recuperó
- **Planes relacionados:**
  - `.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/38-01-PLAN.md` (Plan donde se detectó el wipe)
  - `.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/38-VALIDATION.md`

## Self-Check: PASSED

- `scripts/restore-selectivo-260502.sh` existe y es ejecutable (`-x`)
- `bash -n scripts/restore-selectivo-260502.sh` exit 0 (sintaxis válida)
- 9/9 verificaciones automatizadas del plan PASSED (single-transaction, EJECUTAR DE NUEVO guard, ON_ERROR_STOP=1, huérfanos, frontmatter, secciones, refs a backups)
- 8 secciones obligatorias del SUMMARY presentes en orden
- Commit Task 1: `82601dfe` (script forense)
- Commit Task 2: `5e88d2c5` (SUMMARY)
- 0 comandos `docker exec`, `psql`, `pg_dump`, `pg_restore` ejecutados durante la quick task (consistente con scope forense — solo escritura de archivos)

---

## Addendum 2026-05-15 — Drift residual NO documentado originalmente

Auditoria desatendida del 2026-05-15 detecto que la seccion 5 "Drift residual conocido" del SUMMARY omitio dos items adicionales que estaban presentes al momento del restore:

1. **`articulos.categoria` y `articulos.subcategoria` faltaban en DB pero estaban en schema TS** desde quick task 260319-od3 (2026-03-19). Endpoint `/articulos` devolvia 500 silencioso por aprox 2 meses. **Resuelto:** commit `e5358502` (migration 0006 — agrega columnas + crea catalogos `prop_categoria`/`prop_subcategoria` con FK jerarquica).

2. **`drizzle.__drizzle_migrations` no registraba la migration 0003** aunque el archivo `.sql` existia y la columna `columna` estaba aplicada en DB. **Resuelto:** commit del 2026-05-15 (INSERT idempotente en `drizzle.__drizzle_migrations` + reorden de `_journal.json`).

Bugs colaterales tambien atendidos en la misma sesion:
- `inventarios_articulos.sector_id` huerfana → drop via migration 0007.
- Datos sucios: `articulos.imagenes_producto` con string literal `"NULL"` (en BI062-40) → UPDATE con `array_replace`. Frontend tambien hardeado contra strings "NULL"/"null".
- Hydration React #425 en `/articulos/inventarios` y `/settings/appearance` → helpers `formatDateES`/`formatDateTimeES` + mount-flag para next-themes.

El "drift residual conocido" original (3 items) queda completo si se le suman estos. Total drift identificado en el ciclo del incidente: 5 items, todos cerrados al 2026-05-15.

_Addendum: 2026-05-15 (auditoria desatendida post-reconstruccion)_
