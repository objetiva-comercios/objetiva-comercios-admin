# Domain Pitfalls

**Domain:** Core data model replacement (products -> articulos) in NestJS + Drizzle + Next.js monorepo
**Researched:** 2026-03-05
**Milestone:** v1.1 -- Modelo Articulos + Inventario

## Critical Pitfalls

Mistakes that cause data loss, broken migrations, or full rewrites.

### Pitfall 1: Drizzle `generate` Treats Table Replacement as Drop + Create (Data Loss)

**What goes wrong:** Drizzle Kit's `generate` command compares the current schema file against the migration snapshot. If you remove the `products` table definition and add an `articulos` table, Drizzle generates `DROP TABLE products CASCADE` followed by `CREATE TABLE articulos`. This destroys all existing order_items, sale_items, and purchase_items data because of `CASCADE` on the foreign keys.

**Why it happens:** Drizzle Kit has no concept of "rename table" or "replace table." It performs a structural diff. Removing a table definition = drop it. Adding a new one = create it. There is no interactive prompt to detect renames.

**Consequences:** All historical order/sale/purchase line items are deleted. The `onDelete: 'cascade'` on order_items and sale_items references to products means PostgreSQL cascades the drop through every child table. Even the `onDelete: 'restrict'` on purchase_items won't save you -- `DROP TABLE CASCADE` overrides restrict constraints at the DDL level.

**Prevention:**

1. Never remove the `products` table from schema.ts in the same migration as adding `articulos`.
2. Write the migration in manual SQL phases:
   - Phase A: Create new tables (articulos, existencias, depositos, inventarios) alongside existing tables.
   - Phase B: Populate articulos from products data, establishing codigo values.
   - Phase C: Add `articulo_codigo` columns to items tables, populate from mapping, add new FKs, drop old `product_id` FKs.
   - Phase D: Only after all FKs point to articulos, drop the products table.
3. Use `drizzle-kit generate` for the final schema state, but hand-edit the generated SQL to follow this phased approach.

**Detection:** Run `drizzle-kit generate` and inspect the SQL before applying. Any `DROP TABLE` statement is a red flag.

**Confidence:** HIGH -- verified against [Drizzle migration docs](https://orm.drizzle.team/docs/migrations) and [column rename bug #3826](https://github.com/drizzle-team/drizzle-orm/issues/3826).

**Phase:** Must be addressed first. Database migration before any service/API changes.

---

### Pitfall 2: Foreign Key Type Mismatch -- integer productId Cannot Map to text codigo

**What goes wrong:** The current `order_items.productId`, `sale_items.productId`, and `purchase_items.productId` are `integer` referencing `products.id` (serial). The new `articulos` table uses `codigo` (text) as PK. You cannot `ALTER COLUMN product_id TYPE text` and repoint the FK -- PostgreSQL throws `ERROR: column "product_id" cannot be cast automatically to type text`, and even with `USING`, the integer values ("42") are meaningless as articulo codigos.

**Why it happens:** This is a semantic change from surrogate key (auto-increment integer) to natural key (business code). There is no automatic mapping between `products.id = 42` and `articulos.codigo = 'ARROZ-001'`.

**Consequences:** If you force-cast with `USING product_id::text`, all FK values become string integers ("42") that don't match any articulo codigo. The FK constraint creation fails, or worse, it succeeds with orphaned references.

**Prevention:**

1. Add a new column `articulo_codigo text` to each items table alongside the existing `product_id`.
2. Use the existing `products.sku` as a bridge -- the current schema stores SKU on both products and all items tables. Use this to map: `UPDATE order_items SET articulo_codigo = (SELECT a.codigo FROM articulos a WHERE a.codigo = order_items.sku)`.
3. Add FK constraint on `articulo_codigo -> articulos.codigo`.
4. Drop old `product_id` column and its FK.
5. Optionally rename `articulo_codigo` to the final column name.

**Detection:** Any migration containing `ALTER COLUMN ... TYPE text` on a column currently holding integer FK values.

**Confidence:** HIGH -- standard PostgreSQL behavior.

**Phase:** Database migration phase. Must complete before API layer changes.

---

### Pitfall 3: `onDelete: 'restrict'` on Items Tables Blocks Products Deletion During Migration

**What goes wrong:** The current schema has `onDelete: 'restrict'` on `sale_items.productId` and `purchase_items.productId` (lines 140-141, 190-191 in schema.ts). During migration, you cannot drop or delete products that are referenced by existing sale/purchase records. If the migration strategy involves deleting products after creating articulos, it fails for any product with historical transactions.

**Why it happens:** `restrict` is correct for normal operations (prevent deleting a product that has sales). But during a schema migration, this constraint blocks the cleanup step.

**Consequences:** Migration script hangs or fails at the "drop old products" step. Partial migration leaves database in inconsistent state with both old and new tables coexisting permanently.

**Prevention:**

1. Never delete individual products during migration. The strategy is: migrate all FKs away from products FIRST, then drop the entire products table.
2. Migration order must be: create articulos -> populate articulos -> migrate all item FKs to articulos -> verify no remaining FK references to products -> drop products table.
3. Add a verification query before dropping: `SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND ... references products`.

**Detection:** Try `DROP TABLE products` in a test database with existing sale_items data. PostgreSQL will refuse.

**Confidence:** HIGH -- directly observable in schema.ts.

**Phase:** Database migration phase. Critical ordering constraint.

---

### Pitfall 4: Seed Script idMap Pattern Breaks With Text PKs

**What goes wrong:** The current seed.ts builds `idMap: Map<number, number>` to map generator IDs to real database IDs (line 48-51). Every items table uses `idMap.get(item.productId)!` to resolve the FK. When articulos uses `codigo` (text) as PK, this entire mapping pattern breaks -- `idMap.get()` returns `undefined`, and the non-null assertion `!` causes silent `undefined` insertion.

**Why it happens:** The seed was designed for auto-increment integer PKs where the DB assigns the ID. Natural text keys are known before insertion, so the mapping pattern is unnecessary.

**Consequences:** `pnpm db:seed` crashes or inserts null/undefined values. Local development environment is broken. Any CI pipeline that seeds before tests fails.

**Prevention:**

1. Rewrite generators to produce `codigo` values directly (e.g., `ARROZ-001`, `LECHE-002`).
2. Remove the `idMap` pattern -- articulo codigos are deterministic, not DB-assigned.
3. Items tables reference `articuloCodigo` directly from generator output.
4. Update all 5 generators: product.generator -> articulo.generator, inventory.generator -> existencias.generator, plus order/sale/purchase generators.
5. The TRUNCATE statement must also be updated to reference new table names.

**Detection:** Any seed script using `Map<number, number>` for ID mapping after switching to text PKs.

**Confidence:** HIGH -- directly observable in seed.ts.

**Phase:** Must be rewritten alongside schema migration. Cannot seed new model with old script.

---

### Pitfall 5: `ParseIntPipe` on Controller Routes Rejects Text PKs

**What goes wrong:** The products controller uses `@Param('id', ParseIntPipe) id: number` (line 39 of products.controller.ts). When articulos uses `codigo` (text), routes like `GET /articulos/ARROZ-001` return 400 Bad Request because `ParseIntPipe` rejects non-numeric strings.

**Why it happens:** NestJS `ParseIntPipe` is designed for integer parameters. The PK type change requires removing this pipe.

**Consequences:** Every articulos CRUD route returns 400. The entire API is broken. Easy to miss because the controller compiles fine -- the error is runtime-only.

**Prevention:**

1. Remove `ParseIntPipe` from the articulos controller entirely.
2. Use `@Param('codigo') codigo: string` with no pipe, or add a custom validation pipe for codigo format.
3. Update service methods: `findOne(id: number)` becomes `findOne(codigo: string)`.
4. Update all Drizzle queries: `eq(products.id, id)` becomes `eq(articulos.codigo, codigo)`.
5. Search for `ParseIntPipe` across all controllers to catch any other affected routes.

**Detection:** Any controller route parameter that uses `ParseIntPipe` but receives a text PK.

**Confidence:** HIGH -- directly observable in products.controller.ts.

**Phase:** API layer phase, after database migration.

## Moderate Pitfalls

### Pitfall 6: `doublePrecision` to `numeric(10,2)` Migration Breaks All Arithmetic

**What goes wrong:** PROJECT.md flags `doublePrecision` as tech debt for monetary fields. If v1.1 also switches to `numeric(10,2)`, Drizzle's `numeric()` type returns **strings** in TypeScript, not numbers. Every service, controller, DTO, and frontend component that does arithmetic on price/cost/total fields produces `NaN`.

**Why it happens:** PostgreSQL `numeric` has arbitrary precision that can't fit in JavaScript's float64. The postgres-js driver returns strings to preserve precision. Drizzle passes them through.

**Consequences:** Dashboard KPIs show `NaN`. Sale totals calculate as `NaN`. Frontend price displays crash. The bug is insidious -- TypeScript won't catch it because the Drizzle inferred type changes from `number` to `string`, but existing code was written expecting `number`.

**Prevention:** Do NOT bundle the numeric migration with the articulos migration. Keep `doublePrecision` for v1.1. The precision loss (rounding at ~$10M) is irrelevant for a small commercial operation. Address numeric precision in a future milestone as a dedicated refactor.

**Detection:** Search codebase for arithmetic on price/cost/total fields. Currently 6 tables use `doublePrecision` for money across ~20 columns total.

**Confidence:** HIGH -- verified via [Drizzle issue #1042](https://github.com/drizzle-team/drizzle-orm/issues/1042) and [Drizzle PostgreSQL column types docs](https://orm.drizzle.team/docs/column-types/pg).

**Phase:** Defer to v1.2 or later. Do NOT include in v1.1.

---

### Pitfall 7: Dashboard Service Hardcodes `productId: number` in 23+ Files

**What goes wrong:** The dashboard service, web types, and mobile types all define `LowStockItem` with `productId: number`. After migration, this must change to reference articulo codigo (string). If only the backend schema changes but interfaces don't, the frontend receives fields with wrong types or undefined values.

**Why it happens:** Types are defined independently in 3 places: backend interfaces (dashboard.service.ts), web types (apps/web/src/types/\*.ts), and mobile types (apps/mobile/src/types/index.ts). During a multi-phase migration, one gets updated while others lag.

**Consequences:** Frontend displays "undefined" for product references. Dashboard low-stock alerts component breaks. TypeScript doesn't catch it if interfaces are manually maintained rather than derived from schema.

**Prevention:**

1. Run `grep -r "productId" apps/` to get the full list of affected files (currently 23+ .ts files, 5+ .tsx files).
2. Update in strict dependency order: schema -> service -> controller -> shared types -> web types -> mobile types.
3. Update all 3 type definition locations in the same commit, never partially.
4. Consider moving shared API response types to `packages/types/` to enforce a single source of truth.

**Detection:** `grep -rn "productId\|product_id" apps/` shows all locations. Track the count as your migration progress metric.

**Confidence:** HIGH -- directly observable across codebase.

**Phase:** Must be coordinated across API + frontend phases. Update all in one sweep.

---

### Pitfall 8: Three Separate Type Systems Drift During Migration

**What goes wrong:** The `Product` interface exists in 3 independent definitions: Drizzle's inferred `typeof products.$inferSelect` (backend), `apps/web/src/types/*.ts` (web), and `apps/mobile/src/types/index.ts` (mobile). When the backend schema changes to `articulos`, the manually-maintained web and mobile types become stale.

**Why it happens:** The project already has "Web type drift" flagged as medium tech debt from v1.0. The articulos migration makes this debt critical -- it's no longer missing fields, it's entirely wrong entity names and PK types.

**Consequences:** TypeScript compiles fine in each app individually, but the API contract is broken at runtime. Web sends `productId: number`, backend expects `articuloCodigo: string`.

**Prevention:**

1. Before starting the migration, consolidate types into `packages/types/`.
2. Export shared API interfaces from one location; import in web and mobile.
3. If keeping separate types: create a checklist of every type file that references `Product`, `OrderItem`, `SaleItem`, `PurchaseItem`, `Inventory`, `LowStockItem`.
4. Add a CI type-check that catches mismatches.

**Detection:** Compare `Product` interface definition across the three locations after any schema change.

**Confidence:** HIGH -- type drift is already documented as v1.0 tech debt.

**Phase:** Types consolidation should be Phase 0 (pre-migration prep) or the first sub-task.

---

### Pitfall 9: JSONB Columns Double-Serialize with postgres-js Driver

**What goes wrong:** If inventarios model uses JSONB columns (for sector configuration, device metadata, count results), the postgres-js driver has a [known issue](https://github.com/drizzle-team/drizzle-orm/issues/724) where objects get double-serialized. You insert `{ sector: "A" }` and PostgreSQL stores `"{\"sector\":\"A\"}"` (a JSON string wrapping JSON, not a JSON object).

**Why it happens:** Both postgres-js and Drizzle serialize the value, resulting in double serialization.

**Prevention:**

1. After inserting a JSONB value, read it back and verify it's an object, not a string.
2. Use `.$type<YourInterface>()` on all JSONB columns for type safety: `jsonb('config').$type<SectorConfig>()`.
3. Write a test that roundtrips a JSONB insert/select.
4. If double-serialization occurs, check your postgres-js version -- the issue may be fixed in recent versions.

**Detection:** Query the JSONB column with `psql` directly: `SELECT pg_typeof(config_column) FROM inventarios LIMIT 1`. If it returns `text` instead of `jsonb`, double-serialization occurred.

**Confidence:** MEDIUM -- bug is documented but may be version-dependent.

**Phase:** Relevant when implementing inventarios (likely Phase 2 or 3 of the milestone).

---

### Pitfall 10: Text Array Columns Need sql`` Default Syntax

**What goes wrong:** If articulos or inventarios use `text().array()` columns (tags, deposito codes), using `.default([])` generates invalid SQL. PostgreSQL rejects it.

**Why it happens:** Drizzle's `.default([])` generates `DEFAULT '[]'` which is JSON syntax, not PostgreSQL array syntax.

**Prevention:**

1. Use SQL template literal: `text('tags').array().default(sql\`'{}'\`\`::text[]')`.
2. For non-empty defaults: `sql\`ARRAY['val1','val2']::text[]\``.
3. Never use `.default([])` for array columns.

**Detection:** `db:push` or `db:migrate` fails with a syntax error on the DEFAULT clause.

**Confidence:** HIGH -- documented in [Drizzle empty array default guide](https://orm.drizzle.team/docs/guides/empty-array-default-value).

**Phase:** Schema definition phase, when creating new tables.

## Minor Pitfalls

### Pitfall 11: Frontend API URLs Change (`/products` -> `/articulos`)

**What goes wrong:** Frontend services hardcode API paths like `/api/products`. After the backend controller becomes `@Controller('articulos')`, all frontend fetch calls 404.

**Prevention:**

1. Search all frontend code for `/products` and `/inventory` API paths.
2. Update web and mobile API service files alongside backend controller rename.
3. Consider temporary aliases (both endpoints work) if deploying incrementally.

**Confidence:** HIGH.

**Phase:** Frontend update phase, immediately after API deployment.

---

### Pitfall 12: TanStack Table Column Definitions Reference Old Field Names

**What goes wrong:** Web tables use TanStack Table with column accessors referencing `product.id`, `product.name`, `product.sku`. These must change to `articulo.codigo`, `articulo.descripcion`, etc. Sort field mappings in the backend `colMap` (products.service.ts lines 55-66) also break.

**Prevention:**

1. Update column definitions in all table components under `apps/web/src/components/tables/`.
2. Update the `colMap` in the new articulos service.
3. Test that sorting, filtering, and search work after renaming.

**Confidence:** HIGH.

**Phase:** Frontend update phase.

---

### Pitfall 13: Mobile TanStack Query Cache Holds Stale Product Data

**What goes wrong:** Mobile app users who had the app open before migration see cached product data with old schema. Interactions with cached items fail because endpoints/IDs changed.

**Prevention:**

1. Invalidate all queries on app resume after deployment.
2. Add error boundary handling for 404s on stale references.
3. Bump API version or add a schema version check.

**Confidence:** MEDIUM -- depends on cache TTL configuration.

**Phase:** Mobile update phase, coordinated with backend deployment.

---

### Pitfall 14: Dashboard `totalProducts` KPI Name Is Misleading After Migration

**What goes wrong:** `DashboardStats.totalProducts` refers to the count of products. After migration, this should be `totalArticulos`. If only the backend query changes but the field name stays `totalProducts`, the API contract is technically correct but semantically confusing. Worse, if the frontend displays "Productos: 500" when the label should say "Articulos: 500", users see incorrect terminology.

**Prevention:**

1. Rename the field in the API response: `totalProducts` -> `totalArticulos`.
2. Update the `DashboardStats` interface in all 3 type locations.
3. Update frontend display labels.

**Confidence:** HIGH.

**Phase:** API + frontend update phase.

## Phase-Specific Warnings

| Phase Topic               | Likely Pitfall                                                                   | Mitigation                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Database schema migration | #1 (drop+create data loss), #2 (FK type mismatch), #3 (restrict blocks deletion) | Hand-write migration SQL in phases. Never auto-generate destructive migrations. Test on a DB copy first. |
| Seed data rewrite         | #4 (idMap breaks with text PK)                                                   | Rewrite generators to produce codigos. Remove idMap pattern entirely.                                    |
| New table definitions     | #10 (array defaults), #9 (JSONB double-serialize)                                | Use SQL template literals for defaults. Test JSONB roundtrip before building features on top.            |
| Backend API layer         | #5 (ParseIntPipe rejects text), #7 (hardcoded productId interfaces)              | Remove ParseIntPipe, update all service signatures from `id: number` to `codigo: string`.                |
| Types alignment           | #8 (3 type systems drift)                                                        | Update all 3 apps' types in same commit. Consider consolidating to packages/types/.                      |
| Dashboard KPIs            | #7 (productId in LowStockItem), #14 (totalProducts naming)                       | Update dashboard interfaces, rename KPI fields, update low-stock-alerts component.                       |
| Frontend update           | #11 (URL changes), #12 (TanStack columns)                                        | Search-and-replace API paths. Update all column accessors and sort maps.                                 |
| Mobile deployment         | #13 (stale cache)                                                                | Invalidate TanStack Query cache on app resume post-deploy.                                               |
| Money type decision       | #6 (doublePrecision -> numeric)                                                  | Defer to v1.2. Do NOT bundle with articulos migration.                                                   |

## Migration Order Recommendation

Based on pitfall dependencies, the safest order is:

1. **Types consolidation** (pre-migration) -- Move shared types to `packages/types/` to avoid 3-way drift during migration.
2. **Schema creation** -- Create articulos, existencias, depositos, inventarios tables alongside existing tables. No drops, no renames. Coexistence.
3. **Data bridge** -- Populate new tables from existing data. Use `products.sku` as the bridge to `articulos.codigo`.
4. **FK migration** -- Add new FK columns to items tables, populate from mapping, add constraints, drop old FK columns.
5. **Backend API** -- New controllers/services for articulos/existencias/inventarios. Keep products controller alive temporarily.
6. **Frontend update** -- Switch web and mobile to new endpoints and field names.
7. **Cleanup** -- Drop products table, old controllers, old types. Only after everything works end-to-end.

## Sources

- [Drizzle ORM migrations documentation](https://orm.drizzle.team/docs/migrations)
- [Drizzle column rename bug #3826](https://github.com/drizzle-team/drizzle-orm/issues/3826)
- [Drizzle numeric returns strings #1042](https://github.com/drizzle-team/drizzle-orm/issues/1042)
- [Drizzle JSONB double-serialization #724](https://github.com/drizzle-team/drizzle-orm/issues/724)
- [Drizzle empty array default guide](https://orm.drizzle.team/docs/guides/empty-array-default-value)
- [Drizzle PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg)
- [PostgreSQL change primary key strategy](https://gist.github.com/scaryguy/6269293)
- [Migrating foreign keys in PostgreSQL](https://thomas.skowron.eu/blog/migrating-foreign-keys-in-postgresql/)
- [NestJS + Drizzle money storage](https://wanago.io/2024/11/04/api-nestjs-drizzle-orm-postgresql-money/)
- [PostgreSQL arrays with Drizzle ORM](https://wanago.io/2024/07/08/api-nestjs-postgresql-arrays-drizzle-orm/)
- Codebase analysis: `apps/backend/src/db/schema.ts`, `seed.ts`, `products.service.ts`, `products.controller.ts`, `dashboard.service.ts`, `apps/web/src/types/*.ts`, `apps/mobile/src/types/index.ts`
