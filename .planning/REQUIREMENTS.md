# Requirements: Objetiva Comercios Admin

**Defined:** 2026-04-29
**Core Value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one.

## v1.3 Requirements

Requirements for milestone v1.3 — Variantes y Modelo de Stock. Each maps to roadmap phases (see `ROADMAP.md`).

### CAT — Catálogos de Atributos

- [ ] **CAT-01**: Admin puede gestionar catálogos de atributos (marcas, colores, talles, materiales, presentaciones, objetos, calificadores) con CRUD completo: nombre, slug, estado activo
- [ ] **CAT-02**: Admin puede agregar valores nuevos a un catálogo desde el formulario de artículos (create-on-the-fly) y verlos disponibles inmediatamente
- [ ] **CAT-03**: Sistema valida unicidad del slug por catálogo y rechaza duplicados con error legible
- [ ] **CAT-04**: Admin puede desactivar valores de un catálogo (soft-delete) sin perder datos históricos

### TPL — Templates de Artículo

- [ ] **TPL-01**: Admin puede crear y editar templates que definen qué atributos aplican a un grupo de artículos
- [ ] **TPL-02**: Admin puede marcar atributos como "variante" (genera SKUs distintos) o "no-variante" (compartido entre filas hermanas)
- [ ] **TPL-03**: Admin puede definir cuáles atributos componen el SKU y en qué orden
- [ ] **TPL-04**: Admin puede definir cuáles atributos componen el nombre auto y en qué orden
- [ ] **TPL-05**: Sistema usa el template default automáticamente al crear un artículo (1 template hoy; modelo soporta multi-template para v1.4+)

### VAR — Variantes de Artículo

- [ ] **VAR-01**: Admin puede crear un artículo sin variantes con SKU igual a su código (modelo flat plano)
- [ ] **VAR-02**: Admin puede convertir un artículo en variantizado agregando una segunda variante con mismo `codigo` y atributos variante distintos
- [ ] **VAR-03**: Sistema autogenera el SKU concatenando `codigo + slugs` de atributos variante según receta del template
- [ ] **VAR-04**: Sistema autogenera el nombre concatenando atributos según receta cuando `nombre_auto = true`
- [ ] **VAR-05**: Admin puede editar manualmente el nombre de una variante (auto-desactiva `nombre_auto`)
- [ ] **VAR-06**: Admin ve la lista de artículos agrupada por `codigo`, expandible para ver variantes hermanas
- [ ] **VAR-07**: Admin puede editar "datos del modelo" (campos comunes) propagando a todas las filas con mismo `codigo`
- [ ] **VAR-08**: Admin puede editar "datos de la variante" (atributos variante, precio, stock) sin afectar hermanas
- [ ] **VAR-09**: Admin asigna `codigo_barras` único por variante (variantes nuevas NO heredan el de la origen)
- [ ] **VAR-10**: Comprobantes (orders, sales, purchases, existencias, inventarios_articulos) referencian `sku` como identificador universal

### SKU — Regeneración Masiva

- [ ] **SKU-01**: Admin puede modificar la receta del template y ver preview de cuántos SKUs/nombres se afectan antes de aplicar
- [ ] **SKU-02**: Admin confirma el cambio masivo y el sistema aplica la regeneración en una transacción atómica con cascade a comprobantes
- [ ] **SKU-03**: Sistema mantiene historia append-only de cambios de SKU para audit y reverse
- [ ] **SKU-04**: Admin puede deshacer el último cambio masivo (undo last batch)
- [ ] **SKU-05**: Re-aplicar el mismo cambio dos veces no duplica modificaciones (idempotencia)

### STOCK — Modelo de Stock

- [ ] **STOCK-01**: Sistema renombra `columna` → `ubicacion` en `existencias` e `inventarios_articulos` preservando los datos existentes
- [ ] **STOCK-02**: Admin puede gestionar ubicaciones físicas (CRUD) por depósito
- [ ] **STOCK-03**: Admin puede gestionar sectores transversales que agrupan ubicaciones físicas (M:N vía pivot)
- [ ] **STOCK-04**: Una ubicación puede pertenecer a múltiples sectores
- [ ] **STOCK-05**: Admin puede filtrar el listado de existencias por ubicación y/o sector
- [ ] **STOCK-06**: Admin puede editar visualmente las existencias en una pivot table por ubicación
- [ ] **STOCK-07**: Admin ve un dashboard con totales de stock agrupados por sector

### MIG — Migración Histórica

- [ ] **MIG-01**: Sistema ejecuta la migración histórica de existencias pendiente desde abril: poblar `ubicacion` desde dump de `sanchez` cuando hay match (~7,500 filas estimadas), sentinel cuando no
- [ ] **MIG-02**: Sistema produce reporte post-migración con counts validables (match real vs sentinel) y comparación contra `articulos.unidades`
- [ ] **MIG-03**: La migración es idempotente — re-ejecutar no duplica filas ni rompe el estado

### DEBT — Tech Debt

- [ ] **DEBT-01**: Sistema usa `numeric(10,2)` para campos monetarios (precio, costo, erp_precio, erp_costo) en lugar de `doublePrecision` (deferred desde v1.0)
- [ ] **DEBT-02**: Schema TypeScript está alineado con la realidad de la DB (nombres de índices, precision numeric, timestamp microsecond consistency)
- [ ] **DEBT-03**: Placeholder comment en `header.tsx` removido

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Multi-template

- **TPL-F01**: Admin puede crear múltiples templates (ej: Automotor, Indumentaria) y asignar template por artículo. Schema ya preparado en v1.3.

### Vehículos Compatibles / Fitment

- **FIT-F01**: Admin puede gestionar catálogo de modelos de vehículos (marca, modelo, año, motor, trim)
- **FIT-F02**: Admin puede asociar artículos con vehículos compatibles (M:N "ficha de aplicación")
- **FIT-F03**: Usuario puede buscar artículos compatibles con un vehículo específico (búsqueda inversa)
- **FIT-F04**: Sistema soporta import de fuentes externas (formato ACES o equivalente local)

### Variant-level Pricing

- **PRICE-F01**: Admin puede aplicar modificadores relativos de precio por variante (ej: talle XL +$50, color rojo +10%)
- **PRICE-F02**: Sistema calcula precio efectivo de la variante = precio_madre + modificador

### Imágenes por Variante

- **IMG-F01**: Variante puede tener override de imágenes propias que sobrescriben las del grupo (`codigo`)
- **IMG-F02**: UI permite especificar override por variante o heredar del modelo

### Auto-reorder

- **REORD-F01**: Sistema sugiere órdenes de compra automáticas a partir de bajo stock por proveedor

## Out of Scope

Explicitly excluded from v1.3. See `PROJECT.md §Out of Scope` for project-wide exclusions.

| Feature | Reason |
|---------|--------|
| Vehículos compatibles / fitment data | Diferido a v1.4 — feature grande por sí misma (catálogo + UI + búsqueda inversa + posible import externo) |
| Variant matrix combinatorial UI (size × color = N child SKUs vista) | Modelo flat single-table no usa matriz; cada variante es entidad de primera clase |
| Multi-currency / multi-locale | Ya excluido en PROJECT.md — single locale es-MX/MXN |
| JSONB para atributos | Decisión cerrada: FK a catálogos (vista cruda elocuente, IA-friendly, queries simples) |
| Variant-level pricing tiers / modificadores | Decisión cerrada: precio absoluto por variante; modificadores diferidos |
| Sectores por inventario (sectores no transversales) | Decisión cerrada: sectores agrupan ubicaciones físicas, no por evento de inventario |
| Image override por variante en v1.3 | Q12 abierto; deferido a milestone posterior una vez consolidado el modelo flat |

## Traceability

Mapping of requirements to roadmap phases (filled by `gsd-roadmapper` during ROADMAP.md creation).

| Requirement | Phase | Status |
|---|---|---|
| CAT-01 | Phase 29 | Pending |
| CAT-02 | Phase 29 | Pending |
| CAT-03 | Phase 29 | Pending |
| CAT-04 | Phase 29 | Pending |
| TPL-01 | Phase 30 | Pending |
| TPL-02 | Phase 30 | Pending |
| TPL-03 | Phase 30 | Pending |
| TPL-04 | Phase 30 | Pending |
| TPL-05 | Phase 30 | Pending |
| VAR-01 | Phase 32 | Pending |
| VAR-02 | Phase 32 | Pending |
| VAR-03 | Phase 32 | Pending |
| VAR-04 | Phase 32 | Pending |
| VAR-05 | Phase 32 | Pending |
| VAR-06 | Phase 32 | Pending |
| VAR-07 | Phase 32 | Pending |
| VAR-08 | Phase 32 | Pending |
| VAR-09 | Phase 32 | Pending |
| VAR-10 | Phase 31 | Pending |
| SKU-01 | Phase 33 | Pending |
| SKU-02 | Phase 33 | Pending |
| SKU-03 | Phase 33 | Pending |
| SKU-04 | Phase 33 | Pending |
| SKU-05 | Phase 33 | Pending |
| STOCK-01 | Phase 34 | Pending |
| STOCK-02 | Phase 34 | Pending |
| STOCK-03 | Phase 34 | Pending |
| STOCK-04 | Phase 34 | Pending |
| STOCK-05 | Phase 35 | Pending |
| STOCK-06 | Phase 35 | Pending |
| STOCK-07 | Phase 35 | Pending |
| MIG-01 | Phase 36 | Pending |
| MIG-02 | Phase 36 | Pending |
| MIG-03 | Phase 36 | Pending |
| DEBT-01 | Phase 37 | Pending |
| DEBT-02 | Phase 37 | Pending |
| DEBT-03 | Phase 37 | Pending |

**Coverage**: 37/37 v1.3 requirements mapped (100%). No orphans, no duplicates.
