# Phase 5: Database Integration - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace in-memory mock data services with real PostgreSQL database using Drizzle ORM. All API endpoints must return data from the database instead of mock generators. The API contract (request/response shapes) stays identical so frontends work without code changes. CRUD operations are added for all entities.

</domain>

<decisions>
## Implementation Decisions

### Database Provisioning

- Use Supabase managed PostgreSQL — same project already used for auth
- Direct postgres:// connection string from Supabase dashboard (no Supabase JS client for data)
- Single database for dev and production for now
- Connection string via `DATABASE_URL` environment variable in `.env`

### Schema Design

- Separate tables for line items: `order_items`, `sale_items`, `purchase_items` with foreign keys to parent tables
- Auto-increment integer primary keys — matches current API contract, no frontend changes needed
- `inventory` as its own table with `product_id` FK — keeps domain separation matching current service structure
- Drizzle schema files live in `apps/backend/src/db/` — co-located with the backend, only consumer
- Tables: `products`, `orders`, `order_items`, `inventory`, `sales`, `sale_items`, `purchases`, `purchase_items`

### Seed Data Strategy

- Adapt existing faker generators (`data/generators/*.ts`) to produce Drizzle insert objects
- Dedicated CLI command: `pnpm db:seed` — explicit, never runs automatically
- Truncate-and-reseed behavior: each run clears all tables and inserts fresh data
- Same data volumes as current mocks: 500 products, 200 orders, 150 sales, 50 purchases
- Referential integrity maintained — products seeded first, then dependent entities

### Service Migration

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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is maintaining API contract compatibility so frontends continue working unchanged.

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `data/generators/*.ts`: 5 faker-based generators with referential integrity — adapt for DB seeding
- `data/types.ts`: TypeScript interfaces defining entity shapes — basis for Drizzle schema
- `common/dto/paginated-response.dto.ts`: Pagination helper — reuse with DB query results
- `common/dto/pagination-query.dto.ts`: Query parameter validation — unchanged

### Established Patterns

- NestJS module pattern: each domain has `*.module.ts`, `*.service.ts`, `*.controller.ts`
- Services inject other services via NestJS DI (DashboardService depends on all 5 domain services)
- DTOs with class-validator for query parameter validation
- `seedAll()` called in each service constructor — this pattern gets replaced by Drizzle DB injection

### Integration Points

- `AppModule` imports all domain modules — will need a new `DatabaseModule` or `DrizzleModule`
- Each service constructor currently calls `seedAll()` — replace with injected Drizzle DB instance
- Controllers and DTOs stay unchanged — only service internals change
- `package.json` needs drizzle-orm, drizzle-kit, postgres driver dependencies

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 05-database-integration_
_Context gathered: 2026-03-02_
