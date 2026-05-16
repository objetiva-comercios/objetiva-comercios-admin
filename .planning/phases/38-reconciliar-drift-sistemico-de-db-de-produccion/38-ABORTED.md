---
phase: 38-reconciliar-drift-sistemico-de-db-de-produccion
status: ABORTED
aborted: 2026-05-15
aborted_by: usuario (luishelguera@objetiva.com.ar)
superseded_by:
  - quick task 260502-tqf (selective restore prod erp_sanchez 16 tables)
  - commit e5358502 (migration 0006 categoria/subcategoria + prop_categoria/prop_subcategoria)
  - commit (este) — drizzle journal 0003 sincronizado
---

# Phase 38: ABORTED

## Por que se aborta

Phase 38 se creó el 2026-05-01 con la hipótesis de que el problema era "drift de `__drizzle_migrations` vs `_journal.json` vs filesystem" — el `_journal.json` registraba 5 entries y el filesystem tenía 6 archivos `.sql` (0000-0005), faltaba 0003. La phase planeaba reconstruir el journal y dejar la DB de prod sincronizada.

**El diagnóstico fue parcialmente correcto pero incompleto.** Cuando el Plan 38-01 (pre-flight backup) corrió el 2026-05-02, el script de comparación reveló que **además del journal drift, había un data wipe silencioso de 16 tablas** entre el 2026-04-30 02:20 UTC y el 2026-05-01 02:20 UTC. Hipótesis del wipe: `db:push --force` o `drizzle-kit push --force` aplicado a prod en lugar de dev durante smoke de Phase 29 (las 16 tablas habían sido creadas vía SQL manual en quick task 260428-mig y nunca aparecieron en el schema TS, por lo que drizzle las consideró "extras" y las dropeó).

Tres acciones consecutivas resolvieron el problema fuera del scope original de Phase 38:

1. **Quick task 260502-tqf** (2026-05-02, commit `775c91bd`): restore selectivo de las 16 tablas desde backup Apr 30. Recupera 7873 + 7745 filas en `existencias` e `inventarios_articulos`.

2. **Commit `e5358502`** (2026-05-15): bug colateral descubierto durante smoke admin. `articulos.categoria` y `articulos.subcategoria` declarados en schema TS desde 2026-03-19 (quick task 260319-od3) pero nunca tuvieron migration `.sql`. Endpoint `/articulos` devolvía 500 silencioso. Migration 0006 agrega las columnas + crea `prop_categoria` + `prop_subcategoria` con FK jerárquica.

3. **Commit del 2026-05-15** (este abort + cleanup): sincroniza `_journal.json` y `__drizzle_migrations` registrando `0003_add_columna_inv_articulos` que estaba aplicada en DB pero no registrada en journal.

Con esto **el scope original de Phase 38 quedó resuelto** sin necesidad de ejecutar Plans 38-02..38-06. La auditoría desatendida del 2026-05-15 confirmó: 0 drift schema TS vs DB, 0 HTTP 500 en backend, 22 páginas frontend funcionales, 117.660 filas operativas.

## Que se ejecuto antes del abort

Solo Plan 38-01 (Pre-flight backup). El script `scripts/phase38-preflight-backup.sh` quedó en el repo (commit `e9557311`) y es reusable. Plans 38-02..38-06 NUNCA se ejecutaron (sus archivos quedan en este directorio como documentación de lo que se había planeado, pero no representan trabajo pendiente).

## Que pasa con las decisiones D-01..D-11 del CONTEXT.md

Las decisiones fueron tomadas para resolver un problema (drift `__drizzle_migrations`) que dejó de ser el problema real. Quedan archivadas como referencia. Específicamente:

- **D-02 (local journal repair)**: cubierto por el commit del 2026-05-15 que registra 0003 + 0006 en journal y DB.
- **D-03 (prod audit + INSERT idempotente)**: cubierto. `drizzle.__drizzle_migrations` en DB tiene 6 entries que matchean el journal.
- **D-04 (triple verification)**: cubierto por la auditoría desatendida del 2026-05-15.
- **D-05 (pre-flight backup)**: ejecutado en Plan 38-01 (commit `e9557311`).
- **D-08 (non-destructive schema.ts patch)**: cubierto por commit `e5358502`.
- **D-09 (CI workflow drizzle drift check)**: NO HECHO. Queda como tech-debt para Phase 37 o nueva phase. Recomendación: agregar a Phase 37 si esta se replanifica.
- **D-10 (healthcheck endpoint)**: NO HECHO. Bajo prioridad. Queda como tech-debt.
- **D-11 (ADR + CLAUDE.md)**: cubierto parcialmente por las memorias globales `feedback_db_push_force_prod.md` y `feedback_schema_drift_silencioso.md` agregadas el 2026-05-15.

## Archivos que se preservan

Toda la carpeta `38-reconciliar-drift-sistemico-de-db-de-produccion/` queda intacta como **archivo histórico**. Los PLANs 38-02..38-06 no se ejecutan. El SUMMARY 38-01 documenta lo único que sí se hizo de esta phase.

## Decisiones derivadas del aborto

1. **Re-evaluar el orden de v1.3**: dado que el data wipe expuso fragilidad, ahora corresponde priorizar:
   - **CI drift-check** (D-09 huérfano) — alto valor, bajo esfuerzo. Crear quick task o phase dedicada.
   - **Healthcheck endpoint** (D-10 huérfano) — útil para detección temprana. Mediano esfuerzo.

2. **Phase 30** sigue siendo el próximo paso natural del milestone v1.3.

3. **Forensics del wipe Apr 30 → May 1**: marcado como "no determinable" — bash history rotado, logs Docker rotados, evidencia perdida 14+ días después.

---

_Aborted: 2026-05-15_
_Trabajo equivalente entregado por: 260502-tqf + commit e5358502 + commit del 2026-05-15_
