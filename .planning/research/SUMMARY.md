# Project Research Summary

**Project:** Objetiva Comercios Admin v1.1 — Modelo Articulos + Inventario
**Domain:** Core data model migration (products/inventory -> articulos/existencias/inventarios) in NestJS + Drizzle + Next.js monorepo
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

v1.1 is a structural migration, not a greenfield build. The existing monorepo (NestJS backend, Next.js web, Capacitor mobile) replaces the v1.0 `products` + `inventory` tables with a richer domain model: `articulos` (text PK using ERP business codes), `depositos` (multi-warehouse locations), `existencias` (stock per article per warehouse), and `inventarios` (periodic physical count events). No new libraries are required -- Drizzle ORM v0.45.x already supports every column type needed (text PKs, numeric precision, JSONB, arrays). The migration is entirely at the schema and application layer.

The recommended approach is a clean-cut migration: drop old tables, create new ones, re-seed. This is safe because v1.0 has no production data -- only seed data that will be regenerated. Attempting incremental ALTER TABLE migrations adds complexity for zero benefit in development. The build order follows strict dependency chains: schema foundation and articulos/depositos first, then existencias (depends on both), then downstream module updates (orders/sales/purchases/dashboard), and finally inventarios (the only genuinely new domain capability, depends on everything else).

The primary risks are around the FK type change (integer `productId` to text `articuloCodigo`) and type system drift across three apps. The FK change affects order_items, sale_items, and purchase_items -- all must be rewritten simultaneously. Three independent type definitions (backend Drizzle inference, web types, mobile types) will diverge during migration if not updated together. A critical secondary risk is scope creep: the `numeric(10,2)` monetary migration should be explicitly deferred to avoid compounding the schema change with arithmetic-breaking type changes across the entire codebase.

## Key Findings

### Recommended Stack

No new dependencies. Drizzle ORM v0.45.x handles text primary keys, numeric precision columns, JSONB, and array columns natively. The only import changes are adding `numeric`, `jsonb`, and `sql` from existing packages. See [STACK.md](STACK.md) for detailed column type patterns.

**Core technologies (unchanged):**

- **Drizzle ORM v0.45.x**: Schema definition, migrations, query builder -- all new column types (`text().primaryKey()`, `numeric()`, `jsonb()`, `.array()`) supported out of the box
- **drizzle-kit v0.31.x**: Custom migration generation via `generate --custom` for data migration SQL when needed
- **No new libraries needed**: decimal.js, uuid, nanoid, and additional migration tools explicitly evaluated and rejected

**Critical stack decision:** Keep `doublePrecision` for monetary fields in v1.1. Switching to `numeric(10,2)` returns strings in JS without `mode: 'number'`, breaking all arithmetic across the codebase. This is a separate refactor for a future milestone.

### Expected Features

See [FEATURES.md](FEATURES.md) for full feature landscape, anti-features list, and UX patterns by domain.

**Must have (table stakes):**

- Articulos full CRUD with text PK (`codigo`), multiple code identifiers (SKU, barcode, ERP code), multi-column search
- Active/inactive toggle with soft-delete semantics (historical references in orders/sales remain valid)
- Server-side pagination and filtering (v1.0 fetches all products client-side -- breaks at scale)
- Depositos CRUD (simple warehouse/location entity, typically 2-10 records)
- Existencias per articulo per deposito with low-stock alerts, min/max thresholds
- Dual view modes for stock: by warehouse (warehouse manager) and by article (product manager)
- Inventarios lifecycle: create count event, assign sectors, record counts, view discrepancies, finalize
- Dashboard KPI updates to query new data model

**Should have (differentiators for v1.1):**

- Rich product properties (marca, modelo, talle, color, material) as flat fields on articulos
- Image URL fields on articulos (store URLs; defer upload UI)
- OCR data storage (JSONB column for future mobile scanning)

**Defer to v1.2+:**

- Mobile barcode scanning for inventarios (high complexity Capacitor plugin work)
- Auto-apply discrepancies to stock (dangerous operation; show discrepancies only in v1.1)
- Bulk CSV import (useful but not blocking)
- Stock transfers between depositos (natural next step, explicitly out of scope)
- `numeric(10,2)` monetary migration (separate refactor to avoid arithmetic breakage)

### Architecture Approach

The migration replaces 2 tables and modifies 3 FK columns across the entire stack (schema, 6+ backend modules, web types/pages/API layer, mobile pages). The new model introduces 4 new tables (`articulos`, `depositos`, `existencias`, `inventarios`) plus 3 sub-tables for inventarios (`inventarios_articulos`, `inventario_sectores`, `dispositivos_moviles`). Backend modules follow NestJS standard patterns with exported services for cross-module injection. The text PK (`codigo`) simplifies route handling (no ParseIntPipe needed) but requires updating every downstream FK reference from integer to text. See [ARCHITECTURE.md](ARCHITECTURE.md) for full schema design, data flow, and integration impact analysis.

**Major components:**

1. **ArticulosModule** -- replaces ProductsModule. CRUD with text PK routes, multi-code search
2. **DepositosModule** -- new, simple CRUD for warehouse locations
3. **ExistenciasModule** -- replaces InventoryModule. Deposito-aware stock queries with joins
4. **InventariosModule** -- entirely new. Physical count event lifecycle management
5. **Modified modules** -- OrdersModule, SalesModule, PurchasesModule (FK change), DashboardModule (service swap)

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for all 14 pitfalls with detection and prevention strategies.

1. **Drizzle `generate` treats table replacement as DROP + CREATE** -- auto-generated migrations cascade-delete all order/sale/purchase items. Prevention: use `db:push` for dev (clean cut) or hand-write phased migration SQL for production.
2. **Integer-to-text FK type mismatch** -- cannot ALTER COLUMN from integer productId to text articuloCodigo. Prevention: clean cut with db:push in dev; in production, add new column, populate via mapping, add FK, drop old column.
3. **Seed script idMap pattern breaks with text PKs** -- current `Map<number, number>` mapping is meaningless for text codes. Prevention: rewrite all generators to produce deterministic `codigo` values; remove idMap entirely.
4. **ParseIntPipe on controller routes rejects text PKs** -- runtime 400 errors on all articulos routes. Prevention: remove ParseIntPipe, use plain string params.
5. **Three-way type drift** -- backend, web, and mobile define types independently. During migration, one gets updated while others lag, causing runtime mismatches. Prevention: update all three in the same commit, or consolidate to `packages/types/`.

## Implications for Roadmap

Based on research, the suggested phase structure follows a strict dependency chain determined by the data model.

### Phase 1: Schema Foundation + Core Entities (Articulos + Depositos)

**Rationale:** Everything depends on the schema. Articulos is the central entity referenced by every other module. Depositos is the simplest new entity and unblocks existencias. These must exist before any other work can begin.
**Delivers:** New Drizzle schema with all tables defined, ArticulosModule with full CRUD (text PK routes, multi-code search), DepositosModule with simple CRUD, seed generators rewritten, old ProductsModule and InventoryModule removed.
**Addresses:** Articulos CRUD, multi-code identifiers, active/inactive toggle, depositos CRUD, rich product properties (from FEATURES.md table stakes)
**Avoids:** Pitfall #1 (use db:push for clean cut), Pitfall #4 (rewrite seed from scratch), Pitfall #5 (no ParseIntPipe on new controllers), Pitfall #10 (use sql template for array defaults)

### Phase 2: Existencias Module + Frontend Migration

**Rationale:** Existencias depends on articulos + depositos being stable. Frontend must be updated to use new types and API endpoints. This phase makes the app functional again after the schema break in Phase 1.
**Delivers:** ExistenciasModule with deposito-aware queries, web and mobile pages updated for articulos and existencias, new TypeScript types across all apps, API layer updated with new endpoints.
**Addresses:** Stock per deposito, low-stock alerts, dual view modes, server-side pagination (from FEATURES.md table stakes)
**Avoids:** Pitfall #8 (update all three type systems together), Pitfall #11 (update API URLs alongside backend), Pitfall #12 (update TanStack Table column definitions)

### Phase 3: Downstream Module Updates (Orders/Sales/Purchases/Dashboard)

**Rationale:** These modules have FK dependencies on articulos. Must update after articulos is stable. Mechanical but wide-reaching -- touches 23+ files with productId references.
**Delivers:** All item tables reference articuloCodigo (text FK), dashboard KPIs query new model, seed data fully consistent across all entities.
**Addresses:** FK migration, dashboard stats updates, terminology alignment (totalProducts -> totalArticulos)
**Avoids:** Pitfall #2 (clean FK column replacement), Pitfall #7 (update productId references across all files), Pitfall #14 (rename KPI fields)

### Phase 4: Inventarios Module

**Rationale:** The only genuinely new domain capability in v1.1. Depends on existencias for discrepancy calculations. Most complex module with lifecycle state machine. Can be deferred to v1.2 without breaking core operations if timeline pressure exists.
**Delivers:** Physical count event lifecycle (create, assign sectors, record counts, view discrepancies, finalize), inventarios web section with discrepancy table, basic mobile inventarios page, navigation updates.
**Addresses:** Inventory count events, sector-based counting, discrepancy view, status workflow (from FEATURES.md table stakes)
**Avoids:** Pitfall #9 (test JSONB roundtrip before building on top), Pitfall #10 (use sql template for array defaults)

### Phase Ordering Rationale

- **Dependency chain is strict:** articulos -> depositos -> existencias -> inventarios. No phase can start before its dependencies are complete.
- **Phases 2 and 3 can overlap** if treated as separate concerns (existencias/frontend vs downstream FK updates), but are safer run sequentially to avoid merge conflicts in shared files (schema.ts, seed.ts, api.ts).
- **Phase 4 is the safety valve:** inventarios is entirely new functionality. If v1.1 runs long, it can be cut to v1.2 without breaking the core migration deliverable.
- **The clean-cut approach (db:push + re-seed)** eliminates migration complexity entirely for development. Production migration scripts should only be written when approaching deployment.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (Inventarios):** Complex domain with lifecycle management, sector-based counting, and discrepancy calculations. Edge cases include articles found but not in system, articles in system but not counted, and partial counts. Recommend `/gsd:research-phase` or `/gsd:discuss-phase` before planning.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Schema + Articulos + Depositos):** All column types verified against official Drizzle docs. Standard NestJS CRUD module pattern.
- **Phase 2 (Existencias + Frontend):** Standard join queries, standard frontend CRUD migration. No novel patterns.
- **Phase 3 (Downstream Updates):** Mechanical FK replacement across known files. No architectural decisions needed.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                    |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack        | HIGH       | No new dependencies. All column types verified against official Drizzle docs and GitHub issues. Zero uncertainty.                                                        |
| Features     | HIGH       | Based on industry patterns (ERP, multi-warehouse, physical inventory), competitor analysis, and direct codebase analysis of v1.0. Clear table stakes vs differentiators. |
| Architecture | HIGH       | Based on direct codebase analysis of all layers (schema, 7 services, 6 API functions, 9 mobile pages). Schema design follows established Drizzle/NestJS patterns.        |
| Pitfalls     | HIGH       | 10 of 14 pitfalls verified against official docs or directly observable in codebase. Remaining 4 based on documented GitHub issues.                                      |

**Overall confidence:** HIGH

### Gaps to Address

- **Production migration strategy:** Research covers dev workflow (db:push + re-seed). If production data exists before v1.1 ships, a proper phased migration script must be written. Defer this decision until deployment planning.
- **JSONB double-serialization:** Pitfall #9 is version-dependent (postgres-js driver). Must be tested with the project's specific driver version during Phase 4 implementation.
- **Mobile inventarios UX:** The counting workflow on mobile (manual code entry vs barcode scanning) needs UX decisions during Phase 4 planning. Barcode scanning is flagged as v1.2 but the manual entry UX still needs design.
- **Type consolidation timing:** Moving shared types to `packages/types/` before migration prevents three-way drift. Could be Phase 0 prep work or handled inline during Phase 2. Decision needed during roadmap creation.
- **Monetary field migration:** Deferred to post-v1.1 but should be tracked. The `mode: 'number'` flag in Drizzle's `numeric()` type solves the string-return issue, but bundling it with the articulos migration adds unnecessary risk.

## Sources

### Primary (HIGH confidence)

- [Drizzle ORM PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) -- text PK, numeric, JSONB, array syntax
- [Drizzle ORM custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations) -- generate --custom workflow
- [Drizzle ORM relations](https://orm.drizzle.team/docs/relations) -- text FK in relations API
- [Drizzle ORM migrations](https://orm.drizzle.team/docs/migrations) -- migration generation and execution
- [Drizzle empty array default guide](https://orm.drizzle.team/docs/guides/empty-array-default-value) -- sql template for array defaults
- Direct codebase analysis of schema.ts, seed.ts, 7 backend services, web types, mobile types

### Secondary (MEDIUM confidence)

- [Drizzle numeric returns strings #1042](https://github.com/drizzle-team/drizzle-orm/issues/1042) -- mode: 'number' behavior
- [Drizzle JSONB double-serialization #724](https://github.com/drizzle-team/drizzle-orm/issues/724) -- version-dependent bug
- [Drizzle column rename bug #3826](https://github.com/drizzle-team/drizzle-orm/issues/3826) -- no rename detection in generate

### Industry Sources (HIGH confidence for feature decisions)

- NetSuite, Verdantis -- item master data management patterns
- Finale Inventory, Kardex, Dynamic Inventory, Veeqo -- multi-warehouse management
- ScienceSoft, Bitergo, Count-Inventory -- physical inventory counting software
- POSNation, SelectHub -- cycle count best practices
- Actualog, Linnworks -- product identification codes and SKU management

---

_Research completed: 2026-03-05_
_Ready for roadmap: yes_
