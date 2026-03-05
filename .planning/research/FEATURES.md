# Feature Landscape

**Domain:** Commercial admin system -- articulos management, multi-warehouse stock (existencias), periodic physical inventory counting (inventarios)
**Researched:** 2026-03-05
**Scope:** v1.1 milestone features only (articulos, existencias, inventarios, depositos)

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Articulos (Product Master Data)

| Feature                                                            | Why Expected                                                                                          | Complexity | Notes                                                                                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Full CRUD (create, read, update, soft-delete via `activo` flag)    | Basic data management -- every admin system needs this                                                | Low        | Replaces current products CRUD. PK is `codigo` (text), not numeric ID                                             |
| Multiple code identifiers (sku, codigo, codigo_barras, erp_codigo) | ERP-aligned businesses always have multiple product codes                                             | Low        | Each must be independently searchable. `codigo` is PK, others are secondary lookups                               |
| Search/filter by any code or name                                  | Users look up articles by whichever code they have in hand (barcode label, ERP printout, SKU sticker) | Med        | Multi-column search across codigo, sku, codigo_barras, erp_codigo, descripcion. Current v1.0 filters by name only |
| Active/inactive toggle                                             | Products are retired, not deleted -- historical references (orders, sales) must remain valid          | Low        | `activo` boolean flag. Default list view shows active only, with toggle to show all                               |
| Server-side pagination and filtering                               | Article catalogs grow to thousands; client-side filtering breaks down                                 | Med        | Current v1.0 fetches all products client-side. Must move to server-side for articulos                             |
| Category/classification display                                    | Users need to group and browse by category                                                            | Low        | Existing `category` field maps to new model                                                                       |
| Price and cost display                                             | Core commercial data -- margin visibility at a glance                                                 | Low        | `precio_venta`, `precio_costo` fields. Current v1.0 already shows price/cost                                      |
| Detail view (sheet or drawer)                                      | Users need to see all fields for a single article without leaving the list                            | Low        | Current v1.0 uses side sheet (ProductSheet). Keep this pattern for consistency                                    |

### Existencias (Stock per Deposito)

| Feature                                  | Why Expected                                                                             | Complexity | Notes                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Stock quantity per article per deposito  | Core multi-warehouse concept -- "how many of X do I have in warehouse Y?"                | Med        | Replaces flat `inventory` table. Composite key: articulo_codigo + deposito_id                |
| Total stock aggregation across depositos | Users need "total stock for article X across all locations"                              | Low        | Computed in API response or SQL aggregation                                                  |
| Low stock alerts                         | Current v1.0 dashboard already has low stock alerts; removing them would be a regression | Med        | Must be recalculated per deposito against min_stock threshold, then aggregated for dashboard |
| Stock list view filtered by deposito     | Warehouse managers work with one location at a time                                      | Med        | Dropdown or tab filter by deposito at top of existencias table                               |
| Stock list view filtered by article      | "Show me where article X lives across all depositos" -- the inverse view                 | Low        | Both views (by deposito and by article) are essential for multi-warehouse                    |
| Last restock date tracking               | Audit trail for when stock was last replenished                                          | Low        | `ultima_reposicion` timestamp field                                                          |
| Min/max stock thresholds per existencia  | Define alerting thresholds per article-deposito combination                              | Low        | `stock_minimo`, `stock_maximo` fields. Current v1.0 already has min/max stock                |

### Depositos (Warehouses/Locations)

| Feature                           | Why Expected                                                                                 | Complexity | Notes                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| CRUD for depositos                | Must be able to add/edit/deactivate warehouse locations                                      | Low        | Simple entity: nombre, direccion, activo. Few records (typically 2-10 locations) |
| List depositos with stock summary | Quick view of total items and total distinct articles per warehouse                          | Low        | Aggregate count from existencias                                                 |
| Prevent deletion when referenced  | Referential integrity -- can't remove a warehouse that has stock records or inventory events | Low        | Soft-delete via `activo` flag, or FK constraint with restrict                    |

### Inventarios (Physical Count Events)

| Feature                                      | Why Expected                                                                                   | Complexity | Notes                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create inventory count event                 | "We're doing a physical count on March 15 for Deposito Central"                                | Med        | Event entity with fecha, deposito_id, estado (pendiente / en_curso / finalizado / cancelado)                                                                                              |
| Assign sectors/zones to a count event        | Physical counts are organized by warehouse zones, aisles, or shelving sections                 | Med        | Sectors subdivide a deposito for a specific count event. Each sector gets its own counting scope                                                                                          |
| Record per-article counts within a sector    | The actual counting -- "I counted 47 units of article ABC in sector A3"                        | Med        | Detail table: inventario_id + articulo_codigo + sector + cantidad_contada                                                                                                                 |
| View discrepancies (counted vs system stock) | The whole point of physical inventory -- finding mismatches between real and system quantities | High       | Compare inventario_detalle.cantidad_contada against existencias.cantidad for same articulo+deposito. Must handle articles found but not in system, and articles in system but not counted |
| Finalize/close a count event                 | Lock the count so no more edits happen after the counting period ends                          | Med        | State transition: en_curso -> finalizado. After finalization, counts become read-only                                                                                                     |
| Inventory event history                      | "Show me all past counts for Deposito Central"                                                 | Low        | Simple filtered list by deposito and/or date range                                                                                                                                        |
| Status-based workflow                        | Clear visual progression: pendiente -> en_curso -> finalizado (or cancelado)                   | Low        | Status badges, prevent out-of-order transitions                                                                                                                                           |

---

## Differentiators

Features that set product apart. Not expected but valued.

| Feature                                                         | Value Proposition                                                                                                            | Complexity | Notes                                                                                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product images (foto_producto + foto_etiqueta arrays)           | Visual identification saves time -- warehouse staff recognize products by sight, label photos help with OCR and verification | Med        | Multiple images per article. Store as URL arrays (jsonb column). Image upload with preview in detail view. Depends on file storage strategy (local or S3-compatible)            |
| Rich product properties (marca, modelo, talle, color, material) | Variant-aware catalog without a full variant/SKU matrix -- filter by brand, size, color in list view                         | Low        | Flat fields on articulos, not a separate variants table. Each filterable in the list. Avoids combinatorial variant explosion                                                    |
| OCR data storage (datos_ocr jsonb)                              | Future-proofing for automated label scanning on mobile -- store raw OCR output alongside the article                         | Low        | JSON column, read-only display in article detail view. Input comes from mobile app or external process. No OCR processing in admin                                              |
| Barcode scanner input on mobile (inventarios counting)          | Physical counts with barcode scanning are dramatically faster than manual code entry                                         | High       | Capacitor barcode plugin integration. Critical for inventarios UX on mobile. Can defer to later in v1.1 or to v1.2 without blocking core flow                                   |
| Apply discrepancies to stock automatically                      | After physical count finalization, auto-adjust existencias quantities to match counted values                                | High       | "Apply adjustments" action on finalized inventory. Creates stock adjustment audit records. Dangerous operation requiring confirmation dialog, reason field, and audit log entry |
| Mobile device assignment per inventario                         | Track which phones/tablets are assigned to which sectors during a count                                                      | Low        | `dispositivos_moviles` field on inventario entity. Informational/organizational, not enforced                                                                                   |
| Bulk article import via CSV                                     | Catalogs with 500+ articles need bulk import during ERP migration, not one-by-one CRUD                                       | Med        | Parse CSV, validate code uniqueness, upsert. Common request when migrating from spreadsheets or ERP export                                                                      |
| Print/export inventory count sheets                             | Generate PDF or printable view of articles to count per sector, for hybrid digital+paper counting teams                      | Med        | Useful for teams not fully mobile. Secondary to digital counting flow                                                                                                           |

---

## Anti-Features

Features to explicitly NOT build in v1.1.

| Anti-Feature                                          | Why Avoid                                                                                                                                                                                 | What to Do Instead                                                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full variant/SKU matrix (size x color = N child SKUs) | Massive complexity for a commercial admin. Combinatorial explosion of variants. The flat properties approach (talle, color, material as fields on each articulo) covers the real use case | Keep properties as flat fields on articulos. Each unique combination is its own articulo with its own codigo. Simple and ERP-aligned             |
| Automatic reorder/purchase generation from low stock  | Scope creep into procurement automation. v1.1 is about the data model migration, not workflow automation                                                                                  | Show low-stock alerts on dashboard. Manual purchase creation stays in the purchases module                                                       |
| Real-time stock sync with external ERP                | Integration layer is out of scope. The `erp_codigo` field is for human reference, not live bidirectional sync                                                                             | Store erp_codigo for lookup. Bulk CSV import/export if migration needed                                                                          |
| Lot/batch/serial number tracking                      | Adds significant per-unit tracking complexity. Not needed for general commercial operations at this scale                                                                                 | Track aggregate quantity per article per deposito, not individual units                                                                          |
| Expiration date management                            | Only relevant for perishable goods. General commercial admin doesn't need this                                                                                                            | Omit entirely unless user explicitly requests later                                                                                              |
| FIFO/LIFO/weighted average costing methods            | Accounting-level inventory valuation is a separate domain. The admin tracks operational quantities, not accounting valuations                                                             | Single cost price per article (precio_costo). Accounting valuation handled in external tools                                                     |
| Barcode generation/printing                           | Generating and printing barcodes is a specialized tool. The admin reads/stores barcode values, it doesn't create them                                                                     | Store codigo_barras as text field. External label printing tools handle barcode generation                                                       |
| Multi-currency pricing                                | Explicitly out of scope per PROJECT.md (single locale es-MX, single currency MXN)                                                                                                         | All prices in MXN. Period                                                                                                                        |
| Stock transfer between depositos                      | Natural next step for multi-deposito but not in v1.1 explicit scope. Adds transfer workflow, audit trail, and partial-transfer edge cases                                                 | Defer to v1.2. For v1.1, stock adjustments are per-deposito only (manual increase/decrease)                                                      |
| Inventory count on web (desktop counting)             | Physical counts happen on the warehouse floor with mobile devices, not at a desk                                                                                                          | Web admin creates/manages/reviews inventory events. Actual article-by-article counting is a mobile activity. Web shows results and discrepancies |

---

## Feature Dependencies

```
Depositos CRUD ──> Existencias (existencias.deposito_id references depositos)
Articulos CRUD ──> Existencias (existencias.articulo_codigo references articulos)
Articulos CRUD ──> Inventario detalle (counts reference articulo_codigo)
Depositos CRUD ──> Inventarios (each count event targets a deposito)
Existencias data ──> Inventario discrepancies (comparison needs current stock)
Articulos CRUD ──> FK migration (orders/sales/purchases must reference articulos.codigo)

Recommended build order:
  1. Depositos CRUD (no dependencies, simplest entity, unblocks existencias + inventarios)
  2. Articulos CRUD (no dependencies on new tables, core entity, unblocks everything)
  3. Existencias (depends on depositos + articulos being in place)
  4. FK migration (orders/sales/purchases point to articulos.codigo instead of products.id)
  5. Inventarios (depends on depositos + articulos + existencias for discrepancy calc)
  6. Dashboard KPI updates (depends on new data model being fully in place)
  7. Seed data rewrite (depends on all new tables existing)
```

---

## MVP Recommendation

### Build in v1.1 (required):

1. **Depositos CRUD** -- simplest entity, unblocks existencias and inventarios. 2-3 API endpoints + simple list/form UI. Half a day of work.
2. **Articulos CRUD with all code identifiers** -- core entity replacing products. Multi-code search is table stakes. Rich properties (marca, modelo, talle, color, material) included from day one since they're just columns.
3. **Existencias per deposito** -- replaces flat inventory table. Two view modes: by deposito (warehouse manager view) and by article (product manager view). Low stock alerts feed the dashboard.
4. **FK migration** -- orders/sales/purchases updated to reference articulos.codigo. Data migration script for existing seed data. Critical for referential integrity.
5. **Inventarios with sector-based counting and discrepancy view** -- the genuinely new capability that didn't exist in v1.0. Web admin creates events, views results and discrepancies. Mobile counting input is a stretch goal.
6. **Dashboard updates** -- low stock alerts and KPI stats cards updated to query new model (existencias instead of inventory, articulos instead of products).

### Defer to v1.2+:

- **Mobile barcode scanning for inventarios**: High complexity Capacitor plugin work. The counting flow works with manual code entry first.
- **Apply discrepancies to stock**: Dangerous auto-adjustment operation. v1.1 shows discrepancies; humans adjust manually via existencias CRUD.
- **Bulk CSV import**: Useful for real data migration but not blocking. Manual CRUD + seed data sufficient for v1.1 validation.
- **Stock transfers between depositos**: Natural feature but explicitly out of v1.1 scope.
- **Print/export count sheets**: Nice-to-have, not blocking core inventory flow.
- **Image upload for articulos**: Can store URL fields from day one but defer actual upload UI/storage to later.

---

## Existing Feature Impact

v1.1 migration touches these existing v1.0 features:

| Existing Feature                       | Impact                | Action Needed                                                                                                          |
| -------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Products list + detail (articles page) | **Replaced entirely** | Remove products table/endpoints/UI. Replace with articulos. Same route `/articles`                                     |
| Inventory list (inventory page)        | **Replaced entirely** | Remove inventory table/endpoints/UI. Replace with existencias. Route changes to `/existencias` or stays `/inventory`   |
| Dashboard low stock alerts             | **Modified**          | Query existencias instead of inventory. Aggregate across depositos for total low-stock view                            |
| Dashboard stats cards                  | **Modified**          | "Total Products" becomes "Total Articulos". Stock value from existencias. Revenue metrics unchanged                    |
| Orders + order items                   | **Modified**          | FK `product_id` (int) changes to `articulo_codigo` (text). Migration script needed                                     |
| Sales + sale items                     | **Modified**          | FK `product_id` (int) changes to `articulo_codigo` (text). Migration script needed                                     |
| Purchases + purchase items             | **Modified**          | FK `product_id` (int) changes to `articulo_codigo` (text). Migration script needed                                     |
| Web type definitions                   | **Rewritten**         | New TypeScript interfaces for Articulo, Existencia, Inventario, Deposito replacing Product, Inventory                  |
| Seed data                              | **Rewritten**         | New seed for articulos (with all code fields + properties), depositos, existencias, inventarios with sample counts     |
| Backend modules (NestJS)               | **Replaced + new**    | Products module and inventory module replaced. New: articulos, existencias, depositos, inventarios modules             |
| Navigation sidebar                     | **Modified**          | New nav items: Articulos, Existencias, Inventarios, Depositos (in settings or standalone). Remove: Products, Inventory |

---

## UX Patterns by Domain

### Articulos UX

- **List view**: Dense table with columns for codigo, descripcion, marca, precio_venta, activo status badge. Row click opens detail sheet (current pattern).
- **Multi-code search**: Single search input that queries across all code fields (codigo, sku, codigo_barras, erp_codigo, descripcion). Placeholder text: "Buscar por codigo, SKU, codigo de barras, nombre..."
- **Detail sheet**: Tabs or sections grouping: Identificacion (all codes), Propiedades (marca/modelo/talle/color/material), Precios (venta/costo/margen), Imagenes (if available), Estado (activo toggle + timestamps).
- **Active filter**: Toggle or chip filter defaulting to "Solo activos". Common pattern in ERP-style admin.

### Existencias UX

- **Primary view**: Table showing articulo_codigo, descripcion, deposito, cantidad, stock_minimo, estado badge (en_stock / bajo_stock / sin_stock). Filterable by deposito dropdown at top.
- **Secondary view**: Article-centric -- select an article, see stock across all depositos as a small sub-table or card grid.
- **Stock status badges**: Green (en_stock), yellow/amber (bajo_stock when cantidad <= stock_minimo), red (sin_stock when cantidad = 0).
- **Inline edit**: Quantity adjustments should be quick -- either inline edit or a small modal with current quantity, adjustment (+/-), and reason field.

### Inventarios UX

- **Event list**: Table of inventory events with fecha, deposito name, estado badge, total articles counted, discrepancy count. Click to open detail.
- **Event detail**: Header with event metadata + status controls. Below: tabs for "Sectores" (list of sectors with progress) and "Resultados" (full article-by-article comparison table).
- **Discrepancy table**: Three columns that matter: articulo, cantidad_sistema, cantidad_contada, diferencia. Color-code diferencia (red for negative = missing stock, blue for positive = surplus). Sort by absolute difference descending.
- **Status workflow**: Visual stepper or badge progression: Pendiente -> En Curso -> Finalizado. Cancel available from Pendiente or En Curso states only.
- **Create event wizard**: Step 1 = select deposito + fecha. Step 2 = define sectors (names/descriptions for zones). Step 3 = confirm and create.

---

## Sources

- [NetSuite: What Is Item Master Data?](https://www.netsuite.com/portal/resource/articles/inventory-management/item-master-data.shtml)
- [Verdantis: In-depth Guide to Item Master Data Management](https://www.verdantis.com/item-data-management/)
- [Finale Inventory: Multi-Warehouse Inventory Management](https://www.finaleinventory.com/multi-warehouse-inventory-management)
- [Kardex: Centralized Inventory Management for Multi-Warehouse Operations](https://www.kardex.com/en-us/blog/centralized-inventory-management)
- [ScienceSoft: Custom Inventory Counting Software Features](https://www.scnsoft.com/scm/inventory-counting-software)
- [Bitergo: Inventory Counting App](https://bitergo.com/wms-inventory)
- [Count-Inventory: Physical Inventory Count Software](https://www.count-inventory.com/)
- [POSNation: Cycle Counts Best Practices 2026](https://www.posnation.com/blog/cycle-counts-best-practices)
- [SelectHub: What Is A Cycle Count?](https://www.selecthub.com/inventory-management/cycle-count/)
- [Actualog: Product Identification Codes in ERP](https://blog.actualog.com/product-identification-codes-in-erp-pim-and-b2b-marketplaces/)
- [Linnworks: SKU Numbers Best Practices](https://www.linnworks.com/blog/how-to-create-sku-numbers-for-your-inventory/)
- [Dynamic Inventory: Warehouse & Multi Location Management](https://www.dynamicinventory.net/warehouse-location-management/)
- [Veeqo: Multi-Warehouse Management Guide](https://www.veeqo.com/blog/multi-warehouse-management-guide)

---

_Feature research for v1.1 milestone: Articulos + Existencias + Inventarios_
_Researched: 2026-03-05_
_Research confidence: HIGH (based on industry patterns, competitor analysis, current codebase analysis)_
