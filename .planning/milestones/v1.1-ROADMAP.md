# Roadmap: Objetiva Comercios Admin

## Milestones

- ✅ **v1.0 MVP** — Phases 1-13 (shipped 2026-03-04) — [Full details](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Modelo Articulos + Inventario** — Phases 14-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-13) — SHIPPED 2026-03-04</summary>

- [x] Phase 1: Foundation & Monorepo (4/4 plans) — completed 2026-01-24
- [x] Phase 2: Backend API with Mock Data (5/5 plans) — completed 2026-03-01
- [x] Phase 3: Web Application (8/8 plans) — completed 2026-01-26
- [x] Phase 4: Mobile Application (4/4 plans) — completed 2026-03-02
- [x] Phase 5: Database Integration (3/3 plans) — completed 2026-03-02
- [x] Phase 6: Polish & Production (4/4 plans) — completed 2026-03-02
- [x] Phase 7: Fix Integration Bugs (2/2 plans) — completed 2026-03-02
- [x] Phase 8: Verify & Close Phases 3+4 (3/3 plans) — completed 2026-03-02
- [x] Phase 9: Fix Mobile Purchase & Login Bugs (2/2 plans) — completed 2026-03-02
- [x] Phase 10: Code Quality & Type Safety Cleanup (4/4 plans) — completed 2026-03-03
- [x] Phase 11: Fix Sales Detail View Crash (1/1 plans) — completed 2026-03-03
- [x] Phase 12: Fix Dashboard Links & Doc Sync (1/1 plans) — completed 2026-03-03
- [x] Phase 13: Tech Debt Cleanup (1/1 plans) — completed 2026-03-03

</details>

### 🚧 v1.1 Modelo Articulos + Inventario (In Progress)

**Milestone Goal:** Replace products/inventory models with articulos/existencias/inventarios to align with the real business data model. Multi-deposito stock, physical inventory counts, and downstream FK migration.

- [x] **Phase 14: Schema Foundation + Articulos + Depositos** — New Drizzle schema, articulos full CRUD with text PK, depositos CRUD, seed rewrite (completed 2026-03-05)
- [x] **Phase 15: Existencias** — Stock per articulo per deposito with low-stock alerts and dual view modes (completed 2026-03-05)
- [x] **Phase 16: Downstream Migration + Dashboard + Navigation** — FK updates across orders/sales/purchases, dashboard KPIs on new model, nav restructure (completed 2026-03-05)
- [x] **Phase 17: Inventarios** — Physical inventory count events with sectors, dispositivos, discrepancy view, status workflow (completed 2026-03-06)
- [x] **Phase 18: Fix Inventarios Article Count Display** — Fix field name mismatch and missing list aggregation for inventario article counts (completed 2026-03-06)

## Phase Details

### Phase 14: Schema Foundation + Articulos + Depositos

**Goal**: Users can manage articulos and depositos through complete CRUD with the real business data model replacing the old products table
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: ART-01, ART-02, ART-03, ART-04, ART-05, ART-06, ART-07, ART-08, ART-09, ART-10, ART-11, ART-12, DEP-01, DEP-02, DEP-03, DEP-04, MIG-01, MIG-04, MIG-06, MIG-07, DEBT-01, DEBT-04
**Success Criteria** (what must be TRUE):

1. User can view a paginated, searchable list of articulos and search by any code (codigo, SKU, barcode, ERP code) or name from a single input
2. User can create, edit, view detail, and toggle active/inactive on articulos with all field groups (codes, properties, prices, images, ERP sync, origin tracking)
3. User can create, edit, view, and deactivate depositos (warehouses) with stock summary visible in the list
4. Running `pnpm db:push && pnpm db:seed` from apps/backend produces a working database with articulos, depositos, and all v1.0 tables updated to use the new schema
5. Settings write endpoints are protected with @Roles('admin') and unused shared package exports are removed

**Plans:** 5/5 plans complete

Plans:

- [ ] 14-01-PLAN.md — Schema + seed + tech debt (Drizzle tables, generators, settings RBAC, shared cleanup)
- [ ] 14-02-PLAN.md — Backend modules (ArticulosModule + DepositosModule with full CRUD)
- [ ] 14-03-PLAN.md — Web articulos list (ServerDataTable, search, filter, detail sheet)
- [ ] 14-04-PLAN.md — Web articulos form (create/edit pages with 6-section form)
- [ ] 14-05-PLAN.md — Web depositos settings (list + dialog in Settings sub-section)

### Phase 15: Existencias

**Goal**: Users can view and manage stock quantities per articulo per deposito with low-stock visibility
**Depends on**: Phase 14
**Requirements**: EXI-01, EXI-02, EXI-03, EXI-04, EXI-05, EXI-06, EXI-07, MIG-02, DEBT-02
**Success Criteria** (what must be TRUE):

1. User can view stock per articulo per deposito in a table with low-stock status badges when quantity falls below stock_minimo
2. User can filter existencias by deposito (warehouse manager view) and view stock for a specific articulo across all depositos (product manager view)
3. User can inline-edit stock quantities with adjustment reason and see total stock aggregation across depositos for each articulo
4. Web type interfaces are aligned with the new DB schema (no type drift between backend Drizzle inference and web/mobile types)

**Plans:** 3/3 plans complete

Plans:

- [ ] 15-01-PLAN.md — Schema + seed + backend module + web types + API client
- [ ] 15-02-PLAN.md — Tab navigation + KPI cards + "Por Deposito" view with inline editing
- [ ] 15-03-PLAN.md — "Por Articulo" matrix view + ArticuloSheet stock section

### Phase 16: Downstream Migration + Dashboard + Navigation

**Goal**: All existing modules (orders, sales, purchases, dashboard) work correctly with the new articulos model and navigation reflects the new section structure
**Depends on**: Phase 15
**Requirements**: MIG-03, DASH-01, DASH-02, DASH-03, NAV-01, NAV-02, NAV-03, DEBT-03
**Success Criteria** (what must be TRUE):

1. Order items, sale items, and purchase items reference articuloCodigo (text FK) and display articulo names correctly in their respective tables and detail views
2. Dashboard KPI cards show articulo counts (total, active) and low stock alerts query existencias aggregated across depositos
3. Web sidebar shows "Articulos", "Existencias", "Inventarios" replacing "Products" and "Inventory"; depositos accessible from settings or standalone nav item
4. Mobile navigation updated with new section names, routes, and all labels localized to Spanish

**Plans:** 4/4 plans complete

Plans:

- [x] 16-01-PLAN.md — Schema FK migration + seed update + old module cleanup
- [x] 16-02-PLAN.md — Dashboard KPI rewiring (ArticulosService + ExistenciasService)
- [x] 16-03-PLAN.md — Web + mobile navigation update and dead code cleanup
- [ ] 16-04-PLAN.md — Gap closure: mobile types + pages migration to articuloCodigo/articuloNombre

### Phase 17: Inventarios

**Goal**: Users can create and manage physical inventory count events with sector-based counting, device assignment, and discrepancy review
**Depends on**: Phase 16
**Requirements**: MIG-05, INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, INV-09
**Success Criteria** (what must be TRUE):

1. User can create an inventory count event linked to a deposito, define sectors/zones, and assign dispositivos moviles to count records
2. User can record per-articulo unit counts within an event and view discrepancies between counted quantities and system stock (existencias)
3. User can finalize/close an inventory event (locking counts as read-only) following the status workflow: pendiente -> en_curso -> finalizado (or cancelado)
4. User can view inventory event history filtered by date or status, and manage dispositivos moviles (CRUD)
5. Inventarios schema tables (inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles) exist in Drizzle with seed data

**Plans:** 5/5 plans complete

Plans:

- [ ] 17-01-PLAN.md — Schema tables + seed generators (Drizzle tables, type exports, generators, seed update)
- [ ] 17-02-PLAN.md — Backend modules (InventariosModule + DispositivosModule + sectores extension)
- [ ] 17-03-PLAN.md — Web types + API + tab nav + Dispositivos settings + Sectores in depositos settings
- [ ] 17-04-PLAN.md — Inventarios list page + create dialog + event detail with status transitions
- [ ] 17-05-PLAN.md — Counting page with articulo search, discrepancy table, inline editing

### Phase 18: Fix Inventarios Article Count Display

**Goal**: Fix integration issues where inventario article counts show 0 due to field name mismatch and missing list aggregation
**Depends on**: Phase 17
**Requirements**: INV-01, INV-04
**Gap Closure**: Closes INT-01 and INT-02 from v1.1 audit
**Success Criteria** (what must be TRUE):

1. Inventario detail page shows correct article count (field name aligned between backend and frontend)
2. Inventario list page shows correct article count per inventario (aggregation subquery in findAll)

**Plans:** 1/1 plans complete

Plans:

- [ ] 18-01-PLAN.md — Fix findOne field name mismatch and findAll article count aggregation

## Progress

**Execution Order:**
Phases execute in numeric order: 14 -> 15 -> 16 -> 17

| Phase                                  | Milestone | Plans Complete | Status     | Completed  |
| -------------------------------------- | --------- | -------------- | ---------- | ---------- |
| 1. Foundation & Monorepo               | v1.0      | 4/4            | Complete   | 2026-01-24 |
| 2. Backend API with Mock Data          | v1.0      | 5/5            | Complete   | 2026-03-01 |
| 3. Web Application                     | v1.0      | 8/8            | Complete   | 2026-01-26 |
| 4. Mobile Application                  | v1.0      | 4/4            | Complete   | 2026-03-02 |
| 5. Database Integration                | v1.0      | 3/3            | Complete   | 2026-03-02 |
| 6. Polish & Production                 | v1.0      | 4/4            | Complete   | 2026-03-02 |
| 7. Fix Integration Bugs                | v1.0      | 2/2            | Complete   | 2026-03-02 |
| 8. Verify & Close Phases 3+4           | v1.0      | 3/3            | Complete   | 2026-03-02 |
| 9. Fix Mobile Purchase & Login Bugs    | v1.0      | 2/2            | Complete   | 2026-03-02 |
| 10. Code Quality & Type Safety Cleanup | v1.0      | 4/4            | Complete   | 2026-03-03 |
| 11. Fix Sales Detail View Crash        | v1.0      | 1/1            | Complete   | 2026-03-03 |
| 12. Fix Dashboard Links & Doc Sync     | v1.0      | 1/1            | Complete   | 2026-03-03 |
| 13. Tech Debt Cleanup                  | v1.0      | 1/1            | Complete   | 2026-03-03 |
| 14. Schema + Articulos + Depositos     | v1.1      | 5/5            | Complete   | 2026-03-05 |
| 15. Existencias                        | 3/3       | Complete       | 2026-03-05 | -          |
| 16. Downstream + Dashboard + Nav       | 4/4       | Complete       | 2026-03-05 | -          |
| 17. Inventarios                        | 5/5       | Complete       | 2026-03-06 | -          |
| 18. Fix Inventarios Article Count      | 1/1       | Complete       | 2026-03-06 | -          |

---

_Roadmap created: 2026-01-23_
_Last updated: 2026-03-06 (Phase 18 planned: 1 plan)_
