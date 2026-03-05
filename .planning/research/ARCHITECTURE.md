# Architecture Patterns

**Domain:** Data model migration -- articulos/existencias/inventarios replacing products/inventory
**Researched:** 2026-03-05
**Confidence:** HIGH (based on direct codebase analysis, established Drizzle/NestJS patterns)

## Current Architecture Snapshot

### What Exists Today

| Layer     | Component                                                                | Key Files                                                 | Products/Inventory Coupling                                          |
| --------- | ------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------- |
| DB Schema | `products` table (PK: `id serial`)                                       | `apps/backend/src/db/schema.ts`                           | Central -- 3 FK tables reference `products.id`                       |
| DB Schema | `inventory` table (FK: `productId`)                                      | same                                                      | 1:1 with products via `productId`                                    |
| DB Schema | `orderItems.productId`, `saleItems.productId`, `purchaseItems.productId` | same                                                      | Integer FK to `products.id`                                          |
| Backend   | `ProductsModule` (CRUD + stats + categories)                             | `apps/backend/src/modules/products/`                      | Self-contained                                                       |
| Backend   | `InventoryModule` (list + stats + low-stock)                             | `apps/backend/src/modules/inventory/`                     | References `inventory` table only                                    |
| Backend   | `DashboardService`                                                       | `apps/backend/src/modules/dashboard/dashboard.service.ts` | Injects `ProductsService` + `InventoryService`                       |
| Backend   | `SalesService`, `OrdersService`, `PurchasesService`                      | respective modules                                        | Read/write `*Items` tables with `productId` integer FK               |
| Web API   | `fetchProducts()`, `fetchInventory()`                                    | `apps/web/src/lib/api.ts`                                 | Hit `/api/products`, `/api/inventory`                                |
| Web Types | `Product` (id: number), `Inventory` (productId: number)                  | `apps/web/src/types/`                                     | Numeric IDs throughout                                               |
| Web Pages | `articles/page.tsx` (calls fetchProducts), `inventory/page.tsx`          | `apps/web/src/app/(dashboard)/`                           | Already labeled "Articulos" in UI but uses products backend          |
| Mobile    | `Articles.tsx`, `Inventory.tsx` pages                                    | `apps/mobile/src/pages/`                                  | Same API contracts                                                   |
| Shared    | `packages/types/`                                                        | Zod schemas, `AppRole`                                    | No product/inventory types here (they live in schema.ts + web types) |
| Seed      | Generators for products, inventory, orders, sales, purchases             | `apps/backend/src/db/seed.ts` + `generators/`             | All use numeric `products.id` mapping                                |

### Current FK Dependency Graph

```
products (PK: id serial)
  |
  +-- inventory.productId (1:1, ON DELETE CASCADE)
  +-- orderItems.productId (ON DELETE RESTRICT)
  +-- saleItems.productId (ON DELETE RESTRICT)
  +-- purchaseItems.productId (ON DELETE RESTRICT)
```

All downstream tables use `integer` FK to `products.id`. This is the primary migration challenge.

---

## Recommended Architecture

### New Data Model

Replace `products` + `inventory` with 4 new domain tables and modify 3 existing item tables.

#### New Tables

```
articulos (PK: codigo text)
  |
  +-- existencias (articulo_codigo + deposito_id = composite unique)
  |     +-- depositos (PK: id serial)
  |
  +-- inventarios (PK: id serial) -- periodic physical count events
        +-- inventarios_articulos (inventario_id + articulo_codigo)
        +-- inventario_sectores (inventario_id + sector)
        +-- dispositivos_moviles (inventario_id + device_id)
```

#### Modified Tables

```
orderItems.productId (integer) --> orderItems.articuloCodigo (text FK)
saleItems.productId (integer) --> saleItems.articuloCodigo (text FK)
purchaseItems.productId (integer) --> purchaseItems.articuloCodigo (text FK)
```

### Schema Design (Drizzle)

```typescript
// ---- NEW TABLES ----

export const articulos = pgTable(
  'articulos',
  {
    codigo: varchar('codigo', { length: 50 }).primaryKey(),
    descripcion: varchar('descripcion', { length: 255 }).notNull(),
    descripcionCorta: varchar('descripcion_corta', { length: 100 }),
    marca: varchar('marca', { length: 100 }),
    modelo: varchar('modelo', { length: 100 }),
    unidadMedida: varchar('unidad_medida', { length: 20 }).notNull().default('PZ'),
    precioVenta: doublePrecision('precio_venta').notNull(),
    costo: doublePrecision('costo').notNull(),
    codigoBarras: varchar('codigo_barras', { length: 50 }),
    categoria: varchar('categoria', { length: 100 }),
    subcategoria: varchar('subcategoria', { length: 100 }),
    impuesto: doublePrecision('impuesto').default(0.16),
    activo: boolean('activo').notNull().default(true),
    imagenUrl: text('imagen_url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('articulos_categoria_idx').on(table.categoria),
    index('articulos_activo_idx').on(table.activo),
    index('articulos_codigo_barras_idx').on(table.codigoBarras),
  ]
)

export const depositos = pgTable('depositos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  direccion: text('direccion'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const existencias = pgTable(
  'existencias',
  {
    id: serial('id').primaryKey(),
    articuloCodigo: varchar('articulo_codigo', { length: 50 })
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    unidades: doublePrecision('unidades').notNull().default(0),
    minimo: doublePrecision('minimo').default(0),
    maximo: doublePrecision('maximo'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('existencias_articulo_idx').on(table.articuloCodigo),
    index('existencias_deposito_idx').on(table.depositoId),
    // Composite unique: one stock row per articulo per deposito
  ]
)

export const inventarios = pgTable('inventarios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  depositoId: integer('deposito_id')
    .notNull()
    .references(() => depositos.id),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  // estados: pendiente, en_progreso, completado, cancelado
  fechaInicio: timestamp('fecha_inicio'),
  fechaCierre: timestamp('fecha_cierre'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const inventariosArticulos = pgTable('inventarios_articulos', {
  id: serial('id').primaryKey(),
  inventarioId: integer('inventario_id')
    .notNull()
    .references(() => inventarios.id, { onDelete: 'cascade' }),
  articuloCodigo: varchar('articulo_codigo', { length: 50 })
    .notNull()
    .references(() => articulos.codigo, { onDelete: 'restrict' }),
  cantidadSistema: doublePrecision('cantidad_sistema').notNull(),
  cantidadFisica: doublePrecision('cantidad_fisica'),
  diferencia: doublePrecision('diferencia'),
  contadoPor: varchar('contado_por', { length: 100 }),
  contadoEn: timestamp('contado_en'),
})

export const inventarioSectores = pgTable('inventario_sectores', {
  id: serial('id').primaryKey(),
  inventarioId: integer('inventario_id')
    .notNull()
    .references(() => inventarios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 50 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
})

export const dispositivosMoviles = pgTable('dispositivos_moviles', {
  id: serial('id').primaryKey(),
  inventarioId: integer('inventario_id')
    .notNull()
    .references(() => inventarios.id, { onDelete: 'cascade' }),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  nombre: varchar('nombre', { length: 100 }),
  asignadoA: varchar('asignado_a', { length: 100 }),
  ultimaActividad: timestamp('ultima_actividad'),
})
```

### Component Boundaries

| Component           | Responsibility                                       | Communicates With                                                              | Status                                          |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| `ArticulosModule`   | CRUD articulos, categories, search by codigo/barcode | DB only                                                                        | NEW -- replaces ProductsModule                  |
| `DepositosModule`   | CRUD depositos (warehouses)                          | DB only                                                                        | NEW                                             |
| `ExistenciasModule` | Stock per articulo per deposito, low-stock alerts    | ArticulosModule (lookup), DepositosModule (lookup)                             | NEW -- replaces InventoryModule                 |
| `InventariosModule` | Physical count events lifecycle                      | ExistenciasModule (system qty), ArticulosModule (article list)                 | NEW                                             |
| `OrdersModule`      | Orders + orderItems                                  | ArticulosModule (FK validation)                                                | MODIFIED -- FK from productId to articuloCodigo |
| `SalesModule`       | Sales + saleItems                                    | ArticulosModule (FK validation)                                                | MODIFIED -- FK from productId to articuloCodigo |
| `PurchasesModule`   | Purchases + purchaseItems                            | ArticulosModule (FK validation)                                                | MODIFIED -- FK from productId to articuloCodigo |
| `DashboardModule`   | KPI aggregation                                      | ArticulosModule, ExistenciasModule, OrdersModule, SalesModule, PurchasesModule | MODIFIED -- swap injected services              |
| `ProductsModule`    | DEPRECATED                                           | None                                                                           | REMOVED after migration                         |
| `InventoryModule`   | DEPRECATED                                           | None                                                                           | REMOVED after migration                         |

### Data Flow

**Articulo lifecycle:**

```
Create articulo (codigo as PK)
  --> auto-create existencias rows per active deposito (or on-demand)
  --> articulo.codigo used as FK in orderItems, saleItems, purchaseItems
```

**Existencias query:**

```
GET /api/existencias?deposito=1&search=...
  --> Join existencias + articulos + depositos
  --> Returns: { articulo: {...}, deposito: {...}, unidades, minimo, maximo }
```

**Inventario (physical count) flow:**

```
1. Create inventario for a deposito
2. System populates inventarios_articulos with cantidad_sistema from existencias
3. Mobile devices scan/count articles, update cantidad_fisica
4. On close: calculate diferencia, optionally adjust existencias
```

**Dashboard updated flow:**

```
DashboardService injects:
  - ArticulosService.getStats() (replaces ProductsService.getStats())
  - ExistenciasService.getStats() (replaces InventoryService.getStats())
  - Same: OrdersService, SalesService, PurchasesService
```

---

## Integration Points -- Detailed Impact Analysis

### 1. DB Schema (schema.ts)

**Files changed:** 1
**Impact:** HIGH -- this is ground zero

- DROP: `products`, `inventory` table definitions + type exports
- ADD: `articulos`, `depositos`, `existencias`, `inventarios`, `inventariosArticulos`, `inventarioSectores`, `dispositivosMoviles`
- MODIFY: `orderItems.productId` -> `articuloCodigo` (text), `saleItems.productId` -> `articuloCodigo`, `purchaseItems.productId` -> `articuloCodigo`
- MODIFY: Remove `productName` and `sku` denormalized columns from item tables (articulo data joins on codigo now)

**Critical decision: PK type change (integer -> text)**

The `productId integer` FK columns in orderItems/saleItems/purchaseItems become `articuloCodigo text`. This is NOT a simple ALTER -- it requires:

1. New column added
2. Data migration (map old productId to new codigo)
3. Old column dropped
4. FK constraint added

Since this is a v1.0 app with seed data (no production data yet), the cleaner approach is: drop all tables, recreate with new schema, re-seed. Use Drizzle `db:push` for development, generate a clean migration for production later.

### 2. Backend Modules

**Files changed:** ~20 (4 new modules x 4 files each + 4 modified modules)

| Module                 | Action | Key Changes                                                                |
| ---------------------- | ------ | -------------------------------------------------------------------------- |
| `modules/articulos/`   | CREATE | Controller, service, module, DTOs. PK is `codigo` (string param in routes) |
| `modules/depositos/`   | CREATE | Simple CRUD. Small module.                                                 |
| `modules/existencias/` | CREATE | Joins articulos+depositos. Replaces inventory logic.                       |
| `modules/inventarios/` | CREATE | Complex -- lifecycle management, mobile device tracking                    |
| `modules/products/`    | DELETE | Entirely replaced by articulos                                             |
| `modules/inventory/`   | DELETE | Entirely replaced by existencias                                           |
| `modules/orders/`      | MODIFY | `orderItems` schema change, service queries updated                        |
| `modules/sales/`       | MODIFY | `saleItems` schema change                                                  |
| `modules/purchases/`   | MODIFY | `purchaseItems` schema change                                              |
| `modules/dashboard/`   | MODIFY | Swap service injections, update KPI interface                              |
| `app.module.ts`        | MODIFY | Remove old modules, add new ones                                           |

**Route design for text PK:**

```
GET    /api/articulos              -- list (paginated)
GET    /api/articulos/:codigo      -- by codigo (text param, URL-encoded if needed)
POST   /api/articulos              -- create
PATCH  /api/articulos/:codigo      -- update
DELETE /api/articulos/:codigo      -- delete

GET    /api/depositos              -- list
POST   /api/depositos              -- create
PATCH  /api/depositos/:id          -- update (numeric)

GET    /api/existencias            -- list (filterable by deposito, articulo)
PATCH  /api/existencias/:id        -- update stock

GET    /api/inventarios            -- list
POST   /api/inventarios            -- create new count event
GET    /api/inventarios/:id        -- detail with articles + sectors
PATCH  /api/inventarios/:id        -- update status/lifecycle
POST   /api/inventarios/:id/cerrar -- close and reconcile
```

### 3. Web Frontend

**Files changed:** ~12

| File/Dir                           | Action  | Changes                                                                                                    |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `types/product.ts`                 | REPLACE | Becomes `types/articulo.ts` with text PK                                                                   |
| `types/inventory.ts`               | REPLACE | Becomes `types/existencia.ts` with deposito info                                                           |
| NEW `types/inventario.ts`          | CREATE  | Inventario event type                                                                                      |
| NEW `types/deposito.ts`            | CREATE  | Deposito type                                                                                              |
| `lib/api.ts`                       | MODIFY  | `fetchArticulos()`, `fetchExistencias()`, `fetchInventarios()`, `fetchDepositos()` replacing old functions |
| `app/(dashboard)/articles/`        | MODIFY  | Update client component to use Articulo type, codigo as key                                                |
| `app/(dashboard)/inventory/`       | MODIFY  | Becomes existencias view, add deposito filter                                                              |
| NEW `app/(dashboard)/inventarios/` | CREATE  | Physical count management section                                                                          |
| `app/(dashboard)/dashboard/`       | MODIFY  | Update KPI labels and types                                                                                |
| `types/dashboard.ts`               | MODIFY  | Update interface for new stats shape                                                                       |

### 4. Mobile App

**Files changed:** ~6

| File                        | Action | Changes                                           |
| --------------------------- | ------ | ------------------------------------------------- |
| `pages/Articles.tsx`        | MODIFY | New API endpoint, new type                        |
| `pages/Inventory.tsx`       | MODIFY | Becomes existencias view                          |
| NEW `pages/Inventarios.tsx` | CREATE | Physical count screen (scanner integration later) |
| Navigation config           | MODIFY | Add Inventarios tab/drawer item                   |
| API hooks/fetchers          | MODIFY | New endpoints                                     |

### 5. Shared Packages

**Files changed:** 2-3

| Package           | Action | Changes                                                                                              |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `packages/types/` | MODIFY | Add shared Articulo/Existencia/Inventario types if needed (currently product types live in web only) |

### 6. Seed Data

**Files changed:** ~6

| File                                     | Action                                    |
| ---------------------------------------- | ----------------------------------------- |
| `seed.ts`                                | REWRITE truncation + seeding order        |
| `generators/product.generator.ts`        | REPLACE with `articulo.generator.ts`      |
| `generators/inventory.generator.ts`      | REPLACE with `existencia.generator.ts`    |
| NEW `generators/deposito.generator.ts`   | CREATE                                    |
| NEW `generators/inventario.generator.ts` | CREATE                                    |
| `generators/order.generator.ts`          | MODIFY -- use codigo instead of productId |
| `generators/sale.generator.ts`           | MODIFY -- use codigo instead of productId |
| `generators/purchase.generator.ts`       | MODIFY -- use codigo instead of productId |

---

## Patterns to Follow

### Pattern 1: Text PK in Drizzle Routes

**What:** Use string params for articulo routes since PK is `codigo` (text).
**When:** Any route that identifies an articulo.
**Example:**

```typescript
// articulos.controller.ts
@Get(':codigo')
async findOne(@Param('codigo') codigo: string) {
  const articulo = await this.articulosService.findOne(codigo)
  if (!articulo) throw new NotFoundException(`Articulo ${codigo} not found`)
  return articulo
}
```

NestJS route params are strings by default, so no `ParseIntPipe` needed. This is simpler than the current numeric approach.

### Pattern 2: Composite Filtering for Existencias

**What:** Existencias always need deposito context. Default to "all depositos" aggregated, filter by specific deposito.
**When:** Any existencias query.
**Example:**

```typescript
// existencias.service.ts
async findAll(query: ExistenciaQueryDto) {
  let q = this.drizzle.db
    .select({
      id: existencias.id,
      unidades: existencias.unidades,
      minimo: existencias.minimo,
      articulo: articulos,
      deposito: depositos,
    })
    .from(existencias)
    .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
    .innerJoin(depositos, eq(existencias.depositoId, depositos.id))

  if (query.depositoId) {
    q = q.where(eq(existencias.depositoId, query.depositoId))
  }
  // ...
}
```

### Pattern 3: Denormalization Strategy for Item Tables

**What:** Current item tables store `productName` and `sku` alongside `productId`. With the new model, `articuloCodigo` IS the identifier AND the human-readable code. Store `descripcion` snapshot at sale/order time.
**When:** Writing orderItems, saleItems, purchaseItems.
**Example:**

```typescript
// In schema:
articuloCodigo: varchar('articulo_codigo', { length: 50 })
  .notNull()
  .references(() => articulos.codigo, { onDelete: 'restrict' }),
articuloDescripcion: varchar('articulo_descripcion', { length: 255 }).notNull(),
// Remove: productId, productName, sku -- codigo IS the SKU equivalent
```

**Rationale:** Keep description snapshot (it can change over time), but `codigo` is stable. No need for a separate `sku` column.

### Pattern 4: Module Dependency via NestJS Standard Imports

**What:** DashboardModule needs ArticulosModule and ExistenciasModule. Use standard NestJS module imports with exported services.
**When:** Cross-module dependencies.
**Example:**

```typescript
// dashboard.module.ts
@Module({
  imports: [ArticulosModule, ExistenciasModule, OrdersModule, SalesModule, PurchasesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

// articulos.module.ts -- must export the service
@Module({
  imports: [DbModule],
  controllers: [ArticulosController],
  providers: [ArticulosService],
  exports: [ArticulosService], // Required for DashboardModule to inject
})
export class ArticulosModule {}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dual-Write Migration with Both Old and New Tables

**What:** Keeping `products` and `articulos` tables simultaneously with sync logic.
**Why bad:** v1.0 has no production users. Dual-write adds complexity for zero benefit. Sync bugs are inevitable.
**Instead:** Clean cut -- drop old tables, create new ones, re-seed. Single Drizzle `db:push` or migration.

### Anti-Pattern 2: Surrogate ID + Natural Key Hybrid

**What:** Adding an `id serial` to `articulos` alongside `codigo` PK, using `id` internally.
**Why bad:** Defeats the purpose of the business model. `codigo` IS the identifier used everywhere (labels, invoices, ERP). Adding a surrogate creates mapping confusion.
**Instead:** Use `codigo text` as the true PK. It is stable, short, and meaningful.

### Anti-Pattern 3: Building Inventarios Before Existencias

**What:** Implementing the physical count system before the basic stock model exists.
**Why bad:** Inventarios reads from and writes to existencias. Without existencias, inventarios has nothing to count against.
**Instead:** Build in dependency order: articulos -> depositos -> existencias -> inventarios.

### Anti-Pattern 4: Keeping `productName`/`sku` Denormalization in Items

**What:** Storing `articuloDescripcion` + `articuloCodigo` + separate `sku` in item tables.
**Why bad:** In the new model, `codigo` IS the SKU. Three fields for two concepts.
**Instead:** Store `articuloCodigo` (the identifier) and `articuloDescripcion` (snapshot at transaction time). Two fields, clean.

### Anti-Pattern 5: Incremental Schema Changes Instead of Clean Cut

**What:** Writing multiple ALTER TABLE migrations to gradually morph `products` into `articulos`.
**Why bad:** No production data to preserve. Multiple migrations create fragile intermediate states. Drizzle schema drifts from actual DB.
**Instead:** One clean schema definition. `db:push` to recreate. New seed. Done.

---

## Suggested Build Order

The dependency chain determines phase ordering. Each phase should produce a working (if incomplete) system.

### Phase 1: Schema Foundation + Articulos Module

**What:** New Drizzle schema for all tables. Backend ArticulosModule + DepositosModule. Drop products/inventory.
**Why first:** Everything depends on the schema. Articulos is the central entity.
**Includes:**

1. Rewrite `schema.ts` with all new tables + modified item tables
2. New type exports for all entities
3. `db:push` to apply
4. Backend `ArticulosModule` (controller, service, DTOs) -- full CRUD
5. Backend `DepositosModule` -- simple CRUD
6. Remove `ProductsModule` and `InventoryModule`
7. Update `app.module.ts`
8. New seed generators: `articulo.generator.ts`, `deposito.generator.ts`
9. Update existing generators (order, sale, purchase) for `articuloCodigo`
10. Rewrite `seed.ts` truncation order and seeding flow

**Risk:** Breaks orders/sales/purchases/dashboard until Phase 3. Acceptable because all changes happen in one milestone.

### Phase 2: Existencias Module

**What:** Full-stack replacement of inventory with existencias.
**Why second:** Depends on articulos + depositos. Needed before inventarios.
**Includes:**

1. Backend `ExistenciasModule` with deposito-aware joins
2. Seed: `existencia.generator.ts`
3. Web: `types/existencia.ts`, `types/deposito.ts`
4. Web: Update `lib/api.ts` with `fetchArticulos()`, `fetchDepositos()`, `fetchExistencias()`
5. Web: Update `articles/` page to use Articulo type + codigo PK
6. Web: Update `inventory/` page to become existencias view with deposito filter
7. Web: Update `types/articulo.ts`
8. Mobile: Update `Articles.tsx` and `Inventory.tsx`

### Phase 3: Update Downstream Modules

**What:** Fix orders, sales, purchases, dashboard to use new schema.
**Why third:** These modules depend on articulos being stable.
**Includes:**

1. Backend: Update OrdersService -- join on `articuloCodigo`, remove `productName`/`sku` denorm
2. Backend: Update SalesService -- same pattern
3. Backend: Update PurchasesService -- same pattern
4. Backend: Update DashboardService -- swap injected services, update KPI interface
5. Web: Update `types/order.ts`, `types/sale.ts`, `types/purchase.ts` -- `productId` -> `articuloCodigo`
6. Web: Update `types/dashboard.ts` for new stats shape
7. Web: Update dashboard page components
8. Mobile: Update corresponding pages
9. Final seed verification -- all generators produce consistent data

### Phase 4: Inventarios Module

**What:** Physical count event system. Entirely new domain.
**Why last:** Depends on existencias. Most complex. Can be deferred without breaking core operations.
**Includes:**

1. Backend `InventariosModule` with lifecycle management (create -> en_progreso -> completado)
2. Sub-tables: inventarios_articulos, inventario_sectores, dispositivos_moviles
3. Close/reconcile endpoint that adjusts existencias
4. Web: New `app/(dashboard)/inventarios/` section
5. Web: Navigation update (sidebar)
6. Mobile: New `Inventarios.tsx` page + navigation update
7. Seed: `inventario.generator.ts`

### Phase Dependency Chain

```
Phase 1 (Schema + Articulos + Depositos)
  |
  +-- Phase 2 (Existencias + Frontend updates)
  |     |
  |     +-- Phase 4 (Inventarios)
  |
  +-- Phase 3 (Orders/Sales/Purchases/Dashboard update)
```

Phases 2 and 3 can run in parallel if different developers. Phase 4 must wait for Phase 2.

---

## Scalability Considerations

| Concern                           | Current (seed data) | At 10K articulos                           | At 100K articulos                                  |
| --------------------------------- | ------------------- | ------------------------------------------ | -------------------------------------------------- |
| Text PK joins                     | Negligible          | Fine -- varchar(50) indexed joins are fast | Add GIN index on codigo if needed                  |
| Existencias query (all depositos) | Simple              | Partition query by deposito, paginate      | Materialized view for total stock across depositos |
| Inventario article list           | N/A                 | Load inventarios_articulos lazily          | Cursor-based pagination for count screens          |
| Barcode lookup                    | Index scan          | Exact match on indexed column, fast        | Same -- B-tree handles this well                   |

Text PKs with varchar(50) are well within PostgreSQL performance norms. The ERP-style `codigo` values are typically 6-20 characters -- shorter than many UUID PKs used in production systems.

---

## Sources

- Direct codebase analysis of `apps/backend/src/db/schema.ts` (current schema with 8 table definitions)
- Direct codebase analysis of all 7 backend service files (dependency mapping, query patterns)
- Direct codebase analysis of `apps/web/src/lib/api.ts` (6 fetch functions) and `apps/web/src/types/` (7 type files)
- Direct codebase analysis of `apps/mobile/src/pages/` (9 page components)
- Direct codebase analysis of `apps/backend/src/db/seed.ts` and generator pattern
- Drizzle ORM text PK and FK patterns -- HIGH confidence (well-documented, standard PostgreSQL feature)
- NestJS module imports/exports pattern -- HIGH confidence (core NestJS feature)
- PostgreSQL varchar PK performance -- HIGH confidence (established, benchmarked extensively in industry)
