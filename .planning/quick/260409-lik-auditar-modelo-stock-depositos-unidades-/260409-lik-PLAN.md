---
phase: quick-260409-lik
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
  - apps/backend/src/modules/articulos/dto/update-articulo.dto.ts
  - apps/backend/src/db/migrate-unidades.sql
  - .planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/ANALYSIS.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "articulos.unidades se mantiene automaticamente via trigger PostgreSQL"
    - "Los 7,522 articulos con unidades > 0 tienen registro en existencias para deposito principal"
    - "No se puede escribir unidades manualmente via API (removido de DTOs)"
    - "erp_unidades permanece intacto como campo informativo"
  artifacts:
    - path: "apps/backend/src/db/migrate-unidades.sql"
      provides: "Migration SQL: trigger + data migration"
      contains: "CREATE OR REPLACE FUNCTION update_articulo_unidades"
    - path: "apps/backend/src/modules/articulos/dto/create-articulo.dto.ts"
      provides: "DTO sin campo unidades"
    - path: "apps/backend/src/modules/articulos/dto/update-articulo.dto.ts"
      provides: "DTO sin campo unidades"
    - path: ".planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/ANALYSIS.md"
      provides: "Documentacion del estado actual e inconsistencias"
  key_links:
    - from: "existencias table"
      to: "articulos.unidades"
      via: "PostgreSQL trigger trg_update_articulo_unidades"
      pattern: "AFTER INSERT OR UPDATE OF cantidad OR DELETE ON existencias"
---

<objective>
Unificar el modelo de stock: migrar articulos.unidades a existencias para deposito principal (ID=1), crear trigger PG que mantenga unidades como campo calculado, limpiar DTOs, y documentar el estado.

Purpose: Eliminar inconsistencia entre articulos.unidades (manual) y existencias (fuente de verdad multi-deposito). Despues de esto, unidades = SUM(existencias.cantidad) automaticamente.
Output: SQL de migracion para produccion, DTOs limpios, ANALYSIS.md
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/260409-lik-CONTEXT.md
@.planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/260409-lik-RESEARCH.md
@apps/backend/src/db/schema.ts
@apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
@apps/backend/src/modules/articulos/dto/update-articulo.dto.ts

<interfaces>
<!-- From schema.ts: articulos table -->
unidades: integer('unidades').default(0)
erpUnidades: integer('erp_unidades').default(0)

<!-- From schema.ts: existencias table -->
existencias = pgTable('existencias', {
  articuloCodigo: text('articulo_codigo').notNull().references(() => articulos.codigo),
  depositoId: integer('deposito_id').notNull().references(() => depositos.id),
  cantidad: integer('cantidad').default(0),
  stockMinimo: integer('stock_minimo').default(0),
  stockMaximo: integer('stock_maximo').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({ pk: primaryKey(table.articuloCodigo, table.depositoId) }))

<!-- DTOs: lines to remove -->
create-articulo.dto.ts lines 111-113: @IsOptional() @IsInt() unidades?: number
update-articulo.dto.ts lines 108-110: @IsOptional() @IsInt() unidades?: number
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Crear migration SQL y documentar ANALYSIS.md</name>
  <files>apps/backend/src/db/migrate-unidades.sql, .planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/ANALYSIS.md</files>
  <action>
**migrate-unidades.sql** — Script SQL completo para ejecutar en produccion via `docker exec`. Debe contener en este orden:

1. **Pre-check: Verificar deposito principal existe**
   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = 1) THEN
       RAISE EXCEPTION 'Deposito principal (id=1) no encontrado. Abortando migracion.';
     END IF;
   END $$;
   ```

2. **Migrar datos: articulos.unidades -> existencias para deposito_id=1**
   - INSERT INTO existencias (articulo_codigo, deposito_id, cantidad, stock_minimo, stock_maximo, updated_at)
   - SELECT desde articulos WHERE unidades > 0
   - deposito_id = 1 (hardcoded, verificado en produccion)
   - ON CONFLICT (articulo_codigo, deposito_id) DO UPDATE SET cantidad = EXCLUDED.cantidad, updated_at = NOW()
   - Idempotente: seguro de re-ejecutar

3. **Crear trigger function: update_articulo_unidades()**
   - CREATE OR REPLACE FUNCTION
   - Determinar target_codigo segun TG_OP (DELETE usa OLD, resto usa NEW)
   - UPDATE articulos SET unidades = COALESCE(SUM desde existencias, 0) WHERE codigo = target_codigo
   - RETURNS TRIGGER, LANGUAGE plpgsql
   - Usar patron exacto del RESEARCH.md

4. **Crear trigger en tabla existencias**
   - DROP TRIGGER IF EXISTS (idempotente)
   - CREATE TRIGGER trg_update_articulo_unidades AFTER INSERT OR UPDATE OF cantidad OR DELETE ON existencias FOR EACH ROW EXECUTE FUNCTION update_articulo_unidades()

5. **Recalcular todos los articulos.unidades via trigger**
   - UPDATE articulos SET unidades = COALESCE((SELECT SUM(cantidad) FROM existencias WHERE articulo_codigo = codigo), 0)
   - Esto sincroniza TODOS los articulos (no solo los migrados)

6. **Verificaciones finales**
   - SELECT count de existencias para deposito_id=1
   - SELECT count de articulos donde unidades > 0
   - SELECT comparacion: articulos con unidades != SUM(existencias) (debe ser 0)

Incluir comentarios claros en cada seccion. El archivo debe ser ejecutable con: `docker exec -i postgres psql -U usuario -d database < migrate-unidades.sql`

**ANALYSIS.md** — Documento con:
- Estado actual del modelo (articulos.unidades manual, existencias vacia, erp_unidades informativo)
- Conteos verificados: 100,990 articulos, 7,522 con unidades > 0, 25,683 unidades totales
- Inconsistencias encontradas (unidades manual vs existencias vacia)
- Cambios aplicados (trigger, migracion, DTOs)
- Estado final post-migracion
- Diagrama de flujo: existencias cambia -> trigger -> articulos.unidades actualizado
  </action>
  <verify>
    <automated>cat apps/backend/src/db/migrate-unidades.sql | grep -c "CREATE OR REPLACE FUNCTION\|CREATE TRIGGER\|INSERT INTO existencias\|DO \$\$" | xargs test 4 -eq</automated>
  </verify>
  <done>migrate-unidades.sql contiene: pre-check deposito, migracion datos, trigger function, trigger, recalculo, verificaciones. ANALYSIS.md documenta estado actual, inconsistencias, y cambios.</done>
</task>

<task type="auto">
  <name>Task 2: Remover unidades de DTOs (campo ahora es read-only via trigger)</name>
  <files>apps/backend/src/modules/articulos/dto/create-articulo.dto.ts, apps/backend/src/modules/articulos/dto/update-articulo.dto.ts</files>
  <action>
En ambos DTOs, eliminar el bloque de `unidades`:

**create-articulo.dto.ts** — Eliminar las 3 lineas (aprox lineas 111-113):
```
  @IsOptional()
  @IsInt()
  unidades?: number
```

**update-articulo.dto.ts** — Eliminar las 3 lineas (aprox lineas 108-110):
```
  @IsOptional()
  @IsInt()
  unidades?: number
```

NO tocar `erpUnidades` ni ningun otro campo. Solo remover `unidades`.

Verificar que no haya imports de `IsInt` que queden huerfanos (si `unidades` era el unico campo que usaba `@IsInt()`, verificar si otros campos lo usan; si no, remover el import). Revisar ambos archivos completos para confirmar.

NO modificar el schema.ts (la columna `unidades` permanece, solo deja de ser writable via API).
NO modificar el frontend (no muestra `unidades` en ningun lugar).
  </action>
  <verify>
    <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && grep -n "unidades" apps/backend/src/modules/articulos/dto/create-articulo.dto.ts apps/backend/src/modules/articulos/dto/update-articulo.dto.ts | grep -v erp | grep -v "//" && echo "FAIL: unidades still in DTOs" || echo "PASS: unidades removed from DTOs"</automated>
  </verify>
  <done>Campo `unidades` eliminado de CreateArticuloDto y UpdateArticuloDto. El campo ya no es writable via API. erp_unidades intacto.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API -> DB | DTOs ya no aceptan `unidades`, trigger es la unica fuente de escritura |
| Migration script -> Production DB | SQL ejecutado manualmente en produccion |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-lik-01 | Tampering | articulos.unidades via API | mitigate | Remover unidades de DTOs; trigger sobreescribe cualquier valor manual |
| T-lik-02 | Information Disclosure | Migration SQL con credenciales | accept | Script no contiene credenciales, se ejecuta via docker exec con auth existente |
| T-lik-03 | Denial of Service | Trigger lento en bulk updates | accept | Trigger es O(1) por row (single SUM query), bulk existencias updates son raros |
</threat_model>

<verification>
1. migrate-unidades.sql existe y contiene todas las secciones (pre-check, migracion, trigger, recalculo, verificacion)
2. DTOs no contienen campo `unidades` (grep confirma)
3. ANALYSIS.md documenta estado actual y cambios
4. schema.ts NO fue modificado (columna unidades permanece)
5. erp_unidades NO fue tocado en ningun archivo
</verification>

<success_criteria>
- SQL de migracion listo para ejecutar en produccion (idempotente, con pre-checks)
- Trigger PostgreSQL definido para mantener articulos.unidades = SUM(existencias.cantidad)
- unidades removido de ambos DTOs (create + update)
- ANALYSIS.md completo con estado actual, inconsistencias, y estado final
- Cero cambios en frontend (no era necesario)
</success_criteria>

<output>
After completion, create `.planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/260409-lik-SUMMARY.md`
</output>
