# Requirements: Objetiva Comercios Admin v1.1

**Defined:** 2026-03-05
**Core Value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one

## v1.1 Requirements

Requirements for milestone v1.1: Modelo Articulos + Inventario. Each maps to roadmap phases.

### Articulos

- [x] **ART-01**: User can view a paginated list of articulos with server-side search and filtering
- [x] **ART-02**: User can search articulos by any code identifier (codigo, sku, codigo_barras, erp_codigo) or name from a single search input
- [x] **ART-03**: User can create a new articulo with all fields (codes, properties, prices, images, observations)
- [x] **ART-04**: User can edit an existing articulo's fields
- [x] **ART-05**: User can toggle an articulo's active/inactive status (soft-delete)
- [x] **ART-06**: User can view articulo detail in a sheet/drawer showing all fields organized by section (identification, properties, prices, images, state)
- [x] **ART-07**: User can filter the articulos list to show only active, only inactive, or all
- [x] **ART-08**: Articulo stores rich properties: marca, modelo, talle, color, material, presentacion, medida
- [x] **ART-09**: Articulo stores image URL arrays (imagenes_producto, imagenes_etiqueta) and OCR data (etiquetas_ocr, json_articulo as JSONB)
- [x] **ART-10**: Articulo stores ERP synchronization fields (erp_id, erp_codigo, erp_nombre, erp_precio, erp_costo, erp_unidades, erp_datos, erp_sincronizado, erp_fecha_sync)
- [x] **ART-11**: Articulo stores origin tracking fields (origin_source, origin_sync_id, origin_synced_at)
- [x] **ART-12**: Articulo uses text primary key (codigo) matching real business ERP model

### Depositos

- [x] **DEP-01**: User can view a list of depositos with stock summary (total items, distinct articulos)
- [x] **DEP-02**: User can create a new deposito (nombre, direccion, description)
- [x] **DEP-03**: User can edit an existing deposito
- [x] **DEP-04**: User can deactivate a deposito (soft-delete; cannot delete if referenced by existencias or inventarios)

### Existencias

- [x] **EXI-01**: User can view stock per articulo per deposito in a table with low-stock status badges
- [x] **EXI-02**: User can filter existencias by deposito (warehouse manager view)
- [x] **EXI-03**: User can view stock for a specific articulo across all depositos (product manager view)
- [x] **EXI-04**: User can see total stock aggregation across all depositos for each articulo
- [x] **EXI-05**: User can inline-edit stock quantities with adjustment reason
- [x] **EXI-06**: System displays low stock alerts when quantity falls below stock_minimo threshold
- [x] **EXI-07**: Existencias support min/max stock thresholds per articulo-deposito combination

### Inventarios

- [ ] **INV-01**: User can create an inventory count event (nombre, fecha, deposito, description)
- [ ] **INV-02**: User can define sectors/zones for a count event (nombre, columnas)
- [ ] **INV-03**: User can record per-articulo unit counts within an inventory event
- [ ] **INV-04**: User can view discrepancies between counted quantities and system stock (existencias)
- [ ] **INV-05**: User can finalize/close an inventory event (locks counts as read-only)
- [ ] **INV-06**: User can view inventory event history filtered by date or status
- [ ] **INV-07**: Inventory events follow a status workflow: pendiente -> en_curso -> finalizado (or cancelado)
- [ ] **INV-08**: User can manage dispositivos moviles (CRUD) for assignment during counting
- [ ] **INV-09**: User can assign dispositivos moviles to inventory count records

### Schema Migration

- [x] **MIG-01**: Products table replaced by articulos table with text PK (codigo) in Drizzle schema
- [x] **MIG-02**: Inventory table replaced by existencias table (articulo_codigo + deposito_id composite)
- [x] **MIG-03**: Order items, sale items, and purchase items FK updated from productId (integer) to articuloCodigo (text)
- [x] **MIG-04**: Depositos table created in Drizzle schema
- [ ] **MIG-05**: Inventarios model tables created (inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles)
- [x] **MIG-06**: Seed data rewritten for all new tables (articulos, depositos, existencias, inventarios with sample counts)
- [x] **MIG-07**: Articulo monetary fields (precio, costo) use numeric(10,2) type

### UI Navigation

- [x] **NAV-01**: Web sidebar updated: "Products" and "Inventory" replaced by "Articulos", "Existencias", "Inventarios"
- [x] **NAV-02**: Mobile navigation updated with new section names and routes
- [x] **NAV-03**: Depositos accessible from settings or as standalone nav item

### Dashboard

- [x] **DASH-01**: Dashboard KPI cards updated to query articulos instead of products (total count, active count)
- [x] **DASH-02**: Dashboard low stock alerts query existencias instead of inventory, aggregated across depositos
- [x] **DASH-03**: Dashboard revenue/sales metrics updated to reference articuloCodigo

### Tech Debt

- [x] **DEBT-01**: Settings RBAC gap fixed — PATCH/POST/DELETE /api/settings protected with @Roles('admin')
- [x] **DEBT-02**: Web type drift resolved — all type interfaces aligned with DB schema
- [x] **DEBT-03**: Mobile navigation labels localized to Spanish
- [x] **DEBT-04**: Unused shared package exports cleaned up (@objetiva/types, @objetiva/ui)

## v1.2+ Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Mobile Scanning

- **SCAN-01**: User can scan barcodes on mobile during inventory counting
- **SCAN-02**: Mobile camera integration via Capacitor barcode plugin

### Stock Operations

- **STOK-01**: User can auto-apply inventory discrepancies to existencias quantities
- **STOK-02**: User can transfer stock between depositos
- **STOK-03**: Stock adjustment creates audit trail with reason and user

### Import/Export

- **IMEX-01**: User can bulk import articulos via CSV
- **IMEX-02**: User can export/print inventory count sheets as PDF

### Monetary Migration

- **MONE-01**: All monetary fields across orders/sales/purchases migrated to numeric(10,2)

## Out of Scope

| Feature                                               | Reason                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Full variant/SKU matrix (size x color = N child SKUs) | Flat properties on articulos covers the real use case without combinatorial complexity |
| Automatic reorder/purchase generation from low stock  | Scope creep into procurement automation; v1.1 is data model migration                  |
| Real-time stock sync with external ERP                | Integration layer out of scope; erp_codigo is for reference, not live sync             |
| Lot/batch/serial number tracking                      | Per-unit tracking not needed for general commercial operations                         |
| Expiration date management                            | Only relevant for perishable goods                                                     |
| FIFO/LIFO/weighted average costing                    | Accounting-level valuation is a separate domain                                        |
| Barcode generation/printing                           | Admin reads/stores barcodes, doesn't create them                                       |
| Multi-currency pricing                                | Single locale (es-MX/MXN) per PROJECT.md                                               |
| Stock transfer between depositos                      | Natural next step but explicitly v1.2                                                  |
| Desktop inventory counting (web)                      | Physical counts happen on mobile; web creates/manages/reviews                          |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| ART-01      | Phase 14 | Complete |
| ART-02      | Phase 14 | Complete |
| ART-03      | Phase 14 | Complete |
| ART-04      | Phase 14 | Complete |
| ART-05      | Phase 14 | Complete |
| ART-06      | Phase 14 | Complete |
| ART-07      | Phase 14 | Complete |
| ART-08      | Phase 14 | Complete |
| ART-09      | Phase 14 | Complete |
| ART-10      | Phase 14 | Complete |
| ART-11      | Phase 14 | Complete |
| ART-12      | Phase 14 | Complete |
| DEP-01      | Phase 14 | Complete |
| DEP-02      | Phase 14 | Complete |
| DEP-03      | Phase 14 | Complete |
| DEP-04      | Phase 14 | Complete |
| EXI-01      | Phase 15 | Complete |
| EXI-02      | Phase 15 | Complete |
| EXI-03      | Phase 15 | Complete |
| EXI-04      | Phase 15 | Complete |
| EXI-05      | Phase 15 | Complete |
| EXI-06      | Phase 15 | Complete |
| EXI-07      | Phase 15 | Complete |
| INV-01      | Phase 17 | Pending  |
| INV-02      | Phase 17 | Pending  |
| INV-03      | Phase 17 | Pending  |
| INV-04      | Phase 17 | Pending  |
| INV-05      | Phase 17 | Pending  |
| INV-06      | Phase 17 | Pending  |
| INV-07      | Phase 17 | Pending  |
| INV-08      | Phase 17 | Pending  |
| INV-09      | Phase 17 | Pending  |
| MIG-01      | Phase 14 | Complete |
| MIG-02      | Phase 15 | Complete |
| MIG-03      | Phase 16 | Complete |
| MIG-04      | Phase 14 | Complete |
| MIG-05      | Phase 17 | Pending  |
| MIG-06      | Phase 14 | Complete |
| MIG-07      | Phase 14 | Complete |
| NAV-01      | Phase 16 | Complete |
| NAV-02      | Phase 16 | Complete |
| NAV-03      | Phase 16 | Complete |
| DASH-01     | Phase 16 | Complete |
| DASH-02     | Phase 16 | Complete |
| DASH-03     | Phase 16 | Complete |
| DEBT-01     | Phase 14 | Complete |
| DEBT-02     | Phase 15 | Complete |
| DEBT-03     | Phase 16 | Complete |
| DEBT-04     | Phase 14 | Complete |

**Coverage:**

- v1.1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---

_Requirements defined: 2026-03-05_
_Last updated: 2026-03-05 (traceability updated with phase mappings)_
