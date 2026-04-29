# PITFALLS — v1.3 Variantes y Modelo de Stock

**Domain:** Adding variants + flat-table SKU model + cascade migrations to existing live commerce system (11,316 articulos, 7,873 existencias, FK refs from orders/sales/purchases/inventarios_articulos)
**Researched:** 2026-04-29
**Confidence:** HIGH (Postgres semantics + Drizzle behaviors verified against official docs)

## CRITICAL PITFALLS

### P-01 — PK swap from `codigo` to `sku` breaks 4 child FK relationships simultaneously

**What goes wrong**
`articulos.codigo` is the PK referenced by `orderItems.articuloCodigo`, `saleItems.articuloCodigo`, `purchaseItems.articuloCodigo`, `existencias.articuloCodigo`, `inventariosArticulos.articuloCodigo`. Dropping the PK with `CASCADE` deletes ALL those FK constraints in one shot. If the migration script isn't perfectly authored, you end up with an articulos table whose PK is `sku`, but child tables silently lose referential integrity and accept orphan inserts until you re-add FKs. Worse: if you re-add FKs pointing to `sku` BEFORE backfilling `articulos.sku = codigo` for the no-variants case, every existing child row becomes orphan and the FK validation step fails with `violates foreign key constraint`.

**Why it happens**
The "obvious" path (`ALTER TABLE articulos DROP CONSTRAINT articulos_pkey CASCADE; ALTER TABLE articulos ADD PRIMARY KEY (sku);`) is what every Postgres tutorial shows, but those tutorials assume zero child tables.

**Warning signs**
- `pg_dump` of pre-migration vs post-migration shows different `tc.constraint_name` count
- `SELECT conname FROM pg_constraint WHERE confrelid = 'articulos'::regclass` returns fewer rows after migration
- Inserts into `existencias` with non-existent codigo succeed (they shouldn't)
- TS compilation passes but runtime FK errors appear randomly

**Prevention strategy**
Use this exact 7-step sequence inside ONE transaction with explicit lock:

```sql
BEGIN;
LOCK TABLE articulos, existencias, inventarios_articulos, order_items, sale_items, purchase_items
  IN ACCESS EXCLUSIVE MODE;

-- 1. Add sku column nullable first (cheap, no rewrite)
ALTER TABLE articulos ADD COLUMN sku_new TEXT;

-- 2. Backfill sku = codigo for current data
UPDATE articulos SET sku_new = codigo;
ALTER TABLE articulos ALTER COLUMN sku_new SET NOT NULL;

-- 3. Pre-validate row counts match expectations
DO $$ BEGIN
  IF (SELECT count(*) FROM articulos WHERE sku_new IS NULL) > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete';
  END IF;
END $$;

-- 4. Add columns to children, backfill from existing FK
ALTER TABLE existencias ADD COLUMN sku TEXT;
UPDATE existencias e SET sku = a.sku_new FROM articulos a WHERE e.articulo_codigo = a.codigo;
-- Repeat for order_items, sale_items, purchase_items, inventarios_articulos

-- 5. Verify NO orphans and counts match
DO $$ BEGIN
  IF (SELECT count(*) FROM existencias WHERE sku IS NULL) > 0 THEN
    RAISE EXCEPTION 'Existencias backfill incomplete';
  END IF;
END $$;

-- 6. Drop old PK with CASCADE (drops child FKs)
ALTER TABLE articulos DROP CONSTRAINT articulos_pkey CASCADE;
ALTER TABLE articulos RENAME COLUMN sku_new TO sku;
ALTER TABLE articulos ADD PRIMARY KEY (sku);
ALTER TABLE articulos ALTER COLUMN codigo DROP NOT NULL;
CREATE INDEX idx_articulos_codigo ON articulos(codigo); -- non-unique grouper

-- 7. Re-add child FKs against sku
ALTER TABLE existencias ADD CONSTRAINT fk_existencias_articulo
  FOREIGN KEY (sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Repeat for all children
ALTER TABLE existencias DROP COLUMN articulo_codigo; -- only AFTER frontend deployed

COMMIT;
```

**Phase assignment:** Phase "PK Swap & Schema Cutover" (post-template-design, pre-cascade-engine). MUST be its own phase.

### P-02 — Trigger feedback loop: `articulos.unidades` SUM trigger + cascade SKU updates

**What goes wrong**
Quick task `260429-rec` installed a trigger that maintains `articulos.unidades = SUM(existencias.cantidad)`. When the cascade engine renames a SKU, it issues `UPDATE existencias SET sku = new_sku WHERE sku = old_sku`. With `ON UPDATE CASCADE` from articulos→existencias the cascade also fires the trigger, which recomputes unidades and writes back to articulos, multiplying rewrite cost by 10x or more.

**Warning signs**
- Migration runtime explodes from <1s (no trigger) to 30s+ (with trigger fanout)
- `pg_stat_user_functions` shows the trigger function called N² times instead of N
- `pg_trigger_depth() > 1` during the operation

**Prevention strategy**
Three layers of defense:

1. **Disable the trigger inside the cascade transaction**:
   ```sql
   BEGIN;
   ALTER TABLE existencias DISABLE TRIGGER trg_existencias_recalc_unidades;
   -- do cascade UPDATE
   UPDATE articulos a SET unidades = (SELECT COALESCE(SUM(e.cantidad), 0)
     FROM existencias e WHERE e.sku = a.sku);
   ALTER TABLE existencias ENABLE TRIGGER trg_existencias_recalc_unidades;
   COMMIT;
   ```
2. **Guard the trigger function with `pg_trigger_depth()`**:
   ```sql
   IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
   ```
3. **Set a session GUC that the cascade engine sets**:
   ```sql
   SET LOCAL gsd.skip_unidades_trigger = 'on';
   ```

**Phase assignment:** Phase "Cascade Engine + Audit History" — add integration test that asserts trigger fired exactly once per existencia.

### P-03 — Bulk UPDATE without batching: lock + replication lag + WAL bloat

**What goes wrong**
Cascade renames typically touch all rows for a `codigo` group. If a popular article has 10,000 historical line-items, a single UPDATE rewrites 10k rows in one MVCC version, holds row locks until commit, generates 10k WAL entries, and blocks any concurrent reader using `SELECT FOR UPDATE`. With multiple concurrent users editing different templates simultaneously, deadlocks become likely.

**Warning signs**
- p95 latency on `SELECT * FROM order_items WHERE order_id = ?` spikes during cascade
- `pg_stat_activity` shows blocked queries with `wait_event_type = Lock`
- WAL files grow rapidly

**Prevention strategy**
Batch the UPDATE in chunks of 500-1000 rows with explicit transactions per chunk:

```typescript
async function cascadeUpdateSku(oldSku: string, newSku: string) {
  for (const table of ['order_items', 'sale_items', 'purchase_items', 'existencias', 'inventarios_articulos']) {
    let updated = 0;
    do {
      updated = await db.execute(sql`
        WITH batch AS (
          SELECT ctid FROM ${table} WHERE sku = ${oldSku} LIMIT 500 FOR UPDATE SKIP LOCKED
        )
        UPDATE ${table} SET sku = ${newSku} FROM batch WHERE ${table}.ctid = batch.ctid
      `);
    } while (updated === 500);
  }
}
```

Acquire a Postgres advisory lock keyed by `codigo`:
```sql
SELECT pg_advisory_xact_lock(hashtext('cascade:' || $codigo));
```

**Phase assignment:** Phase "Cascade Engine + Audit History".

### P-04 — Slug collisions across catalogs

**What goes wrong**
SKU composition is `codigo + slug(atrib1) + slug(atrib2) + …`. If `talle.nombre = 'XL'` and `color.nombre = 'XL'` both slugify to `xl`, the SKU `ABC-xl-xl` is ambiguous on parse. Real cases:
- Two catalogs both have value `'2'` → `abc-2-2`
- `marca.nombre = 'AC/DC'` → `acdc`; `modelo.nombre = 'AC DC'` → `acdc` → collision
- Unicode: `'Café'` (NFC) vs `'Café'` (NFD) slugify to same `cafe` but catalog may already have one

**Warning signs**
- Two different attribute combinations produce the same `articulos.sku` → unique violation
- `SELECT codigo, COUNT(DISTINCT sku), COUNT(*) FROM articulos GROUP BY codigo HAVING COUNT(DISTINCT sku) < COUNT(*)` returns rows

**Prevention strategy**
1. **Slug uniqueness within catalog only**, not across catalogs.
2. **Validate SKU uniqueness at composition time, not at write**:
   ```typescript
   const candidateSku = composeSku(codigo, atribs);
   const exists = await db.select().from(articulos).where(eq(articulos.sku, candidateSku));
   if (exists.length > 0) throw new SkuCollisionError(candidateSku);
   ```
3. **Slug normalization MUST be deterministic and documented**: NFD normalize + strip diacritics + lowercase + replace non-alphanumeric with `-` + collapse `--+` → `-` + trim. Centralize in `packages/utils/slugify.ts`. Test cases: `'Café'`, `'AC/DC'`, `' XL '`, `'2 1/2'`, `'½'`, `'Niño'`, emoji.
4. **Reject slug duplicates within a single SKU composition**: detect same slug at 2+ positions and prefix (`talle-xl-color-xl`) or reject.
5. **CHECK constraint** on `articulo_*.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`.

**Phase assignment:** Phase "Catálogos de Atributos" — define slug rules. Phase "Sistema de Variantes UI" — enforce at composition.

### P-05 — Existing articulos.sku column has stale data

**What goes wrong**
The current schema already has `articulos.sku` (line 185). It's not the PK but it's there. In production, 11,316 rows likely have ARBITRARY values: NULL, copies of codigo, hand-typed garbage, or external ERP SKUs. The migration "set sku = codigo for null variant case" assumes the column is empty or trivially overwritable. If it has business meaning, overwriting is data loss.

**Warning signs**
- `SELECT count(*) FROM articulos WHERE sku IS NOT NULL AND sku != codigo` returns > 0
- `SELECT sku, count(*) FROM articulos GROUP BY sku HAVING count(*) > 1 AND sku IS NOT NULL` returns dupes
- Settings page or any module references `articulo.sku` separately from `articulo.codigo`

**Prevention strategy**
Pre-migration audit script:
```sql
SELECT
  count(*) FILTER (WHERE sku IS NULL) AS null_sku,
  count(*) FILTER (WHERE sku = codigo) AS sku_eq_codigo,
  count(*) FILTER (WHERE sku IS NOT NULL AND sku != codigo) AS sku_diff_codigo,
  count(*) FILTER (WHERE sku IS NOT NULL) - count(DISTINCT sku) FILTER (WHERE sku IS NOT NULL) AS sku_dupes
FROM articulos;
```
- If `sku_diff_codigo > 0`: triage with the user. Options: rename column to `sku_legacy`, ignore it, or merge meaning.
- If `sku_dupes > 0`: cannot promote to PK without resolving.

**Phase assignment:** Phase "PK Swap & Schema Cutover" — preflight check is task #1.

### P-06 — `codigo_barras` collateral damage when SKU regenerates

**What goes wrong**
Closed decision: `codigo_barras` is separate from SKU and DOES NOT regenerate. But: physical barcodes on shelf labels are scanned to look up an article. If the lookup currently does `WHERE codigo = scanned_value`, and after migration we have multiple rows with same codigo (variants), scanning a label gives N results — ambiguous. The barcode → variant mapping must be 1:1.

**Warning signs**
- After variant creation: `SELECT codigo_barras, count(*) FROM articulos WHERE codigo_barras IS NOT NULL GROUP BY codigo_barras HAVING count(*) > 1`
- Scanner endpoint returns ambiguous result

**Prevention strategy**
1. **Make `codigo_barras` column-level UNIQUE**: `CREATE UNIQUE INDEX articulos_codigo_barras_unique ON articulos(codigo_barras) WHERE codigo_barras IS NOT NULL;`
2. **When splitting an articulo into variants**: assign the original codigo_barras to ONE variant (the "default" or first one), set NULL on others. UI must enforce this.
3. **Document explicitly**: "Las variantes nuevas no heredan el código de barras."

**Phase assignment:** Phase "Sistema de Variantes UI".

## MODERATE PITFALLS

### P-07 — Drizzle treats `columna→ubicacion` rename as DROP + ADD (data loss)

**What goes wrong**
When you rename `existencias.columna` to `ubicacion` in `schema.ts` and run `pnpm db:generate`, Drizzle Kit's interactive prompt asks: "Is `ubicacion` created or renamed from `columna`?" If you (or CI without TTY) answer wrong, Drizzle generates `DROP COLUMN columna; ADD COLUMN ubicacion;` — the existing data evaporates.

**Warning signs**
- Generated migration SQL contains `DROP COLUMN columna` instead of `RENAME COLUMN columna TO ubicacion`
- Post-migration `SELECT count(*) FROM existencias WHERE ubicacion IS NOT NULL` is 0

**Prevention strategy**
1. **Never run db:generate non-interactively in CI for renames.**
2. **Hand-edit the generated migration file**: `ALTER TABLE existencias RENAME COLUMN columna TO ubicacion;` and verify SQL diff before committing.
3. **For inventarios_articulos.columna (integer) → ubicacion (text)**: type change. Two-step: add new `ubicacion` text column, backfill `ubicacion = COALESCE(columna::text, '0')`, drop `columna` in a SEPARATE deploy.
4. **Test the rollback path** by snapshotting pre-migration data.

**Phase assignment:** Phase "Rename `columna` → `ubicacion` + sectores transversales".

### P-08 — Sectores migration: JSONB columnas array → pivot table

**What goes wrong**
`inventarioSectores.columnas: jsonb('columnas').$type<string[]>().default([])` currently stores `["1", "2", "3"]` as JSONB. Migrating to pivot `sector_ubicaciones (sector_id, ubicacion text)` requires UNNESTing every existing row's array. Edge cases: empty array, NULL columnas, duplicates within array, whitespace, numeric vs text drift.

**Warning signs**
- Pivot table row count != expected `SUM(jsonb_array_length(columnas))`
- After migration, sector view shows different ubicaciones than pre-migration
- Unique violations during migration insert

**Prevention strategy**
Migration script with explicit deduplication:
```sql
INSERT INTO sector_ubicaciones (sector_id, ubicacion)
SELECT DISTINCT s.id, btrim(c::text, '" ')
FROM inventario_sectores s,
     jsonb_array_elements(COALESCE(s.columnas, '[]'::jsonb)) AS c
WHERE c IS NOT NULL AND btrim(c::text, '" ') <> '';
```
Pre-migration audit:
```sql
SELECT id, jsonb_array_length(columnas) AS n,
  jsonb_array_length(columnas) - cardinality(array(SELECT DISTINCT btrim(jsonb_array_elements_text(columnas), ' '))) AS dupes
FROM inventario_sectores;
```
Keep `inventario_sectores.columnas` JSONB column for 1 deploy as fallback.

**Phase assignment:** Phase "Rename `columna` → `ubicacion` + sectores transversales".

### P-09 — Existencias historical migration: sentinel `ubicacion=0` ambiguity

**What goes wrong**
Per design notes Q8, articulos without a matching `sanchez.articulos.columna` get `ubicacion='0'` (sentinel). Problem: if real ubicaciones include `'0'` (some shelves are labeled "0"), sentinel and real value collide. Also: when staff query "articles without assigned location", the query becomes fragile.

**Warning signs**
- Real ubicaciones table has a row with `nombre = '0'` and the sentinel is also `'0'`
- Staff complain "I assigned location 0 but it disappeared"

**Prevention strategy**
Use NULL or a clearly-non-real string:
- Best: `ubicacion = NULL` for "unknown", reserve `'SIN_UBICACION'` if NULL is awkward
- Document: never allow `'0'`, `''`, or NULL as a real ubicacion via CHECK constraint
- Migration script computes `ubicacion = NULLIF(s.columna, '')` instead of sentinel
- Add view `vw_existencias_sin_ubicacion AS SELECT * FROM existencias WHERE ubicacion IS NULL`

**Phase assignment:** Phase "Migración histórica de existencias" — revisit Q8 decision.

### P-10 — Common-data divergence between sibling variants

**What goes wrong**
Closed decision #8: data común duplicado entre filas con mismo `codigo`. Decision #9: app-level consistency. Risk: developer issues `UPDATE articulos SET marca = 'Bosch' WHERE sku = 'ABC-XL'` instead of `WHERE codigo = 'ABC'`. Now siblings disagree. Without DB constraints, this drifts silently. Multiplied by 30+ "common" fields and 4-8 variants per group.

**Warning signs**
- Audit query: `SELECT codigo, count(DISTINCT marca), count(DISTINCT modelo) FROM articulos GROUP BY codigo HAVING count(DISTINCT marca) > 1 OR count(DISTINCT modelo) > 1`
- UI shows different marcas in the same `codigo` group

**Prevention strategy**
Three layers:
1. **Backend service enforces "model fields" vs "variant fields"**: `articulosService.updateModel(codigo, modelFields)` issues `UPDATE WHERE codigo = ?` for canonical set; `updateVariant(sku, variantFields)` covers the rest.
2. **Trigger to propagate model fields automatically (optional)**:
   ```sql
   CREATE TRIGGER trg_propagate_model_fields
   AFTER UPDATE OF marca, modelo, categoria, ... ON articulos
   FOR EACH ROW WHEN (OLD.marca IS DISTINCT FROM NEW.marca OR ...)
   EXECUTE FUNCTION propagate_to_siblings();
   ```
3. **Periodic consistency-check job** that runs nightly and emits webhook on drift.

**Phase assignment:** Phase "Sistema de Variantes UI" (layer 1) + Phase "Cascade Engine" (layer 2 if chosen) + Phase "Tech Debt + Audit" (layer 3).

### P-11 — Slug + nombre denormalization trigger silent failure

**What goes wrong**
Q2 (gray area): denormalize `articulo_marcas.nombre` into `articulos.marca_nombre` via trigger. If the trigger has a bug, the UPDATE rolls back silently in some setups, or the trigger swallows exceptions, leaving denormalized fields stale.

**Warning signs**
- `SELECT a.marca_nombre, m.nombre FROM articulos a JOIN articulo_marcas m ON a.marca_id = m.id WHERE a.marca_nombre IS DISTINCT FROM m.nombre`
- Logs show `WARNING: trigger function ... failed`

**Prevention strategy**
1. **Avoid triggers for denormalization. Use a generated column or a view.**
2. **If trigger required, batch the catalog update properly** and `RAISE EXCEPTION` (don't swallow).
3. **Add a nightly drift check.**
4. **Per Q2, lean toward storing `id + slug` only on `articulos`, joining for nombre when needed.**

**Phase assignment:** Phase "Catálogos de Atributos" — decide trigger vs view vs join early.

### P-12 — Variant images: inheriting from `codigo` group when `codigo` itself becomes ambiguous

**What goes wrong**
`articulos.imagenesProducto` and `imagenesEtiqueta` are per-row arrays. When variants exist, do all variants inherit the same images, or each variant has its own? If inherited, copying paths across rows means deleting an image from variant A's array still leaves it in variant B's. Sharp pipeline writes WebP under codigo prefix; codigo→sku promotion may break image links.

**Warning signs**
- 404 on image URLs after migration
- File `/images/articulos/ABC/photo.webp` deleted while still in some `imagenesProducto` array
- Disk usage grows because old image paths never get GC'd

**Prevention strategy**
1. **Define ownership early.** Recommended: images live under `/images/articulos/<codigo>/` (group-level), and ALL variants of that codigo reference the same paths. Variant override = variant-specific subfolder.
2. **GC scan must check ALL rows referencing the path**.
3. **During codigo promotion, do not move physical files.**
4. **Image override per variant**: add `imagenes_producto_override TEXT[]` distinct from inherited.

**Phase assignment:** Phase "Sistema de Variantes UI".

### P-13 — Cascade idempotency: re-running same template change double-applies

**What goes wrong**
Cascade engine runs: "for each affected articulo, recompute SKU and update children". If re-run (network blip + retry), engine looks up rows that ALREADY have new SKU, computes "new" SKU on top, produces drift like `ABC-xl-rojo-rojo`. Or finds zero rows and silently succeeds, leaving partial child updates orphan.

**Warning signs**
- After re-running cascade, `articulos.sku` matches expected pattern but child tables have orphan SKUs
- `articulo_sku_history` has 2 entries for the same `articulo` within seconds

**Prevention strategy**
1. **Wrap entire cascade in ONE transaction.**
2. **Idempotent design**: build mapping `{old_sku: new_sku}` BEFORE writing. If `old_sku == new_sku` for all rows, no-op.
3. **Persist mapping in `articulo_sku_history` BEFORE the UPDATE** with status column.
4. **Use `articulos.sku_anterior` (per design decision 19) as the idempotency key**: if `sku_anterior IS NOT NULL` and `sku_anterior == old_sku_we're_about_to_set`, skip.

**Phase assignment:** Phase "Cascade Engine + Audit History".

### P-14 — TS↔DB drift after manual SQL migrations

**What goes wrong**
Q9: drift between `schema.ts` and DB. After running migration that includes hand-written SQL (cascade engine, P-01 cutover, P-08 pivot), running `pnpm db:generate` again will detect differences and propose to "fix" them — generating a migration that DROPs hand-written index and recreates it with the TS name, or worse, drops a CHECK constraint.

**Warning signs**
- Newly generated migration contains `DROP INDEX idx_articulos_marca; CREATE INDEX articulos_marca_idx ON ...;`
- New migration drops constraints you added by hand
- CI complains schema is "out of sync"

**Prevention strategy**
1. **Bring `schema.ts` to parity with DB after each major migration phase.**
2. **For things Drizzle can't model**: put them in `migrations/<n>_custom.sql` with the `--custom` flag. Document in `schema.ts` as comments.
3. **Pre-deploy guard**: CI step `pnpm db:generate --check` — fail if generation would produce a non-empty migration.
4. **Snapshot `pg_dump --schema-only` after each prod migration.**

**Phase assignment:** Phase "Tech Debt + TS Drift Cleanup".

### P-15 — N+1 queries on grouped variant lists

**What goes wrong**
The list view shows articles grouped by `codigo` with variant counts. Naive TanStack Query implementation: fetch list of codigos paginated → for each codigo, fetch variants → for each variant, fetch attributes via FK joins. With 11,316 articulos and pagination 50/page, page load fires hundreds of queries.

**Warning signs**
- Network tab shows 50+ requests on list page load
- Backend logs show a burst of identical query shapes
- p95 list latency > 1s

**Prevention strategy**
1. **Backend endpoint returns grouped data in ONE query** with `array_agg` or `jsonb_agg`:
   ```sql
   SELECT a.codigo,
     jsonb_agg(jsonb_build_object('sku', a.sku, 'talle', t.nombre, 'color', c.nombre, 'cantidad', e.cantidad)) AS variants
   FROM articulos a
   LEFT JOIN articulo_talles t ON a.talle_id = t.id
   LEFT JOIN articulo_colores c ON a.color_id = c.id
   LEFT JOIN existencias e ON e.sku = a.sku
   GROUP BY a.codigo
   ORDER BY a.codigo
   LIMIT 50;
   ```
2. **Use Drizzle's `with` query builder for nested fetches.**
3. **TanStack Query enables `keepPreviousData` + cursor pagination.**
4. **Add `EXPLAIN ANALYZE`** to confirm Index Scan, not Seq Scan.

**Phase assignment:** Phase "Sistema de Variantes UI".

## MINOR PITFALLS

### P-16 — Audit history bloat: `articulo_sku_history` unbounded growth

**What goes wrong**
Append-only history table grows without bound. With each schema change touching 1k-10k articulos, after 50 changes you have 500k rows. Queries on history become slow.

**Prevention strategy**
- Range partitioning by month: `PARTITION BY RANGE (created_at)` from day 1.
- Retention policy: keep 12-24 months online, archive older partitions.
- Default any history query to `WHERE created_at > now() - interval '90 days'`.
- Index on `(articulo_codigo, created_at DESC)`.

**Phase assignment:** Phase "Cascade Engine + Audit History".

### P-17 — `nombre_auto` flag interaction with manual edits

**What goes wrong**
Articulo has `nombre_auto = true`. User manually edits `nombre`. On next save, the trigger/service regenerates `nombre`, overwriting the manual edit. User confused.

**Prevention strategy**
- When user edits `nombre` in UI, automatically flip `nombre_auto = false`.
- Show explicit toggle: "Generar nombre automáticamente" with help text.
- Backend service rejects update where `nombre_auto = true` AND `nombre` is in payload.

**Phase assignment:** Phase "Sistema de Variantes UI".

### P-18 — Preview accuracy under concurrent edits

**What goes wrong**
Admin opens template editor, sees "preview: 3,450 SKUs will change". Walks away. Another admin creates 200 new articulos. First admin clicks Apply. Real cascade hits 3,650 rows — preview was lying.

**Prevention strategy**
- Take a `LOCK TABLE articulos IN SHARE MODE` during preview AND application, OR
- Show preview snapshot timestamp and warn if > 5 minutes old, OR
- Use optimistic concurrency: include `articulos` table version in preview; reject Apply if differs.

**Phase assignment:** Phase "Cascade Engine + Audit History".

### P-19 — Webhook payload shape change on SKU promotion

**What goes wrong**
Webhooks deliver `{ articulo: { codigo, sku, ... } }`. After SKU becomes universal id, downstream consumers may expect `id` field, or may key off `codigo`. Existing subscribers break silently.

**Prevention strategy**
- Bump webhook payload version: `{ event: 'articulo.created', version: 2, articulo: {...} }`.
- Document migration for subscribers in Settings page.
- Send "v1.3 cutover notice" delivery to all active webhooks before cutover.

**Phase assignment:** Phase "PK Swap & Schema Cutover".

### P-20 — `numeric()` retrofit changes JS number type to string

**What goes wrong**
Q10 + design: `doublePrecision` → `numeric()` for monetary fields. Drizzle returns `numeric` as STRING (not number) by default. Existing TS code that does `precio * cantidad` silently becomes `'10.5' * 3` → coerced to NaN or wrong arithmetic.

**Prevention strategy**
- Audit ALL uses: `grep -rE '(precio|costo|subtotal|total|tax|discount)\s*[\*\+\-]'`.
- Choose: keep numeric+string and explicitly parse, or stay with doublePrecision, or use custom Drizzle type with `transform`.
- Add unit tests for arithmetic on monetary fields BEFORE the type change.

**Phase assignment:** Phase "Tech Debt + TS Drift Cleanup".

## Phase-Specific Warnings

| Phase | Likely Pitfalls | Mitigation Tag |
|---|---|---|
| Catálogos de Atributos | P-04, P-11 | Define slug rules + denorm strategy first |
| Templates ABM | P-13, P-17, P-18 | Idempotency + auto/manual + concurrency |
| PK Swap & Schema Cutover | P-01, P-02, P-05, P-19 | Multi-step transaction + trigger disable + audit |
| Sistema de Variantes UI | P-04, P-06, P-10, P-12, P-15 | Composition validation + image ownership + grouped query |
| Cascade Engine + Audit History | P-02, P-03, P-13, P-16, P-18 | Trigger guard + batching + idempotency + partition |
| Rename columna→ubicacion + Sectores | P-07, P-08 | Hand-edit migration + dedup pivot insert |
| Migración histórica existencias | P-09 | Reconsider sentinel `'0'` |
| Tech Debt + TS Drift Cleanup | P-14, P-20 | Schema parity + arithmetic audit |

## Quality Gate Self-Check

- [x] Each pitfall has Warning Sign + Prevention Strategy + Phase Assignment
- [x] Prevention strategies include concrete SQL/TS code patterns where applicable
- [x] Integration pitfalls covered: P-01, P-02, P-05, P-06, P-12, P-19
- [x] Pitfalls specific to variants + SKU + cascade migrations
- [x] All 15 focus areas from the prompt addressed

**Focus area coverage:**
1. Slug collisions → P-04
2. Cascade orphans → P-01
3. Live migration risks → P-01, P-03, P-07
4. Trigger feedback loops → P-02
5. Template vs row inconsistency → P-13, P-18
6. Image override edge cases → P-12
7. Bulk SKU regen + codigo_barras → P-06
8. Slug+nombre denorm sync → P-11
9. N+1 queries → P-15
10. Common-data divergence → P-10
11. Stock reconciliation sentinel → P-09
12. Sectores pivot migration → P-08
13. TS schema drift → P-14
14. Audit history bloat → P-16
15. Idempotency in cascade → P-13

Plus extras: P-05 (existing sku column), P-17 (nombre_auto interaction), P-19 (webhook contract), P-20 (numeric retrofit JS type).

**Open questions surfacing for `/gsd-discuss-phase`**
- P-09 sentinel: confirm; proposal is NULL or `'SIN_UBICACION'` not `'0'`.
- P-10 propagation: trigger vs service-only enforcement?
- P-11 denormalization: trigger vs view vs no-denorm?
- P-12 image ownership: codigo-prefix vs sku-prefix?

## Sources

- [How to change the primary key of an existing PostgreSQL table — zauner.nllk.net](https://zauner.nllk.net/post/0036-change-primary-key-of-existing-postgresql-table/)
- [PostgreSQL Foreign Key — DbSchema](https://dbschema.com/blog/postgresql/foreign-keys/)
- [Trigger recursion in PostgreSQL — CYBERTEC](https://www.cybertec-postgresql.com/en/dealing-with-trigger-recursion-in-postgresql/)
- [PostgreSQL Documentation: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL: Documentation: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Deadlocks while Bulk Updating in PostgreSQL — Medium](https://medium.com/@harshiljani2002/deadlocks-while-bulk-updating-in-postgresql-4af4161b7ff8)
- [Zero-Downtime Postgres Migrations with Drizzle ORM — DEV](https://dev.to/whoffagents/drizzle-orm-migrations-in-production-zero-downtime-schema-changes-e71)
- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)
- [drizzle-kit generate: migration.sql is missing renamed column's changes (#3826)](https://github.com/drizzle-team/drizzle-orm/issues/3826)
- [The Definitive Guide to Slugify Best Practices — Sluggenius](https://sluggenius.com/blog/slugify-best-practices)
- [UAX #15: Unicode Normalization Forms](https://unicode.org/reports/tr15/)
- [PostgreSQL partitioning for event/audit tables — AppMaster](https://appmaster.io/blog/postgresql-partitioning-event-audit-tables)
- [Audit logging with Postgres partitioning — Elephas](https://elephas.io/audit-logging-with-postgres-partitioning/)
- [Denormalization Techniques in PostgreSQL — educative.io](https://www.educative.io/courses/the-art-of-postgresql/denormalization-with-postgresql)
- [When to Use ON UPDATE CASCADE in PostgreSQL — GeeksforGeeks](https://www.geeksforgeeks.org/postgresql/when-to-use-on-update-cascade-in-postgresql/)

**Confidence assessment**
- Postgres trigger semantics, FK cascade ordering, advisory locks, partitioning: **HIGH**
- Drizzle Kit rename detection bug: **HIGH** (verified open issue drizzle-team/drizzle-orm#3826)
- Slug normalization with NFD: **HIGH** (Unicode UAX #15)
- Project-specific (existing trigger from quick task 260429-rec, image pipeline, webhook payload): **MEDIUM**
