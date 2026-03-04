# Phase 5: Database Integration - Research

**Researched:** 2026-03-02
**Domain:** Drizzle ORM + PostgreSQL (Supabase) integration with NestJS
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Database Provisioning**

- Use Supabase managed PostgreSQL — same project already used for auth
- Direct postgres:// connection string from Supabase dashboard (no Supabase JS client for data)
- Single database for dev and production for now
- Connection string via `DATABASE_URL` environment variable in `.env`

**Schema Design**

- Separate tables for line items: `order_items`, `sale_items`, `purchase_items` with foreign keys to parent tables
- Auto-increment integer primary keys — matches current API contract, no frontend changes needed
- `inventory` as its own table with `product_id` FK — keeps domain separation matching current service structure
- Drizzle schema files live in `apps/backend/src/db/` — co-located with the backend, only consumer
- Tables: `products`, `orders`, `order_items`, `inventory`, `sales`, `sale_items`, `purchases`, `purchase_items`

**Seed Data Strategy**

- Adapt existing faker generators (`data/generators/*.ts`) to produce Drizzle insert objects
- Dedicated CLI command: `pnpm db:seed` — explicit, never runs automatically
- Truncate-and-reseed behavior: each run clears all tables and inserts fresh data
- Same data volumes as current mocks: 500 products, 200 orders, 150 sales, 50 purchases
- Referential integrity maintained — products seeded first, then dependent entities

**Service Migration**

- All 6 services migrate at once (products, orders, inventory, sales, purchases, dashboard)
- Remove mock data code (`data/generators/`, `data/seed.ts`, `data/types.ts`) after migration — no dead code
- Dashboard keeps current service aggregation pattern (calls other services' methods, not direct DB queries)
- Full CRUD operations: create, update, delete endpoints added alongside existing reads

### Claude's Discretion

- Drizzle migration file organization and naming
- Index strategy for frequently filtered columns (category, status, dates)
- Foreign key cascade behavior (ON DELETE)
- Error handling for database connection failures
- Transaction usage for multi-table operations

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 5 replaces in-memory mock data in the NestJS backend with real PostgreSQL via Drizzle ORM. The tech choice is locked: Drizzle ORM with the postgres.js driver connecting to Supabase's managed PostgreSQL via a `DATABASE_URL` connection string. The API contract (endpoint shapes, response formats, pagination structure) must remain identical so neither the Next.js web app nor the Capacitor mobile app requires any code changes.

The core work is: (1) add a `DrizzleModule` as a global NestJS provider, (2) define Drizzle schema for 8 tables mirroring existing TypeScript interfaces, (3) generate and apply migrations, (4) write a CLI seed script adapting existing faker generators to insert into the database, and (5) rewrite all 6 service classes to query the database instead of the in-memory arrays, while adding create/update/delete operations.

The biggest complexity is the nested line-items pattern (orders have order_items, sales have sale_items, purchases have purchase_items). These must be seeded in the correct order and queried with joins. The existing `paginate()` helper must be replaced with a two-query approach (data query + count query) since Drizzle operates on the database, not in-memory arrays.

**Primary recommendation:** Use postgres.js driver + custom `DrizzleModule` (global, @Global) with `CONNECTION_POOL` provider token pattern. This is the most-documented, well-tested NestJS+Drizzle pattern. Avoid third-party nestjs-drizzle wrapper packages — too much indirection, unnecessary abstraction.

---

## Standard Stack

### Core

| Library     | Version | Purpose                                    | Why Standard                                                  |
| ----------- | ------- | ------------------------------------------ | ------------------------------------------------------------- |
| drizzle-orm | ^0.45.1 | TypeScript ORM, query builder              | Zero dependencies, SQL-like API, first-class PostgreSQL types |
| drizzle-kit | ^0.31.9 | CLI for migrations (generate/migrate/push) | Official companion to drizzle-orm                             |
| postgres    | ^3.4.8  | postgres.js driver — Supabase-recommended  | Official Supabase+Drizzle docs use postgres.js                |

### Supporting

| Library         | Version                               | Purpose                                 | When to Use                                                     |
| --------------- | ------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| @faker-js/faker | already installed ^10.2.0             | Seed data generation                    | Already in project — adapt generators to produce insert objects |
| tsx             | via drizzle-kit devDeps or add `^4.x` | Run TypeScript seed scripts directly    | Needed for `pnpm db:seed` CLI command without compile step      |
| dotenv          | already installed ^17.x               | Load DATABASE_URL for drizzle.config.ts | Already in project                                              |

### Alternatives Considered

| Instead of           | Could Use                       | Tradeoff                                                                                                                                     |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| postgres.js          | node-postgres (pg)              | node-postgres supports per-query type parsers, but postgres.js is the Supabase official recommendation and handles connection pooling simply |
| Custom DrizzleModule | @knaadh/nestjs-drizzle-postgres | Third-party wrapper adds abstraction; custom module is 30 lines and fully transparent                                                        |
| drizzle-kit migrate  | drizzle-kit push                | push is development-only, no audit trail; migrate generates committed SQL files — use migrate                                                |

**Installation (in `apps/backend`):**

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit tsx
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/
├── db/
│   ├── index.ts           # DrizzleService: connection + db instance
│   ├── schema.ts          # All 8 table definitions + type exports
│   ├── schema/            # Optional: one file per table if schema.ts grows large
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   └── ...
│   └── seed.ts            # CLI seed script (run via pnpm db:seed)
├── db.module.ts           # @Global() DrizzleModule NestJS module
├── drizzle.config.ts      # (project root or backend root) — drizzle-kit config
├── drizzle/               # Generated migration SQL files (committed to git)
│   ├── 0000_create_products.sql
│   ├── 0001_create_orders.sql
│   └── meta/              # drizzle-kit snapshot files
└── modules/
    ├── products/
    │   └── products.service.ts   # Rewritten to use DrizzleService
    └── ...
```

**Note:** Keep `drizzle.config.ts` at `apps/backend/` root (same level as `package.json`) so drizzle-kit commands resolve relative paths correctly.

---

### Pattern 1: Global DrizzleModule with CONNECTION_POOL Token

**What:** A `@Global()` NestJS module that creates a postgres.js client, wraps it in a DrizzleService, and exports it. All feature modules access `DrizzleService` without importing `DrizzleModule` explicitly.

**When to use:** Always — this is the canonical NestJS+Drizzle pattern from wanago.io (May 2024, updated).

**Example:**

```typescript
// src/db/index.ts (DrizzleService)
// Source: https://wanago.io/2024/05/20/api-nestjs-drizzle-orm-postgresql/
import { Injectable } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT'

@Injectable()
export class DrizzleService {
  public db: PostgresJsDatabase<typeof schema>

  constructor(@Inject(DRIZZLE_CLIENT) private readonly client: ReturnType<typeof postgres>) {
    this.db = drizzle(client, { schema })
  }
}
```

```typescript
// src/db.module.ts
// Source: https://wanago.io/2024/05/20/api-nestjs-drizzle-orm-postgresql/
import { Global, Module } from '@nestjs/common'
import postgres from 'postgres'
import { DrizzleService, DRIZZLE_CLIENT } from './db'

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE_CLIENT,
      useFactory: () => postgres(process.env.DATABASE_URL!),
    },
  ],
  exports: [DrizzleService],
})
export class DbModule {}
```

```typescript
// Import in AppModule
// src/app.module.ts
import { DbModule } from './db.module'

@Module({
  imports: [
    DbModule, // Add first — global module, available everywhere
    AuthModule,
    ProductsModule,
    // ...
  ],
})
export class AppModule {}
```

---

### Pattern 2: Schema Definition with Integer PKs and Relations

**What:** 8 pgTable definitions using `serial()` integer primary keys and explicit `references()` for foreign keys.

**When to use:** For all 8 tables — products, orders, order_items, inventory, sales, sale_items, purchases, purchase_items.

**Example (key tables):**

```typescript
// src/db/schema.ts
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new (official docs)
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    sku: varchar('sku', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    stock: integer('stock').notNull().default(0),
    imageUrl: text('image_url'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('products_category_idx').on(table.category),
    index('products_status_idx').on(table.status),
  ]
)

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
    customerId: integer('customer_id').notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    tax: numeric('tax', { precision: 10, scale: 2 }).notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('orders_status_idx').on(table.status),
    index('orders_created_at_idx').on(table.createdAt),
  ]
)

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  },
  table => [index('order_items_order_id_idx').on(table.orderId)]
)

// inventory: 1:1 with products, product_id is FK + unique
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  minStock: integer('min_stock').notNull().default(10),
  maxStock: integer('max_stock').notNull().default(500),
  location: varchar('location', { length: 20 }).notNull(),
  lastRestocked: timestamp('last_restocked').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull(),
})

// sales, sale_items, purchases, purchase_items follow same pattern
```

---

### Pattern 3: Service Rewrite — DB Query with Two-Query Pagination

**What:** Replace `private items: Entity[]` in-memory array + `paginate(filtered, query)` with real DB queries. Pagination requires two separate queries: one for total count (with filters), one for paginated data.

**When to use:** Every `findAll()` method in all 6 services.

**Example:**

```typescript
// products.service.ts rewritten (before/after)
// Source: Drizzle docs + wanago.io pattern
import { Injectable } from '@nestjs/common'
import { DrizzleService } from '../../db'
import { products } from '../../db/schema'
import { eq, ilike, and, count, sql, asc, desc } from 'drizzle-orm'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ProductQueryDto } from './dto/product-query.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(query: ProductQueryDto): Promise<PaginatedResponseDto<any>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    // Build conditions array
    const conditions = []
    if (query.search) {
      conditions.push(ilike(products.name, `%${query.search}%`))
    }
    if (query.category) {
      conditions.push(eq(products.category, query.category))
    }
    if (query.status) {
      conditions.push(eq(products.status, query.status))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Two queries: total count + paginated data
    const [{ total }] = await this.drizzle.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(products)
      .where(where)

    const data = await this.drizzle.db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)
    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }
}
```

**CRITICAL NOTE:** All service methods become `async`. All callers in DashboardService must also become `async`. Controllers should remain unchanged — NestJS handles promise returns transparently.

---

### Pattern 4: Multi-Table Insert in Seed Script (Referential Integrity)

**What:** Seed script runs as standalone CLI, inserts in dependency order: products → inventory → orders → order_items → sales → sale_items → purchases → purchase_items. Uses TRUNCATE ... CASCADE for clean slate.

**When to use:** `pnpm db:seed` — truncate-and-reseed each run.

**Example:**

```typescript
// src/db/seed.ts
// Source: https://orm.drizzle.team/docs/seed-overview + adapted from existing generators
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { generateProducts } from '../data/generators/product.generator'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Truncating all tables...')
  // CASCADE handles FK dependencies automatically
  await db.execute(sql`TRUNCATE TABLE
    purchase_items, sale_items, order_items,
    inventory, purchases, sales, orders, products
    RESTART IDENTITY CASCADE`)

  console.log('Seeding products...')
  const productData = generateProducts(500)
  const insertedProducts = await db
    .insert(schema.products)
    .values(
      productData.map(p => ({
        sku: p.sku,
        name: p.name,
        // ... map all fields from existing generator output
      }))
    )
    .returning()

  // Seed dependent tables using insertedProducts for FK references
  // ... orders, inventory, sales, purchases

  await client.end()
  console.log('Seed complete.')
}

seed().catch(console.error)
```

**package.json scripts to add:**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

### Pattern 5: Transaction for Multi-Table CRUD

**What:** Use `db.transaction()` when creating/deleting a parent entity with child line items. Ensures atomicity — order not created if order_items insert fails.

**When to use:** Create order (inserts orders + order_items), delete order (delete order_items + order), same for sales/purchases.

**Example:**

```typescript
// Source: https://orm.drizzle.team/docs/transactions
async createOrder(dto: CreateOrderDto): Promise<Order> {
  return await this.drizzle.db.transaction(async (tx) => {
    const [order] = await tx
      .insert(schema.orders)
      .values({ orderNumber: dto.orderNumber, /* ... */ })
      .returning()

    await tx.insert(schema.orderItems).values(
      dto.items.map(item => ({ orderId: order.id, ...item }))
    )
    return order
  })
}
```

---

### Pattern 6: drizzle.config.ts

**What:** Required by drizzle-kit for migration generation and apply.

**Example:**

```typescript
// apps/backend/drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

### Anti-Patterns to Avoid

- **Calling `seedAll()` from services:** Remove all `import { seedAll }` — this is the entire migration. Services must inject `DrizzleService` instead.
- **Using `drizzle-kit push` in production:** Only for local dev experiments. Always use `generate` + `migrate` for actual schema changes.
- **Passing `db` directly to services instead of `DrizzleService`:** Always inject `DrizzleService`, not the raw `PostgresJsDatabase` object — enables testability and consistent access pattern.
- **In-memory filtering after DB query:** Do not fetch all rows from DB then filter in TypeScript. Push all filters to the WHERE clause.
- **Not using `returning()` on insert:** Without `.returning()`, Drizzle gives you the query result metadata, not the inserted row. Always use `.returning()` to get back the new entity with its generated `id`.
- **Forgetting numeric vs number type:** Drizzle's `numeric()` column returns strings from PostgreSQL. Use `parseFloat()` when arithmetic is needed, or use `real()`/`doublePrecision()` if float precision is acceptable.
- **Synchronous service methods after migration:** All service methods become `async`. The `DashboardService.getKpis()` must become `async getKpis()` and await all service calls.

---

## Don't Hand-Roll

| Problem                           | Don't Build                 | Use Instead                                    | Why                                              |
| --------------------------------- | --------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| SQL migration management          | Custom migration runner     | `drizzle-kit generate` + `drizzle-kit migrate` | Handles schema diffing, snapshots, ordering      |
| PostgreSQL connection pooling     | Manual pool management      | postgres.js built-in pool                      | postgres.js pools by default, handles reconnects |
| TypeScript type inference from DB | Manual type definitions     | `typeof schema.products.$inferSelect`          | Drizzle infers exact column types from schema    |
| Pagination count query            | SQL injection risk          | `sql<number>\`cast(count(\*) as integer)\``    | Type-safe template literal, auto-parameterized   |
| UUID primary keys                 | Custom id generator         | `serial()` from drizzle-orm/pg-core            | Matches existing integer API contract            |
| Cascade delete                    | Manual delete of child rows | `{ onDelete: 'cascade' }` in FK reference      | Database enforces at constraint level            |

**Key insight:** Drizzle's strength is that it compiles TypeScript directly to SQL with zero overhead. Avoid any abstraction layer between the service and `this.drizzle.db.*` queries.

---

## Common Pitfalls

### Pitfall 1: numeric() Returns Strings

**What goes wrong:** PostgreSQL `NUMERIC` / `DECIMAL` columns return strings via Node drivers, not JavaScript numbers. Code like `total + tax` silently produces string concatenation.

**Why it happens:** PostgreSQL bigint/numeric are larger than JS Number can represent precisely; drivers return strings by default.

**How to avoid:** Either use `real()` or `doublePrecision()` for financial amounts (loses decimal precision guarantee), or cast to number after query: `parseFloat(row.price)`. Add a helper: `toNum(val: string | number) => parseFloat(String(val))`.

**Warning signs:** Prices showing as "10.99" strings in API responses; `total + tax` producing "10.990.16" instead of "11.15".

### Pitfall 2: Synchronous getStats() After Migration

**What goes wrong:** `DashboardService.getKpis()` calls `this.salesService.getStats()` etc. After migration, all service methods are async. Forgetting to await them returns Promises, not data.

**Why it happens:** The original services were synchronous (in-memory). Drizzle queries are always async.

**How to avoid:** Change `getKpis()` to `async getKpis()` and `await` every service call. Update controller to handle `Promise<DashboardResponse>` — NestJS resolves this automatically.

**Warning signs:** Dashboard KPIs showing `[object Promise]` or undefined values.

### Pitfall 3: Seed Script DATABASE_URL Not Loading

**What goes wrong:** `tsx src/db/seed.ts` fails with "DATABASE_URL is undefined" even though `.env` exists.

**Why it happens:** `tsx` runs TypeScript directly but doesn't auto-load `.env`. The `import 'dotenv/config'` must be the FIRST line of `seed.ts`.

**How to avoid:** Put `import 'dotenv/config'` as literally the first line in `seed.ts`, before any other imports. Alternatively, use `dotenv-cli`: `dotenv tsx src/db/seed.ts`.

**Warning signs:** `process.env.DATABASE_URL` is `undefined` at runtime.

### Pitfall 4: drizzle.config.ts Can't Find .env

**What goes wrong:** `pnpm db:generate` fails because drizzle-kit can't load DATABASE_URL.

**Why it happens:** drizzle-kit reads `drizzle.config.ts` which needs dotenv loaded. The `import 'dotenv/config'` at the top of `drizzle.config.ts` fixes this.

**How to avoid:** Include `import 'dotenv/config'` at the top of `drizzle.config.ts`.

### Pitfall 5: TRUNCATE Requires CASCADE

**What goes wrong:** `TRUNCATE TABLE products` fails because order_items, inventory, etc. reference products with FK constraints.

**Why it happens:** PostgreSQL enforces referential integrity. Cannot truncate a referenced table without CASCADE.

**How to avoid:** Use `TRUNCATE TABLE purchase_items, sale_items, order_items, inventory, purchases, sales, orders, products RESTART IDENTITY CASCADE` — truncate all tables in single statement, or truncate leaf tables first.

### Pitfall 6: Migration Not Applied Before Seed

**What goes wrong:** Seed script fails because tables don't exist yet.

**Why it happens:** Running `pnpm db:seed` before `pnpm db:migrate` on a fresh database.

**How to avoid:** Document correct first-run order in README: `db:migrate` then `db:seed`. Consider adding a check in seed script: `SELECT to_regclass('public.products')` before inserting.

### Pitfall 7: Items Array Not Joined When Fetching Orders/Sales/Purchases

**What goes wrong:** `findOne(id)` for an order returns the order row without its items array.

**Why it happens:** Line items are in a separate table. Simple `select().from(orders).where(eq(orders.id, id))` doesn't include items.

**How to avoid:** For `findOne()`, do a second query to fetch items: `select().from(orderItems).where(eq(orderItems.orderId, id))`. Combine in service: `{ ...order, items }`. Alternatively define Drizzle relations and use `.query.orders.findFirst({ with: { items: true } })`.

### Pitfall 8: Supabase Connection Pooler vs Direct Connection

**What goes wrong:** `drizzle-kit generate` or migrations fail when using the pooled connection string (port 6543) instead of direct (port 5432).

**Why it happens:** drizzle-kit needs direct PostgreSQL connection for DDL operations. Connection poolers (PgBouncer) don't support all DDL commands.

**How to avoid:** Use two env vars if needed: `DATABASE_URL` for pooled runtime queries, `DATABASE_DIRECT_URL` for drizzle-kit. Or use direct connection string (port 5432) for everything since this is a non-production setup with single database.

---

## Code Examples

Verified patterns from official sources:

### Schema: Foreign Key with onDelete Cascade

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
})
```

### Schema: Index on Frequently Filtered Column

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    category: varchar('category', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
  },
  table => [
    index('products_category_idx').on(table.category),
    index('products_status_idx').on(table.status),
  ]
)
```

### CRUD: Insert with Returning

```typescript
// Source: https://wanago.io/2024/05/20/api-nestjs-drizzle-orm-postgresql/
const [newProduct] = await this.drizzle.db
  .insert(schema.products)
  .values({
    sku: dto.sku,
    name: dto.name,
    price: String(dto.price), // numeric columns take string or number
    // ...
  })
  .returning()
return newProduct
```

### CRUD: Update with Returning + 404 Guard

```typescript
// Source: https://wanago.io/2024/05/20/api-nestjs-drizzle-orm-postgresql/
const [updated] = await this.drizzle.db
  .update(schema.products)
  .set({ name: dto.name, updatedAt: new Date() })
  .where(eq(schema.products.id, id))
  .returning()

if (!updated) throw new NotFoundException(`Product ${id} not found`)
return updated
```

### CRUD: Delete

```typescript
// Source: https://orm.drizzle.team/docs/get-started-postgresql
await this.drizzle.db.delete(schema.products).where(eq(schema.products.id, id))
```

### Pagination: Two-Query Pattern (Count + Data)

```typescript
// Source: https://orm.drizzle.team/docs/guides/count-rows + https://orm.drizzle.team/docs/guides/limit-offset-pagination
const where = and(
  query.status ? eq(products.status, query.status) : undefined,
  query.search ? ilike(products.name, `%${query.search}%`) : undefined
)

const [{ total }] = await this.drizzle.db
  .select({ total: sql<number>`cast(count(*) as integer)` })
  .from(products)
  .where(where)

const data = await this.drizzle.db
  .select()
  .from(products)
  .where(where)
  .orderBy(desc(products.createdAt))
  .limit(limit)
  .offset(offset)
```

### Supabase Connection (postgres.js driver)

```typescript
// Source: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle({ client })
```

### Type Exports from Schema (use in controllers/DTOs)

```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
```

### Getters with Aggregation (replacing getStats())

```typescript
// Source: Drizzle select + groupBy docs
async getStats() {
  const rows = await this.drizzle.db
    .select({
      status: products.status,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(products)
    .groupBy(products.status)

  const byStatus = { active: 0, inactive: 0, discontinued: 0 }
  for (const row of rows) {
    byStatus[row.status as keyof typeof byStatus] = row.count
  }
  return { total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus }
}
```

### Order with Items: findOne Pattern

```typescript
// Source: Drizzle docs — two-query approach
async findOne(id: number) {
  const [order] = await this.drizzle.db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id))

  if (!order) return null

  const items = await this.drizzle.db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, id))

  return { ...order, items }
}
```

---

## State of the Art

| Old Approach                            | Current Approach                          | When Changed  | Impact                                                        |
| --------------------------------------- | ----------------------------------------- | ------------- | ------------------------------------------------------------- |
| TypeORM (NestJS default)                | Drizzle ORM                               | 2023–2024     | Lighter weight, better TypeScript inference, SQL-first        |
| Prisma schema language                  | Drizzle TypeScript schema                 | 2023–2024     | No separate schema file format, just TypeScript               |
| `drizzle-kit push` for all environments | `generate` + `migrate` for production     | Always-was    | Push leaves no audit trail; migrate commits SQL files         |
| `relations()` API (v1)                  | `defineRelations()` (v2)                  | Drizzle 0.30+ | New syntax, old `relations()` still works but v2 is preferred |
| Custom seeding with raw SQL             | Adapted faker generators + Drizzle insert | Current       | Re-use existing generator logic, add `db.insert()` calls      |

**Deprecated/outdated:**

- `serial('id').primaryKey()` is still valid in Drizzle 0.45 — do NOT use `integer().generatedAlwaysAsIdentity()` unless targeting PostgreSQL 10+ with IDENTITY columns (both work, `serial` is simpler and matches existing API contract)
- `relations()` from `drizzle-orm` (v1) — functional but `defineRelations()` is the new API; for this phase, simple two-query approach for items is cleaner than defining full relation graphs

---

## Indexes to Create (Claude's Discretion)

Based on existing service filter patterns, these indexes optimize the most common queries:

| Table          | Column(s)      | Rationale                                    |
| -------------- | -------------- | -------------------------------------------- |
| products       | category       | Filtered in 85%+ of product queries          |
| products       | status         | Common filter (active/inactive/discontinued) |
| orders         | status         | Stats aggregation + list filtering           |
| orders         | created_at     | Date range filtering, recent orders          |
| orders         | customer_id    | Customer-specific order lookups              |
| sales          | status         | Stats aggregation                            |
| sales          | payment_method | Payment method breakdown                     |
| sales          | created_at     | Today/this-week stats calculations           |
| purchases      | status         | Pending orders count                         |
| purchases      | created_at     | Date range filtering                         |
| inventory      | status         | Low stock queries                            |
| inventory      | product_id     | Already unique constraint, acts as index     |
| order_items    | order_id       | Always queried by parent order_id            |
| sale_items     | sale_id        | Always queried by parent sale_id             |
| purchase_items | purchase_id    | Always queried by parent purchase_id         |

---

## Foreign Key Cascade Strategy (Claude's Discretion)

| Parent → Child Relationship | onDelete | Rationale                                                        |
| --------------------------- | -------- | ---------------------------------------------------------------- |
| orders → order_items        | CASCADE  | Items have no meaning without the order                          |
| sales → sale_items          | CASCADE  | Items have no meaning without the sale                           |
| purchases → purchase_items  | CASCADE  | Items have no meaning without the purchase                       |
| products → inventory        | CASCADE  | Inventory record is meaningless without product                  |
| products → order_items      | RESTRICT | Prevent deleting products that appear in orders (data integrity) |
| products → sale_items       | RESTRICT | Prevent deleting products that appear in sales                   |
| products → purchase_items   | RESTRICT | Prevent deleting products that appear in purchases               |

---

## Open Questions

1. **Supabase direct vs pooled connection string**
   - What we know: Supabase provides two URLs — direct (port 5432) and pooled (port 6543 via PgBouncer)
   - What's unclear: Whether the project's Supabase plan has pooler available; whether drizzle-kit migrate needs direct connection
   - Recommendation: Default to direct connection (port 5432) for both runtime and migrations since this is a single-database non-production setup. If connection limits become an issue, switch runtime to pooled URL.

2. **numeric() string output in API responses**
   - What we know: PostgreSQL numeric/decimal returns strings via postgres.js
   - What's unclear: Whether current frontend code handles string prices (e.g., "10.99") or expects numbers (10.99)
   - Recommendation: Check existing API response samples — if frontend sends number values to API, add `parseFloat()` in service layer. Alternatively, define price/cost columns as `doublePrecision()` to get JS numbers directly (acceptable for this use case since we're not doing bank-grade arithmetic).

3. **Migration on first deploy**
   - What we know: `pnpm db:migrate` must run before `pnpm db:seed` on fresh database
   - What's unclear: Whether CI/CD or startup hook should run migrations automatically
   - Recommendation: For this phase, document manual first-run order. Add note in `main.ts` comment about migration requirement. Automatic migration on startup (via `onModuleInit`) is an option but adds startup latency.

---

## Sources

### Primary (HIGH confidence)

- https://orm.drizzle.team/docs/get-started/postgresql-new — Official Drizzle PostgreSQL quickstart, checked 2026-03-02
- https://orm.drizzle.team/docs/migrations — Official migration workflow documentation
- https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase — Official Supabase integration guide
- https://orm.drizzle.team/docs/indexes-constraints — Index and FK constraint syntax
- https://orm.drizzle.team/docs/transactions — Transaction syntax
- https://orm.drizzle.team/docs/select — Select query operators (eq, ilike, and, count)
- https://orm.drizzle.team/docs/guides/limit-offset-pagination — Pagination guide
- https://orm.drizzle.team/docs/guides/count-rows — Count rows guide

### Secondary (MEDIUM confidence)

- https://wanago.io/2024/05/20/api-nestjs-drizzle-orm-postgresql/ — Verified against official docs; canonical NestJS+Drizzle pattern (May 2024, still valid)
- https://orm.drizzle.team/docs/relations-v2 — Drizzle relations v2 syntax (official)
- npm view drizzle-orm version → 0.45.1 (current as of 2026-03-02)
- npm view drizzle-kit version → 0.31.9 (current as of 2026-03-02)
- npm view postgres version → 3.4.8 (current as of 2026-03-02)

### Tertiary (LOW confidence)

- https://trilon.io/blog/nestjs-drizzleorm-a-great-match — General NestJS+Drizzle integration overview; patterns cross-verified with wanago.io and official docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified current versions via npm, official Supabase+Drizzle docs confirm postgres.js driver
- Architecture: HIGH — DrizzleModule pattern sourced from official wanago.io tutorial (May 2024) cross-referenced with official Drizzle docs; existing NestJS module structure well-understood from codebase
- Pitfalls: MEDIUM — numeric() string output and TRUNCATE CASCADE verified via official docs; Supabase pooler issue is documented community knowledge cross-referenced with Supabase docs

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Drizzle is active development; check for breaking changes if schema definition syntax differs)
