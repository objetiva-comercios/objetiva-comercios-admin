# Phase 38: Reconciliar drift sistemico de DB de produccion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 38-reconciliar-drift-sistemico-de-db-de-produccion
**Areas discussed:** Estrategia de reconciliación, Limpieza de \_prisma_migrations legacy, Prevención post-fix, Scope DBs y verificación

---

## Estrategia de reconciliación

### Q1: ¿Cuál es la estrategia base para reconciliar el drift?

| Option                  | Description                                                                                                                                                                   | Selected |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Repair journal-only     | El schema en prod ya está correcto. Solo hay que regenerar `_journal.json` local + asegurar que `__drizzle_migrations` refleja todo lo aplicado. NO toca data, mínimo riesgo. | ✓        |
| Introspect + rebaseline | Usar `drizzle-kit introspect` contra prod y colapsar 0000-0005 en un nuevo 0000_baseline.                                                                                     |          |
| Catch-up incremental    | Tabla por tabla: comparar schema TS vs estado real, generar SQL idempotente solo donde haya diff.                                                                             |          |
| Reset full              | pg_dump → drop schema → replay 0000-0005 desde files → restore data. Requiere autorización explícita.                                                                         |          |

**User's choice:** Repair journal-only.
**Notes:** Estrategia mínima invasiva. Riesgo bajo, downtime cero, preserva data 100%. Descarta reset full por choque con `feedback_never_drop_tables.md`.

---

### Q2: ¿Cómo arreglamos el journal local? (drizzle-kit no puede backfillar snapshots)

| Option                                    | Description                                                                                                                                                                  | Selected |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Forward marker + 0006 baseline            | Editar `_journal.json` con entries dummy 0003/0004/0005 + correr `db:generate` → genera `0006_baseline` desde el state real de schema.ts. Marcar 0006 como aplicado en prod. | ✓        |
| Rebase mini (consolidar en 0000_baseline) | Borrar 0000-0005 + meta/\* + journal completo y regenerar 0000_baseline. Limpio pero pierde history.                                                                         |          |
| Vivir con journal corrupto                | No tocar el journal. Aplicar futuras migraciones via psql manual hasta una phase de rebase.                                                                                  |          |

**User's choice:** Forward marker + 0006 baseline.
**Notes:** Snapshots 0003-0005 quedan como mentiras históricas pero nunca se consultan (Drizzle solo usa el snapshot del LAST entry). Si `0006_baseline` resulta no-vacío, escalar antes de aplicar.

---

### Q3: ¿Cómo abordamos `__drizzle_migrations` en producción?

| Option                           | Description                                                                                                                                                                            | Selected |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Audit-first + INSERT idempotente | Paso 1 read-only: query `SELECT * FROM __drizzle_migrations`. Paso 2: comparar hashes vs `sha256` de cada SQL file. Paso 3: INSERT solo de las entries faltantes. Sin DELETE/TRUNCATE. | ✓        |
| TRUNCATE + reinsert completo     | Backup de la tabla, luego TRUNCATE y reinsert. Más limpio. Requiere autorización explícita.                                                                                            |          |
| Solo INSERT 0003 + 0006          | Asumir que 0000/0001/0002/0004/0005 ya están con hashes correctos. Mínimo invasivo.                                                                                                    |          |

**User's choice:** Audit-first + INSERT idempotente.
**Notes:** NUNCA UPDATE/DELETE. Si la auditoría revela hashes mismatched (no solo missing), escalar al usuario.

---

### Q4: ¿Cómo verificamos que la reconciliación quedó limpia?

| Option                                | Description                                                                                                                         | Selected |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| drizzle-kit + smoke playwright + diff | Cobertura triple: `db:generate --check` + `drizzle-kit introspect` diff vs schema.ts + smoke playwright en los 10 módulos. ~30 min. | ✓        |
| Solo db:generate --check + smoke      | Sin introspect manual. Más rápido pero menos defensivo.                                                                             |          |
| Solo smoke playwright                 | Confiar en que si los 10 módulos cargan sin 500, está OK. Drift estructural sin detectar.                                           |          |

**User's choice:** drizzle-kit + smoke playwright + diff.
**Notes:** El `db:generate --check` también es insumo directo de Phase 37 SC#3.

---

## Limpieza de \_prisma_migrations legacy

### Q5: ¿Qué hacemos con `_prisma_migrations` (tracking legacy de Prisma)?

| Option                                | Description                                                                                | Selected |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| Dejar intacta                         | Cero riesgo. Solo metadata legacy que no afecta a Drizzle ni al admin.                     | ✓        |
| Drop con backup previo                | Borrar SOLO la tabla de tracking (no las tablas comprobantes\_\*). Requiere autorización.  |          |
| Auditar primero todo el schema legacy | Output: documento con mapa completo. NO ejecuta DROP — abre decisión para phase posterior. |          |

**User's choice:** Dejar intacta.
**Notes:** `comprobantes_*` también quedan intactas (data viva del ERP legacy). Drizzle ignora ambas. Ruido visible en `\dt` aceptable.

---

### Q6: ¿Atacamos los 2 drifts residuales documentados en 260429-rec?

| Option                           | Description                                                                                                                            | Selected |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Auditar + decidir caso por caso  | Phase 38 los detecta via introspect, los reporta y propone fix. NO los aplica automáticamente — requiere OK del usuario para cada uno. | ✓        |
| Dejarlos para Phase 37           | Phase 38 solo journal/migrations; tech debt residual va a 37 cuyo SC#3 lo exige.                                                       |          |
| Atacarlos ahora con autorización | Phase 38 incluye step explícito de cleanup (DROP COLUMN sector_id + patch schema.ts). Mezcla scopes.                                   |          |

**User's choice:** Auditar + decidir caso por caso.
**Notes:** Drifts conocidos: `inventarios_articulos.sector_id` huérfano + `inventario_sectores.columnas` jsonb vs string[] mismatch. Reporte estructurado dentro de Phase 38; aplicación de fixes destructivos requiere OK explícito.

---

## Prevención post-fix

### Q7: ¿Qué mecanismos de prevención instalamos? (multi-select)

| Option                                             | Description                                                                                                      | Selected |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| drizzle-kit check en CI/pre-commit                 | Step que falla el build si detecta drift schema.ts ↔ DB. Phase 37 SC#3 ya lo exige.                              | ✓        |
| Healthcheck SQL en backend                         | Endpoint `/health/db` con `SELECT 1 FROM <table>` en tablas críticas. Detecta drift al deploy, no al primer uso. | ✓        |
| Logging mejorado de SQL errors                     | Mostrar `cause` completo en errores de drizzle-orm. Acelera diagnosis pero no es prevención.                     |          |
| Documentar convención: db:migrate, no psql directo | ADR + entrada en CLAUDE.md sobre disciplina de migraciones.                                                      | ✓        |

**User's choice:** drizzle-kit check + Healthcheck + Documentación. (Logging descartado.)
**Notes:** Combinación defensa-en-profundidad. Logging queda diferido a posible phase de observabilidad.

---

### Q8: ¿Dónde corre `drizzle-kit check`?

| Option                   | Description                                                      | Selected |
| ------------------------ | ---------------------------------------------------------------- | -------- |
| Solo CI (GitHub Actions) | Step en workflow. Bloquea merges con drift. Cero overhead local. | ✓        |
| Solo pre-commit (husky)  | Hook local. Feedback inmediato pero requiere DB local levantada. |          |
| Ambos                    | Defensa en profundidad. Más fricción local.                      |          |

**User's choice:** Solo CI.
**Notes:** Pre-commit descartado por fricción (commits fallarían con DB local apagada). CI requiere DB de test alineada — researcher decide cómo materializarla.

---

### Q9: ¿Qué chequea el healthcheck SQL?

| Option                         | Description                                                                                       | Selected |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | -------- |
| Tablas críticas (~5)           | `business_settings`, `articulos`, `existencias`, `prop_marca`, `orders`. Una por dominio crítico. | ✓        |
| Todas las tablas del schema TS | Iterar sobre todas las ~25 tablas. Máximo defensive pero más mantenimiento.                       |          |
| Solo `business_settings`       | Replicar el patrón del SUMMARY de 260428-mig. Mínimo.                                             |          |

**User's choice:** 5 tablas críticas.
**Notes:** Lista cerrada por ahora; añadir tablas requiere actualizar el endpoint manualmente.

---

## Scope DBs y verificación

### Q10: ¿Qué DBs reconciliamos en Phase 38?

| Option                             | Description                                                                      | Selected |
| ---------------------------------- | -------------------------------------------------------------------------------- | -------- |
| Solo prod (erp_sanchez VPS)        | El drift sistemico está en prod. Devs se alinean con git pull + db:push --force. | ✓        |
| Prod + dev local del repo          | Aplicar el mismo proceso a la DB local del dev. Más coordinación.                |          |
| Prod + recrear local desde scratch | Solo prod; recomendar a devs recrear DB local fresca.                            |          |

**User's choice:** Solo prod.
**Notes:** Files modificados (`_journal.json`, snapshots, `0006_baseline.sql`) se commitean. Devs sincronizan post-merge.

---

### Q11: ¿Qué cobertura del smoke playwright?

| Option                                 | Description                                                                                                            | Selected |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| Los 10 módulos del roadmap             | `/articulos /orders /sales /purchases /propiedades /dispositivos /webhooks /api-keys /inventarios /settings`. ~10 min. | ✓        |
| Solo los históricamente afectados (~5) | `/articulos /propiedades /orders /inventarios /settings`. Más rápido pero blind spots.                                 |          |
| Los 10 + flujos críticos               | Routes + crear artículo + editar existencia. ~15 min. Cubre R+W.                                                       |          |

**User's choice:** Los 10 módulos del roadmap.
**Notes:** Read-only smoke. Mutation flows descartados — Phase 38 verifica drift de schema, no integridad funcional completa.

---

### Q12: ¿Cómo materializamos el pre-flight backup?

| Option                               | Description                                                                                                                  | Selected |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| Dump + restore en DB temp + checksum | pg_dump + pg_restore en `erp_restore_test` + comparación de row counts en tablas críticas. Drop temp. Sin esto NO se avanza. | ✓        |
| Solo pg_dump, sin restore-test       | Backup file en VPS, sin verificar que es restaurable. Más rápido, riesgoso.                                                  |          |
| Dump + restore + smoke en temp DB    | Levantar el backend contra la temp DB y correr smoke. Máxima safety, ~20-30 min.                                             |          |

**User's choice:** Dump + restore en DB temp + checksum.
**Notes:** Tablas a checksum: `articulos`, `existencias`, `inventarios_articulos`, `comprobantes_cabecera/detalle/pagos`. Backup persiste 30 días en `/var/backups/erp_sanchez/`.

---

## Claude's Discretion

- Infra de la DB de test para CI (`drizzle-kit check`): service container vs staging vs ephemeral.
- Shape exacto del endpoint `/api/health/db` (controller, response shape, query mode).
- Algoritmo de cálculo de hash que usa Drizzle internamente para `__drizzle_migrations` — researcher confirma leyendo `drizzle-orm/migrator.ts` o probando.
- Formato del reporte de drift residual (markdown estructurado vs JSON, archivo separado vs sección).
- Naming exacto del file ADR (`.planning/decisions/migration-discipline.md` vs path siguiendo convención existente).
- Cronjob de cleanup de backups antiguos en VPS (out of scope formal).

## Deferred Ideas

- Cleanup de `_prisma_migrations` (phase futura de housekeeping legacy).
- Cleanup de tablas `comprobantes_*` legacy (no antes de cutover completo a admin).
- DROP COLUMN `inventarios_articulos.sector_id` (propuesta en reporte; aplicación requiere OK).
- Patch a `inventario_sectores.columnas` en `schema.ts` (puede aplicarse si el planner lo considera trivial).
- Logging mejorado del cause de SQL errors (phase futura de observabilidad).
- Cronjob de cleanup automático de backups en VPS.
- Reconciliación de DBs locales de devs.
- `drizzle-kit check` en pre-commit local.
