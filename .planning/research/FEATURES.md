# Feature Landscape — v1.3 Variantes y Modelo de Stock

**Domain:** Admin de operaciones comerciales para rubrería de repuestos automotrices — sistema de variantes con SKU universal, catálogos de atributos compartidos y redesign del modelo de stock (ubicaciones + sectores transversales).
**Researched:** 2026-04-29
**Scope:** v1.3 milestone — features NUEVAS sobre el chasis ya validado en v1.0–v1.2.
**Confidence:** HIGH (decisiones cerradas en `v1.3-design-notes.md` + benchmarking de Shopify/Medusa/Saleor/WooCommerce/Vendure)

---

## Out of Re-Research Scope

Estos features ya están shipped y validados — NO se re-investigan en este documento:

- Articulos full CRUD con ~30 campos, search, soft-delete, formulario agrupado (v1.1, v1.2)
- Image upload con sharp WebP, DnD, lightbox (v1.2)
- Configurable list columns persistidas en DB + sorting (v1.2)
- ArticuloSheet (vista detalle en panel lateral) (v1.2)
- API Keys con CompositeAuthGuard (v1.2)
- Webhooks con HMAC-SHA256 + retry backoff + delivery log (v1.2)
- Existencias por artículo×depósito con low-stock alerts e inline editing (v1.1)
- Inventarios físicos con sectores, dispositivos móviles, status workflow (v1.1)

Se asume el chasis. Lo que sigue es exclusivamente la capa nueva.

---

## Reversal Explícito

**v1.0 declaró Out-of-Scope:** "Full variant/SKU matrix (size x color = N child SKUs) — flat properties covers real use case."

**v1.3 lo revierte parcialmente:** El negocio (rubrería de repuestos) requiere modelado fino con catálogos compartidos, SKU/nombre auto y consistencia entre artículos del mismo modelo. **Pero no se adopta la matriz cartesiana de Shopify/Medusa.** El approach es **single-table flat con N filas**, donde cada fila es una variante (o el artículo solo si no tiene variantes). Diferenciador clave del milestone: la simplicidad de Shopify/Saleor (un row por SKU) sin la madre/hijo de WooCommerce/Magento.

---

## Table Stakes (Must-Have para v1.3)

### Eje 1: Sistema de Variantes

| # | Feature | Por qué es expected | Complejidad | Depende de | Notas |
|---|---|---|---|---|---|
| TS-01 | **Migración de PK `codigo` → `sku`** en `articulos` | Sin esto nada funciona. Todo el resto cuelga de SKU como identificador universal. | **L** | FKs en orders, sales, purchases, existencias, inventarios_articulos | Transacción atómica con backup. `sku=codigo` para todas las filas existentes. Requiere rename + drop UNIQUE en `codigo` + add UNIQUE en `sku` + cascade FKs. |
| TS-02 | **`codigo` como agrupador NOT UNIQUE indexado** | "Tiene variantes" se infiere de `COUNT(*) WHERE codigo=X > 1`. Sin este índice, listados y aggregations son lentos. | S | TS-01 | `CREATE INDEX articulos_codigo_idx ON articulos(codigo)`. No-UNIQUE intencional. |
| TS-03 | **Tabla `articulos_templates`** (1 default desde día 1) | Sin template no hay receta de SKU ni de nombre auto. | S | — | Schema mínimo: `id, nombre UNIQUE, descripcion, is_default, timestamps`. Seed con 1 fila `nombre='default'`. |
| TS-04 | **Tabla `template_atributos`** con receta SKU + nombre + flag variante | Define qué atributos aplican, cuáles van al SKU + orden, cuáles al nombre + orden, cuáles son ejes de variante. | M | TS-03 | Schema: `id, template_id FK, tipo_atributo, es_variante bool, orden_sku int NULL, orden_nombre int NULL, requerido bool, catalogo_tabla text`. Order semantics: NULL = no participa. |
| TS-05 | **Catálogos de atributos como tablas FK** (no JSONB) | Decisión cerrada (#14 en design-notes). FK a tablas tipo `marcas(id, nombre, slug)`, `colores(id, nombre, slug)`, etc. | M | TS-04 | Una tabla por tipo de atributo. Schema canónico: `(id PK, nombre TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, activo bool, timestamps)`. Slug autogenerado desde nombre. Pattern consistente con cómo Saleor maneja `Attribute` + `AttributeValue` cuando los atributos son globales. |
| TS-06 | **Columnas FK en `articulos` para atributos del template default** | Para que la vista cruda de la tabla sea elocuente (decisión #14). Sin esto, queries necesitan joins constantes. | M | TS-05, Q4 | Cada atributo del template es una columna FK nullable. Para el default automotor: `marca_id`, `presentacion_id`, `objeto_id`, `calificador_id`, etc. + freetext donde aplique (`modelo`, `medida`). **Q4 cierra qué columnas exactas.** |
| TS-07 | **SKU autogenerado** con receta `codigo` + slug₁ + slug₂... | Decisión cerrada (#6). Sin auto, los usuarios escriben SKUs inconsistentes. | M | TS-04, TS-05, TS-06 | Pure function: `composeSku(codigo, atributos, template) → string`. Separador único (default `-`). El `codigo` es prefijo implícito, no figura en `template_atributos`. Best practice: uppercase + hyphens, ≤20 chars cuando sea posible (Symbia/Eshopbox). |
| TS-08 | **Nombre autogenerado** con flag `nombre_auto` por artículo | Decisión #18. Si `nombre_auto=true`, regenera al guardar concatenando atributos según `orden_nombre`. | M | TS-04, TS-05, TS-06 | Pure function: `composeNombre(atributos, template) → string`. Si `nombre_auto=false`, respeta el campo `nombre` manual del usuario. Default `true` para artículos nuevos creados desde template. |
| TS-09 | **CRUD de catálogos de atributos** (UI admin) | Sin UI no se pueden agregar marcas/colores/etc. sin SQL manual. | M | TS-05 | Patron repetible: lista paginada + create/edit modal + soft-delete. Una página por catálogo, agrupadas en `/admin/catalogos`. Slug auto-derived from nombre con preview editable. |
| TS-10 | **CRUD de templates** (UI admin) | Sin UI no se pueden crear nuevos templates ni editar el default. | M | TS-03, TS-04 | Página `/admin/templates`. Lista templates + detalle: tabla de atributos arrastrables (orden), checkboxes (es_variante, requerido), inputs de orden_sku/orden_nombre. Vista preview "qué SKU sale con valores ejemplo". |
| TS-11 | **Crear artículo desde template** (UI nuevo flujo) | El flujo viejo (form de 30 campos) sigue funcionando, pero con variantes el usuario quiere "elegir template, llenar atributos comunes, definir matriz de variantes". | L | TS-04 a TS-10 | Wizard de 3 pasos: (1) seleccionar template + completar atributos comunes y `codigo` (manual, ver TS-15), (2) definir qué valores tendrá cada atributo-variante (multi-select por catálogo), (3) preview de N filas a crear con SKU+nombre auto + edit por fila + confirm. Inspirado en "variant generator" de Medusa y "variant creator" de Saleor 2.9. |
| TS-12 | **Editar variante individual** (UI) | Una variante puede tener precio, stock, descripción, imagen propia. | M | TS-11 | Reusa `ArticuloForm` pero scoped a `WHERE sku=X`. Diferenciar visualmente "datos de la variante" (mutables solas) vs "datos del modelo" (mutables todas las hermanas — ver TS-13). |
| TS-13 | **Editar datos del modelo** (cascada por `codigo`) | Decisión #9: app-level consistency. Form aparte que hace `UPDATE WHERE codigo=X`. | M | TS-12 | Botón "Editar datos del modelo" en la página de la variante o en una vista de listado. Confirmación con count de variantes afectadas. Sin DB constraints — solo app. |
| TS-14 | **Listado de artículos con grouping por `codigo`** | Sin grouping visual, una rubrería con 100 artículos × 5 variantes muestra 500 filas planas. UX inservible. | M | TS-01, TS-02 | Toggle "Vista plana" / "Vista agrupada". Agrupada: una fila por `codigo` con expandable que muestra las N variantes. Pattern de Shopify Admin (master row + variant rows). Stock total agregado en la master row. |
| TS-15 | **`codigo` manual** (alineado con `erp_codigo`) | Q7 tentativa. ERP existente ya genera códigos manualmente. Auto-codigo crearía drift. | S | — | Input freeform con validación de unicidad-por-grupo (puede repetirse — es agrupador, no PK). Validación de formato configurable. **Q7 a confirmar.** |
| TS-16 | **`codigo_barras` separado del SKU** | Decisión #20. Las etiquetas físicas ya impresas no se pueden re-imprimir cada vez que cambia el schema. | S | — | Campo independiente, opcional, con índice único parcial cuando NOT NULL. NO se regenera en cambios de template. |

### Eje 2: Cambios Masivos de Schema

| # | Feature | Por qué es expected | Complejidad | Depende de | Notas |
|---|---|---|---|---|---|
| TS-17 | **Preview de impacto** al editar template | Decisión #19. El usuario debe ver cuántos SKUs/nombres cambian antes de confirmar. | M | TS-10 | Query: `SELECT COUNT, sample LIMIT 20` de SKUs viejos vs nuevos. Diff visual. Inspirado en Matrixify (Shopify) que muestra dry-run antes de bulk update. |
| TS-18 | **Cascade transaccional** SKU viejo → nuevo en tablas hijo | Sin cascade, las FKs se rompen al cambiar SKU. | L | TS-01, TS-17 | Transacción atómica: update articulos.sku + UPDATE en orders, sales, purchases, existencias, inventarios_articulos via mapping table temporal. Lock advisory durante el batch. |
| TS-19 | **Tabla `articulo_sku_history`** append-only | Decisión #19. Audit + posibilidad de "deshacer último cambio masivo". | S | TS-18 | Schema: `id, sku_anterior, sku_nuevo, codigo, batch_id UUID, motivo, ejecutado_por, ejecutado_en`. Insert por cada fila afectada en cada batch. |
| TS-20 | **Campo `articulos.sku_anterior`** (idempotencia) | Decisión #19. Permite re-ejecución segura del cascade y rollback rápido del último cambio. | S | TS-01 | NULLable. Set durante el cascade, NULL al confirmar. Rollback = `UPDATE SET sku=sku_anterior WHERE sku_anterior IS NOT NULL`. |

### Eje 3: Stock Redesign

| # | Feature | Por qué es expected | Complejidad | Depende de | Notas |
|---|---|---|---|---|---|
| TS-21 | **Rename `columna` → `ubicacion`** en `existencias` e `inventarios_articulos` | Decisión #21. El término actual no cubre estanterías/percheros/cajones. | S | — | Migración de schema + rename en backend (services, DTOs, types) + UI. ALTER COLUMN preserva datos. |
| TS-22 | **Tabla `sectores`** + tabla pivot `sector_ubicaciones` | Decisión #22, #23. Sectores son transversales — agrupan ubicaciones físicas, no son por inventario ni existencia. | M | TS-21 | `sectores(id, nombre, slug, deposito_id FK, descripcion, activo, timestamps)`. Pivot `sector_ubicaciones(sector_id, ubicacion, deposito_id, PRIMARY KEY composite)`. M:N porque una ubicación puede pertenecer a múltiples sectores. |
| TS-23 | **CRUD de sectores** (UI admin) | Sin UI no se gestionan sectores. Patrón equivalente a CRUD de depósitos ya existente. | M | TS-22 | Lista + create/edit modal con multi-select de ubicaciones disponibles del depósito. Validación: una ubicación sin sector queda en sector implícito "Sin asignar". |
| TS-24 | **Migración histórica de existencias** (ejecución del plan Q8) | Pendiente desde abril. ~7,500 con ubicación real + ~80–400 sentinel. | M | TS-21, contexto de quick task `260429-rec` | Script idempotente. Para cada artículo con `unidades > 0`: crear/actualizar existencia con ubicación desde `sanchez.articulos.columna` cuando hay match (slugify + comparison), `ubicacion='0'` sentinel sin match, `cantidad = articulos.unidades` (verdad actual desde erp_sanchez). Reporte post-ejecución de matches/sentinels. |
| TS-25 | **Filtros por ubicación y sector** en vista de existencias | Sin filtros, vista plana de 8000 existencias es inservible. | M | TS-22 | Combobox multi-select de sectores + multi-select de ubicaciones. URL state para deep-link. |
| TS-26 | **Edición visual de existencias** (UI) | Q11. La inline-edit actual edita una celda; con ubicaciones + sectores se necesita un editor que entienda la grid 2D (artículo × ubicación). | L | TS-25 | Pivot table vista: filas = artículos, columnas = ubicaciones, celdas = cantidad editable. Sticky headers. Bulk edit con shift-click. Save explícito por celda o batch. |
| TS-27 | **Dashboard de stock por sector** | Q11. Total de unidades por sector, low-stock por sector, distribución por categoría dentro del sector. | M | TS-22, TS-25 | Cards con KPIs por sector + bar chart de distribución (Recharts). Drill-down a vista filtrada de existencias. |

### Eje 4: Comprobantes Referencian SKU

| # | Feature | Por qué es expected | Complejidad | Depende de | Notas |
|---|---|---|---|---|---|
| TS-28 | **`order_lines.articulo_codigo` → `articulo_sku`** (rename + retype) | Si SKU es identificador universal pero comprobantes usan codigo, sale stock equivocado para artículos con variantes. | M | TS-01, TS-18 | Rename de columna + rebuild del FK + cascade desde TS-18. Aplica también a `sale_lines`, `purchase_lines`. |
| TS-29 | **Selector de SKU en alta de comprobante** (UI) | Combobox debe permitir buscar por codigo (filtra group), nombre, SKU directo, código de barras. | M | TS-28 | Search backend que devuelve sku + nombre + codigo + atributos + stock disponible. Mostrar atributos diferenciadores cuando hay múltiples variantes con mismo codigo. Inspirado en autocomplete de Shopify POS y Medusa Admin. |

### Eje 5: Tech Debt (consolidado en este milestone)

| # | Feature | Por qué es expected | Complejidad | Depende de | Notas |
|---|---|---|---|---|---|
| TS-30 | **`numeric()` para campos monetarios** (deferred desde v1.0) | `doublePrecision` causa problems de precisión financiera. Decisión clave #12 lo flagged. | M | — | Migrar `precio`, `costo`, `precio_lista`, etc. de `doublePrecision` a `numeric(10,2)`. Drizzle config + migration. Validar serialización (numeric devuelve string en pg, hay que castear). |
| TS-31 | **Drift TS↔DB cleanup** (Q9) | Cosmético pero confunde reviews y futuras migraciones. | S | — | Renombrar índices en TS para match con DB (`idx_articulos_marca`). Agregar precision en TS para numeric. `timestamp(6)` consistency. |

---

## Differentiators (Nice-to-have, valiosos pero opcionales)

| # | Feature | Value Proposition | Complejidad | Notas |
|---|---|---|---|---|
| D-01 | **Slug + nombre denormalizados** en `articulos` | IA-friendly: `SELECT * FROM articulos` muestra "rojo" en vez de FK opaco `42`. Browsing visual amigable. **Recomendación pendiente Q2.** | M | Trigger en INSERT/UPDATE de catálogo: actualiza filas hijas con nombre cacheado. O denormalización on-write desde la app. Trade-off: storage extra + complejidad de invalidación vs simplicidad de queries. |
| D-02 | **Undo last bulk SKU change** (botón rollback) | Completa la feature TS-19 + TS-20 con UX de un click. Reduce ansiedad al editar templates. | M | UI: lista de últimos 10 batches con timestamp + count + botón "Deshacer". Validación: detectar si hubo cambios posteriores que rompen el rollback (e.g., comprobantes nuevos referenciando SKUs nuevos). |
| D-03 | **Mass SKU regeneration con dry-run extendido** | Más allá de TS-17, mostrar diff lado a lado por artículo (tabla con columnas viejo/nuevo) + export a CSV antes de confirmar. | M | Construye sobre TS-17. Útil para refactorings grandes (ej: agregar `material` al SKU del template default cuando no estaba antes). |
| D-04 | **Variant value swatch UI** (color picker, talles ordenados) | Saleor 2.9 introdujo "swatch" attributes con preview visual de color/imagen. Mejora UX de selección de variantes. | M | Extender `template_atributos` con `display_type ENUM('text', 'swatch', 'dropdown')`. Catálogo `colores` puede tener hex code adicional. Aplica a UI del wizard TS-11 y al combobox TS-29. |
| D-05 | **Preview WYSIWYG del SKU/nombre** mientras se edita el template | Mostrar "ejemplo: ABC-RED-XL" en tiempo real al cambiar la receta. Reduce errores de configuración. | S | Pure function reusable de TS-07 + TS-08, alimentada con valores de ejemplo del primer artículo del catálogo. |
| D-06 | **Heatmap de stock por sector** | Visualización visual del depósito (grid 2D coloreada por nivel de stock). Más impactante que tabla pivot. | L | Plotly o D3 custom. Define grid del depósito (config en DB: filas, columnas, ubicaciones por celda). Más cerca de un MVP de "warehouse map" que dashboard tradicional. |
| D-07 | **Webhook events para variantes** (`articulo.variant.created`, `articulo.sku.changed`) | Sistemas externos integrados via API key necesitan saber cuando un SKU cambia para reconciliar. | S | Extiende el sistema de webhooks de v1.2 (HMAC-SHA256 + retry). Solo agregar nuevos event types al EventEmitter. |

---

## Anti-Features (Explícitamente NO construir)

| # | Feature | Por qué se pide | Por qué es problemático | Alternativa |
|---|---|---|---|---|
| AF-01 | **JSONB para atributos** | Flexibilidad: agregar atributos sin migración. | Decisión cerrada #14. Queries opacas, no IA-friendly, sin FK referential integrity, sin filtros indexados eficientes, performance peor que columnas (Microsoft SQL/Allstars findings). Para un single-tenant con rubro acotado, el costo de migración por atributo nuevo es bajo. | Catálogos FK + columnas en `articulos` (TS-05, TS-06). Si surge un atributo dinámico futuro, agregar columna + tabla catálogo. |
| AF-02 | **Variant matrix combinatorial UI** estilo Shopify (size × color = N) | Es lo que muestra Shopify Admin como UI de variants. | El modelo es flat single-table (decisión #7). El usuario crea N filas explícitamente. Una matriz UI sugiere semánticas que no aplican (master/child) y choca con el modelo. | Wizard TS-11 con multi-select de valores y preview de N filas a crear. Las filas son entidades de primera clase, no derivadas. |
| AF-03 | **Pricing tiers / modificadores relativos** ("variante L = +$5 sobre M") | Convención de Shopify y Medusa donde el padre tiene precio base. | Decisión #13: precio absoluto por variante. Modelado relativo agrega complejidad sin valor en este negocio (precios cambian por variante con factores como costo de proveedor distinto). | Cada fila guarda su propio precio. Si se necesita coherencia, `editar datos del modelo` (TS-13) puede setear precio en cascada. |
| AF-04 | **Multi-currency** (USD, EUR adicional al MXN) | "Por si exportamos a USA". | Out of scope explícito en `PROJECT.md`. Multi-currency cambia drásticamente el modelo financiero (rates, conversiones, FX gain/loss). | Seguir en MXN. Si en algún milestone v2.x se exporta, abrir milestone dedicado. |
| AF-05 | **Catálogo completo de vehículos compatibles + fitment** | Q3 tentativa. Lo necesita una rubrería de repuestos automotrices. | Trabajo grande por sí mismo (catálogo de marcas-modelos-años-motores, UI de fitment, posible importación ACES/PIES). Alcance del milestone explota. **Out of scope explícito en `PROJECT.md`** — diferido a v1.4. | v1.3 cierra solo el sistema de variantes y stock. v1.4 abre catálogo de vehículos como milestone aparte. |
| AF-06 | **Inheritance via "tabla por template"** (Q1 opción A4) | Permite columnas distintas por rubro. | Multiplica tablas, complica queries que cruzan rubros, choca con el principio de "single-table flat" decidido en #7. | A1 (pocas comunes + pivot para extras) o A2 (slots numerados) — se cierra en `/gsd-discuss-phase` con Q1. |
| AF-07 | **Reorder automático de stock** | Low-stock alerts ya existen, "que pida solo". | Out of scope explícito en `PROJECT.md` ("scope creep into procurement"). Decisiones de compra requieren reglas de negocio (proveedores, tiempos de entrega, mínimos económicos) que no están en el modelo. | Mantener alertas como info, decisión humana sigue. |
| AF-08 | **Búsqueda full-text por descripción de variante** | "Quiero buscar 'cinta roja talle XL'". | El combobox TS-29 con búsqueda por codigo+nombre+SKU+atributos cubre el 95% del caso. Full-text search introduce dependencias (pg_trgm, materialized views, ranking). | Search compuesto sobre los 4 campos en TS-29. Si en producción se ve insuficiente, abrir feature ad-hoc en milestone futuro. |
| AF-09 | **Variant images con galería propia por variante** | Cada color/talle quiere su foto. | El sistema de imágenes de v1.2 ya soporta hasta 6 imágenes por artículo. Como cada variante es una fila propia, ya tiene su propio array de imágenes. **No es un anti-feature, es una clarificación: la feature ya existe gracias al modelo flat.** Listada acá para evitar re-implementar. | Reusar el sistema de imágenes v1.2 sin cambios. |
| AF-10 | **Lot/batch/serial number tracking** | "Quiero rastrear cuándo entró cada lote." | Out of scope explícito en `PROJECT.md`. Cambia el grano de existencias (de cantidad a (lote, cantidad)). Trabajo grande, dominio aparte. | Mantener cantidad-por-ubicación. Si surge necesidad real, milestone aparte. |

---

## Feature Dependencies

```
TS-01 (PK migration sku)
   ├──> TS-02 (codigo grouping index)
   ├──> TS-12 (edit variante)
   ├──> TS-13 (edit modelo cascada)
   ├──> TS-14 (listado agrupado)
   ├──> TS-18 (cascade transaccional) ──> TS-28 (comprobantes referencian SKU)
   ├──> TS-20 (sku_anterior)
   └──> stock redesign (independiente, no toca PK)

TS-03 (templates table)
   └──> TS-04 (template_atributos)
           ├──> TS-05 (catálogos FK)
           │       └──> TS-06 (columnas FK en articulos)
           │               ├──> TS-07 (SKU autogen)
           │               ├──> TS-08 (nombre autogen)
           │               └──> TS-11 (wizard crear desde template)
           ├──> TS-09 (CRUD catálogos)
           └──> TS-10 (CRUD templates)
                   └──> TS-17 (preview impacto)
                           └──> TS-18 (cascade) ──> TS-19 (history) ──> D-02 (undo)

TS-21 (rename columna→ubicacion)
   ├──> TS-22 (sectores + pivot)
   │       ├──> TS-23 (CRUD sectores)
   │       ├──> TS-25 (filtros)
   │       │       └──> TS-26 (edición visual)
   │       └──> TS-27 (dashboard)
   └──> TS-24 (migración histórica)

TS-30 (numeric monetario) — independiente
TS-31 (drift TS↔DB) — independiente

TS-29 (selector SKU comprobantes)
   └──> requires TS-28 (rename FK)
```

### Dependency Notes Críticas

- **TS-01 es bloqueante absoluto.** Todo el eje 1 (variantes) y la cascade del eje 2 dependen de la migración de PK. Sin esto, FKs no apuntan a SKU y todo es teórico.
- **TS-21 vs TS-22 son independientes de TS-01.** Stock redesign no necesita variantes implementadas. Pueden ir en fases paralelas si el roadmap lo permite.
- **TS-24 (migración histórica)** debería ir después de TS-22 pero antes de TS-26 (edición visual) — los datos consolidados son input del editor.
- **TS-30 (numeric)** es ideal hacerlo antes de la migración de PK porque toca filas masivamente; combinar ambos en una transacción reduce downtime.
- **D-02 (undo)** es el "ROI rápido" sobre TS-19 — implementar TS-19 sin D-02 deja value en la mesa.

---

## MVP Definition (v1.3)

### Launch With (v1.3 release)

Mínimo para shippear el milestone:

- [ ] **TS-01 a TS-08** — Sistema de variantes core (PK migration, templates, catálogos, autogen)
- [ ] **TS-09, TS-10** — CRUD de catálogos y templates
- [ ] **TS-11, TS-12, TS-13** — Wizard de creación + edit variant + edit modelo
- [ ] **TS-14** — Listado agrupado
- [ ] **TS-15, TS-16** — Codigo manual + codigo_barras separado
- [ ] **TS-17 a TS-20** — Cambios masivos con preview/cascade/history
- [ ] **TS-21 a TS-24** — Stock redesign completo + migración histórica
- [ ] **TS-25, TS-26** — Filtros y edición visual
- [ ] **TS-28, TS-29** — Comprobantes refieren SKU
- [ ] **TS-30, TS-31** — Tech debt monetario + drift

### Add After Validation (v1.3.x patches)

Features post-launch dependientes de feedback de uso real:

- [ ] **D-02** (undo last bulk change) — agregar al cerrar TS-19 si hay tiempo, sino en patch
- [ ] **D-05** (preview WYSIWYG) — bajo costo, agregar si UX testing lo pide
- [ ] **TS-27** (dashboard sector) — dependiente de uso real para priorizar KPIs
- [ ] **D-07** (webhook events para variantes) — agregar cuando un consumer real lo pida

### Future Consideration (v1.4+)

- [ ] **AF-05 reversal**: Vehículos compatibles + fitment (milestone v1.4 dedicado)
- [ ] **D-01** (slug+nombre denormalizado) — depende de cómo IA agents (LLM consumers via API key) consumen los datos
- [ ] **D-04** (swatch UI) — depende de si usuarios piden visual color/talle en wizard
- [ ] **D-06** (heatmap depósito) — depende de adopción del dashboard básico TS-27

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| TS-01 (PK migration sku) | HIGH | HIGH | **P1** (bloqueante) |
| TS-02 (codigo grouping) | HIGH | LOW | P1 |
| TS-03–TS-04 (templates schema) | HIGH | LOW–MED | P1 |
| TS-05–TS-06 (catálogos + columnas FK) | HIGH | MED | P1 |
| TS-07–TS-08 (autogen SKU+nombre) | HIGH | MED | P1 |
| TS-09–TS-10 (CRUD catálogos+templates) | HIGH | MED | P1 |
| TS-11 (wizard crear desde template) | HIGH | HIGH | P1 |
| TS-12–TS-13 (edit variante/modelo) | HIGH | MED | P1 |
| TS-14 (listado agrupado) | HIGH | MED | P1 |
| TS-15–TS-16 (codigo manual, barras) | MED | LOW | P1 |
| TS-17 (preview impacto) | HIGH | MED | P1 |
| TS-18 (cascade transaccional) | HIGH | HIGH | P1 |
| TS-19 (history append-only) | MED | LOW | P1 |
| TS-20 (sku_anterior idempotencia) | MED | LOW | P1 |
| TS-21 (rename columna→ubicacion) | MED | LOW | P1 |
| TS-22 (sectores + pivot) | HIGH | MED | P1 |
| TS-23 (CRUD sectores) | HIGH | MED | P1 |
| TS-24 (migración histórica) | HIGH | MED | P1 |
| TS-25 (filtros ubicación/sector) | HIGH | MED | P1 |
| TS-26 (edición visual existencias) | HIGH | HIGH | P1 |
| TS-27 (dashboard sector) | MED | MED | P2 |
| TS-28 (rename FK comprobantes) | HIGH | MED | P1 |
| TS-29 (selector SKU) | HIGH | MED | P1 |
| TS-30 (numeric monetario) | MED | MED | P1 |
| TS-31 (drift TS↔DB) | LOW | LOW | P2 |
| D-01 (slug+nombre denormalized) | MED | MED | P3 |
| D-02 (undo bulk) | MED | MED | P2 |
| D-03 (dry-run extendido) | MED | MED | P3 |
| D-04 (swatch UI) | LOW | MED | P3 |
| D-05 (preview WYSIWYG) | MED | LOW | P2 |
| D-06 (heatmap depósito) | LOW | HIGH | P3 |
| D-07 (webhook eventos variantes) | MED | LOW | P2 |

**Priority key:**
- **P1**: Must-have para v1.3 release
- **P2**: Should-have, fit-if-possible o patch post-launch
- **P3**: Nice-to-have, defer a v1.4+

---

## Reference App Patterns

| Pattern | Source | Cómo lo adoptamos |
|---|---|---|
| **SKU como identificador universal** (no parent product ID) | Shopify ProductVariant.sku, Medusa ProductVariant.sku | Adoptado completamente. SKU es PK desde día 1. |
| **Variant generator wizard** (multi-select de option values, preview de N filas) | Saleor 2.9 "variant creator", Medusa "variant generator" (discussion #5119) | Adoptado en TS-11. Wizard 3 pasos en lugar de modal único. |
| **Auto SKU con receta `parent + slugs`** | WooCommerce (slugs/IDs append), Booster for WC, OmniOrders attribute-based generation | Adoptado en TS-07. Diferencia: NO hay "parent SKU" — el `codigo` es el prefijo implícito. |
| **Variant attribute selection** (dropdown/swatch/numeric) | Saleor AssignedVariantAttribute con `variant_selection` flag y display types | Adoptado parcialmente como Differentiator D-04. |
| **Bulk SKU update con dry-run** | Matrixify (Shopify), Magento Store Manager | Adoptado en TS-17 + D-03. |
| **Single-table product+variant flat** | Algolia search index para Shopify (one-document-per-variant pattern) | Adoptado completamente en el modelo de DB (decisión #7). |
| **Configurable products via custom fields** | Vendure ProductVariant + OrderLine custom fields | NO adoptado. Vendure separa "configuración" (per-order) de "variantes" (per-product). Nuestro caso es 100% variantes. |
| **Bin location with aisle/shelf hierarchy** | Inventoryops, Katana, Linnworks WMS guides | Adoptado simplificado en TS-22. Sectores = "zonas" del WMS. Ubicaciones = "bins". Pivot M:N = sectores transversales (decisión #22). |
| **Inventory dashboard con filter por location** | UI Bakery / Microsoft Dynamics inventory dashboards | Adoptado en TS-25 + TS-27. |
| **EAV vs Hybrid (catálogos FK + columnas)** | Practical Ecommerce, Allstarsit hybrid recommendations | Adoptado el lado FK (no JSONB, no EAV puro). Híbrido pragmático: columnas comunes + tablas catálogo + (eventualmente) pivot para extras. |
| **ACES/PIES fitment** | Vertical Development, AutoFitmentPlus, ShowMeTheParts | NO adoptado en v1.3 (AF-05). Se evalúa para v1.4 milestone "Vehículos compatibles". |

---

## Open Questions Linked to Phase Discussion

Estas se cierran en `/gsd-discuss-phase` antes de planificar cada fase:

- **Q1** (modelo de columnas para atributos del rubro) → afecta TS-06, TS-09. Recomendación: A1 (pocas comunes + pivot para extras), pero el usuario decide.
- **Q2** (FK por id, slug o nombre + cache) → afecta D-01, TS-29 (búsqueda). Recomendación tentativa: FK por id + denormalización slug+nombre via trigger.
- **Q3** (vehículos compatibles a v1.3 o v1.4) → si entra a v1.3, AF-05 deja de ser anti-feature. Recomendación: diferir a v1.4 (alcance grande).
- **Q4** (atributos finales del template default automotor) → afecta TS-06. Cierra qué FKs van a `articulos`.
- **Q5** (`propAux1..5` actuales: keep/drop/rename) → afecta TS-31 + datos legacy.
- **Q6** (`categoria/subcategoria/rubro/subrubro/adjetivo` taxonomía vs atributos) → afecta TS-04, TS-06.
- **Q7** (`codigo` manual o autogen) → afecta TS-15.
- **Q8** (plan migración existencias) → cierra TS-24.
- **Q9** (drift TS↔DB) → cierra TS-31.
- **Q10** (qué tech debt entra) → cierra TS-30, TS-31, posible HOOK-03/06.
- **Q11** (UIs nuevas que entran) → cierra TS-23, TS-26, TS-27, TS-09, TS-10, TS-11.

---

## Confidence Assessment

| Area | Level | Reason |
|---|---|---|
| Variantes table-stakes (TS-01 a TS-16) | HIGH | Decisiones cerradas en design-notes + patrones validados de Shopify/Medusa/Saleor. |
| Cambios masivos schema (TS-17 a TS-20) | HIGH | Pattern estándar (preview + transacción + history + idempotencia). Decisiones #19, #20 explícitas. |
| Stock redesign (TS-21 a TS-27) | MED-HIGH | Decisiones #21, #22, #23 cerradas. Q11 deja UIs específicas abiertas. Migración Q8 pendiente de validar contra datos reales (~7,500 filas). |
| Comprobantes refieren SKU (TS-28 a TS-29) | HIGH | Cascade desde TS-18 + UI estándar de combobox. |
| Tech debt (TS-30 a TS-31) | MED | TS-30 tiene riesgo de serialización (numeric → string). Q9, Q10 cierran scope final. |
| Anti-features | HIGH | Justificadas por decisiones existentes en `PROJECT.md` y `v1.3-design-notes.md`. |
| Differentiators | MED | Valor variable según uso real post-launch. |

---

## Sources

### Decisiones Internas
- [`.planning/PROJECT.md`](../../PROJECT.md) — Validated requirements, Out of Scope, Key Decisions
- [`.planning/research/v1.3-design-notes.md`](./v1.3-design-notes.md) — Decisiones cerradas + Q1–Q11

### Reference Apps
- [Shopify ProductVariant GraphQL](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)
- [Shopify product model components](https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model/product-model-components)
- [Medusa Products Architecture](https://docs.medusajs.com/v1/modules/products)
- [Medusa Product Module](https://docs.medusajs.com/resources/commerce-modules/product)
- [Medusa variant generator discussion #5119](https://github.com/medusajs/medusa/discussions/5119)
- [Saleor product variant overview](https://docs.saleor.io/developer/products/overview)
- [Saleor 2.9 variant creator + plugin architecture](https://saleor.io/blog/release-enterprisegrade-attributes-variant-creator-and-plugin-architecture-117/)
- [Saleor AssignedVariantAttribute](https://docs.saleor.io/api-reference/attributes/objects/assigned-variant-attribute)
- [WooCommerce variable products](https://woocommerce.com/document/variable-product/)
- [WooCommerce SKU Generator plugin](https://github.com/godaddy-wordpress/woocommerce-product-sku-generator/blob/master/woocommerce-product-sku-generator.php)
- [Vendure configurable products](https://docs.vendure.io/current/core/how-to/configurable-products)
- [Vendure ProductVariant entity](https://github.com/vendurehq/vendure/blob/master/packages/core/src/entity/product-variant/product-variant.entity.ts)

### SKU / Schema Best Practices
- [Symbia Logistics — SKU naming with examples](https://www.symbia.com/resources/product-skus/)
- [Eshopbox SKU naming guide](https://www.eshopbox.com/blog/sku-naming)
- [OmniOrders 5 SKU best practices](https://omniorders.com/blog/sku-best-practices)
- [Nisum white paper SKU IDs](https://www.nisum.com/nisum-knows/white-paper-best-practices-for-defining-sku-ids)
- [Algolia Shopify schema (flat)](https://www.algolia.com/doc/integration/shopify/sending-and-managing-data/schemas)
- [Elastic schema for variants](https://www.elastic.co/blog/how-to-create-a-document-schema-for-product-variants-and-skus-for-your-ecommerce-search-experience)

### Database Design
- [Allstars — product attributes DB design FK vs JSONB](https://www.allstarsit.com/blog/ecommerce-product-attributes-database-design-best-practices-patterns)
- [Microsoft — JSON catalog patterns SQL Server](https://techcommunity.microsoft.com/blog/sqlserver/designing-product-catalogs-in-sql-server-using-json/384594)
- [Practical Ecommerce — better way to store variants](https://www.practicalecommerce.com/A-Better-Way-to-Store-Ecommerce-Product-Information)
- [Mediusware — variant-wise storage organization](https://mediusware.com/blog/from-complexity-to-clarity-organizing-variant-wise)

### Bulk Operations / Cascade
- [Matrixify Shopify SKU bulk update](https://matrixify.app/tutorials/bulk-update-shopify-product-sku/)
- [Shopify bulk editing](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/bulk-editing)
- [Magento Store Manager bulk update](https://www.mag-manager.com/product-information/magento-inventory-management/how-to-bulk-update-magento-product-skus/)

### Warehouse / Stock
- [Inventoryops — Bin Locations](https://www.inventoryops.com/articles/bin-locations.html)
- [Katana — bin location best practices](https://katanamrp.com/blog/warehouse-bin-location/)
- [Linnworks — warehouse locations and labeling](https://www.linnworks.com/blog/warehouse-locations-and-bin-labeling-best-practices-and-tips/)
- [Microsoft Dynamics inventory dashboards](https://learn.microsoft.com/en-us/dynamics365/intelligent-order-management/inventory-dashboards)
- [UI Bakery inventory management dashboard template](https://uibakery.io/templates/inventory-management-dashboard)

### Automotive / Fitment (defer v1.4)
- [PDM Automotive ACES/PIES guide](https://pdmautomotive.com/aces-and-pies-the-ultimate-guide/)
- [Convermax fitment sources](https://convermax.com/fitment-sources)
- [ShowMeTheParts cataloging](https://info.showmetheparts.com/)
