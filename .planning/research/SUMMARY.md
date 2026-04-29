# v1.3 Research Summary — Variantes y Modelo de Stock

**Project:** Objetiva Comercios Admin
**Milestone:** v1.3 — Variantes y Modelo de Stock
**Researched:** 2026-04-29
**Confidence:** HIGH (decisiones cerradas + Context7 + verificación directa contra schema)

> Decision aid for milestone-level planning. Synthesizes [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md) y [v1.3-design-notes.md](./v1.3-design-notes.md). Pensado para alimentar `REQUIREMENTS.md` y la creación del ROADMAP.

---

## Executive Summary

v1.3 es **un milestone de columna vertebral**: revierte parcialmente la decisión de v1.0 ("flat properties cubren el caso") porque el negocio (rubrería de repuestos) requiere modelado fino con catálogos compartidos, generación automática de SKU/nombre vía templates, y consistencia entre artículos hermanos. La promoción de `sku` a PK de `articulos` es el cambio bloqueante: arrastra 5 FKs hijas (orders, sales, purchases, existencias, inventarios_articulos), 6 servicios NestJS, 6 grupos de rutas web y los DTOs/types compartidos. En paralelo, formaliza el modelo de stock parchado vía quick tasks desde abril (`columna→ubicacion`, sectores transversales, migración histórica de existencias).

El enfoque recomendado es **single-table flat** (1 row = 1 SKU; sin separación madre/hijo estilo Shopify/WooCommerce), atributos como FK a catálogos (no JSONB, decisión cerrada), receta de SKU/nombre dirigida por `articulos_templates` + `template_atributos`, y cambios masivos atómicos vía preview + cascade transaccional + history append-only con `sku_anterior` como idempotencia. La mayor parte de la mecánica se resuelve **con el stack ya validado**: solo hay UNA dependencia nueva (`slugify ^1.6.6` en backend), advisory locks vía `pg_advisory_xact_lock`, migraciones SQL hand-authored (`drizzle-kit generate --custom`) y patrones ya consolidados (TanStack Table grouping, RHF + zod, Sheet, ServerDataTable).

Los riesgos críticos son tres: (1) la cutover SKU→PK con 5 FKs hijas, que sin pre-validación + transacción única destruye integridad referencial silenciosamente; (2) feedback loop entre el trigger de `articulos.unidades` (instalado por la quick task `260429-rec`) y los cascades de SKU, que multiplica el costo de rewrite; (3) divergencia silenciosa de "datos del modelo" entre filas hermanas, porque la consistencia es app-level (sin DB constraints — decisión cerrada). Mitigación: fase dedicada de cutover con preflight + lock explícito + tests de integridad, disable trigger durante cascade, separar `updateModel(codigo)` vs `updateVariant(sku)` en el servicio, y nightly drift check.

---

## Key Findings

### Stack additions (lo NUEVO sobre v1.0–v1.2)

Detalle: [STACK.md §Executive Recommendation](./STACK.md). El stack validado v1.0–v1.2 NO se re-recomienda.

- **`slugify ^1.6.6` (backend)** — única dependencia nueva. Slug determinista con transliteración Unicode locale `es` para componer SKU `codigo + slug(marca) + slug(talle)…`. Lockear opciones en `apps/backend/src/modules/articulos/sku.constants.ts`.
- **Drizzle Kit `--custom` SQL migrations** — `drizzle-kit generate` por sí solo NO detecta renames y produce DROP+ADD (data loss). Todo cambio que toque `columna`, `codigo`, `sku`, monetarios o FK columns DEBE ser hand-authored.
- **`pg_advisory_xact_lock` (raw SQL)** — serialización de operaciones de cascade SKU al nivel de operación (no row-level). Postgres-native, zero deps.
- **TanStack Table v8.21 grouping** (ya instalado) — `getGroupedRowModel` + `getExpandedRowModel` cubre el "vista plana / vista agrupada por codigo".
- **`useFieldArray` + `z.discriminatedUnion`** (ya instalados) — formularios dinámicos por template sin libs externas.
- **Append-only `articulo_sku_history`** dentro de Postgres (no event store externo). Transaccional con el cascade.
- **Anti-recomendaciones explícitas:** no `bullmq`/`redis`, no `temporal.io`, no JSON-Schema form generators, no `nanoid` para SKUs, no JSONB para atributos, no separar event store. (Justificadas en STACK.md §Anti-Recommendations).

> **Pendiente verificar antes de Fase 4 (Variantes UI):** si `apps/web` ya tiene TanStack Query wired up. Si no, decidir entre Server Actions + revalidate vs agregar `@tanstack/react-query ^5.90`. Ver STACK.md §Web.

### Feature table stakes (must-have para shippear v1.3)

Detalle: [FEATURES.md §Table Stakes](./FEATURES.md). 31 features identificadas; 28 son P1.

| Eje | TS-IDs | Resumen |
|---|---|---|
| **1. Variantes core** | TS-01…TS-16 | PK migration `codigo→sku` (TS-01 bloqueante), `codigo` como agrupador NOT UNIQUE indexado (TS-02), tablas `articulos_templates` + `template_atributos` (TS-03/04), catálogos FK `atributo_*` (TS-05), columnas FK en `articulos` (TS-06), SKU+nombre auto (TS-07/08), CRUD catálogos+templates (TS-09/10), wizard de creación 3 pasos (TS-11), edit variante / edit modelo cascada (TS-12/13), listado agrupado por codigo (TS-14), codigo manual + codigo_barras separado (TS-15/16). |
| **2. Cambios masivos schema** | TS-17…TS-20 | Preview de impacto pre-confirm (TS-17), cascade transaccional con advisory lock (TS-18), tabla `articulo_sku_history` append-only (TS-19), campo `sku_anterior` para idempotencia (TS-20). |
| **3. Stock redesign** | TS-21…TS-27 | Rename `columna→ubicacion` (TS-21), tablas `sectores` + pivot `sector_ubicaciones` M:N (TS-22), CRUD sectores (TS-23), ejecución de migración histórica de existencias pendiente desde abril (TS-24), filtros por ubicación/sector (TS-25), edición visual pivot table (TS-26), dashboard stock por sector (TS-27). |
| **4. Comprobantes refieren SKU** | TS-28…TS-29 | Rename `articulo_codigo→articulo_sku` en order/sale/purchase items (TS-28) + selector compuesto (codigo, nombre, SKU, código de barras) en alta (TS-29). |
| **5. Tech debt consolidado** | TS-30…TS-31 | `doublePrecision→numeric(10,2)` en monetarios (deferred desde v1.0), drift TS↔DB cleanup (índices, precision, timestamp). |

**Anti-features (NO construir):** JSONB para atributos, variant matrix combinatorial UI, pricing tiers relativos, multi-currency, vehículos compatibles (diferido a v1.4), reorder automático, lot/batch tracking, full-text search por descripción de variante. Detalle en FEATURES.md §Anti-Features.

**Differentiators (defer si scope tight):** D-02 undo last bulk change, D-05 preview WYSIWYG, D-07 webhook events para variantes — agregar en patches v1.3.x si hay tiempo.

### Architecture integration shape

Detalle: [ARCHITECTURE.md §Diagrama de capas](./ARCHITECTURE.md), §Migration order, §Suggested build order.

**Módulos backend nuevos:** `CatalogosModule`, `TemplatesModule`, `SkuRegenerationModule`, `UbicacionesModule`. **Módulos a modificar:** `ArticulosModule` (split `updateModel(codigo)` vs `updateVariant(sku)`), `ExistenciasModule` (FK sku + ubicacion_id + `findBySector`), `InventariosModule` (FK sku + ubicacion FK), `Orders/Sales/Purchases` (FK rename), `WebhooksModule` (payload bump v2).

**Rutas web nuevas:** `/catalogos`, `/catalogos/ubicaciones`, `/catalogos/sectores`, `/templates`, `/articulos/[codigo]/variantes`, `/articulos/sku/[sku]/editar`, `/dashboard/stock-por-sector`. **Rutas modificadas:** `/articulos` (vista agrupada toggle), `/articulos/existencias` (filtro sector + ubicacion), `/articulos/inventarios/[id]` (ubicacion no columna).

**Componentes nuevos:** `CatalogoTable<T>` genérico, `AtributoSelectField` (FK select + create-on-the-fly), `TemplateBuilder` (drag-drop atributos a slots SKU/nombre), `SkuPreviewDialog`, `VariantesGroupedList`, `VarianteForm` / `ModeloForm` (split del actual `ArticuloForm`), `SectorBoard`, `UbicacionEditor` (pivot edit).

**Migration order DB (estricto):** Fase A catálogos (CREATE atributo_* + templates + seed + backfill FK NULLABLE) → Fase B SKU PK promotion (backfill `sku=codigo`, drop FKs, drop PK, add PK sku, rename FK columns, re-add FKs) → Fase C stock redesign (CREATE ubicaciones + sectores + pivot, rename `columna`) → Fase D migración histórica existencias → Fase E `articulo_sku_history` → Fase F tech debt (numeric, drift).

**Aislamiento:** stock redesign (Fases C+D+E del schema) es independiente de variantes/SKU PK — pueden paralelizarse en el roadmap. La cutover SKU PK (Fase B schema) es bloqueante para variantes UI y comprobantes.

### Watch out for (top critical pitfalls)

Detalle: [PITFALLS.md §Critical Pitfalls](./PITFALLS.md). 20 pitfalls identificados; estos son los 6 críticos con asignación de fase:

| # | Pitfall | Fase asignada | Mitigación clave |
|---|---|---|---|
| **P-01** | PK swap rompe 4 FK hijas simultáneas (cascade silencioso) | Fase **PK Swap & Schema Cutover** | 7-step ordered transaction con `LOCK TABLE … IN ACCESS EXCLUSIVE MODE`, backfill antes de drop PK, validar 0 huérfanos antes de COMMIT. |
| **P-02** | Trigger feedback loop `articulos.unidades` SUM (instalado por quick `260429-rec`) × cascade SKU = N² rewrites | Fase **Cascade Engine + Audit History** | DISABLE TRIGGER dentro de la transacción + recompute manual al final + ENABLE. Backup: `pg_trigger_depth() > 1` guard en la función. |
| **P-04** | Slug collisions cross-catalog (talle "XL" + color "XL" → `abc-xl-xl` ambiguo) | Fase **Catálogos** + Fase **Variantes UI** | Validar SKU uniqueness en composición (no solo en write), normalización slug determinista NFD+strip, rechazar slugs duplicados en una misma composición. |
| **P-05** | Columna `articulos.sku` ya existe — puede tener data stale/garbage de producción | Fase **PK Swap** (preflight task #1) | Audit script obligatorio antes de migración: `SELECT count(*) FILTER (WHERE sku != codigo)`, `count(DISTINCT sku)`. Triagear con usuario. |
| **P-10** | Divergencia silenciosa de "datos comunes" entre filas hermanas (sin DB constraints — decisión cerrada) | Fase **Variantes UI** + Fase **Tech Debt** | Backend split `updateModel(codigo)` vs `updateVariant(sku)`. Nightly consistency-check job que emite webhook on drift. |
| **P-13** | Cascade re-run double-applies (network blip + retry → `abc-xl-rojo-rojo`) | Fase **Cascade Engine** | Build mapping `{old→new}` ANTES de UPDATE; usar `sku_anterior` como idempotency key (skip si ya aplicado). |

**Moderate pitfalls relevantes para discusión por fase:** P-07 (Drizzle rename → DROP+ADD si CI no-TTY), P-08 (JSONB columnas → pivot dedup), P-09 (sentinel `'0'` colisiona con ubicación real "0" — proponer NULL o `'SIN_UBICACION'`), P-15 (N+1 en grouped variant lists — usar `jsonb_agg` server-side), P-20 (`numeric()` retorna string en Drizzle, breakea aritmética JS silenciosa).

---

## Recommended Phase Structure

ARCHITECTURE.md y FEATURES.md sugieren build orders ligeramente distintos. Reconciliados acá. Detalle: [ARCHITECTURE.md §Suggested build order](./ARCHITECTURE.md), [FEATURES.md §Feature Dependencies](./FEATURES.md).

| # | Fase | Bloquea a | Delivers | Pitfalls a evitar |
|---|---|---|---|---|
| **1** | **Catálogos de atributos** (DB + Backend + UI ABM unificada) | 2, 3, 4 | Tablas `atributo_marcas/colores/talles/materiales/presentaciones/objetos/calificadores` + seed con DISTINCT de articulos actuales + módulo `CatalogosModule` + página `/catalogos`. Self-contained: no toca `articulos`. | P-04 (slug rules), P-11 (denorm strategy temprana). |
| **2** | **Templates + composición SKU/nombre** (function pura testeable) | 4, 5 | `articulos_templates` + `template_atributos` + `TemplatesModule` con `composeSku()` + `composeNombre()` + página `/templates` con builder + seed template `default`. Cierra Q4 (atributos finales del template). | P-13 (idempotencia), P-17 (`nombre_auto` vs manual). |
| **3** | **PK Swap `codigo→sku` + FK migration en hijas** (schema-heavy, mayor riesgo) | 4, 5, 6, 7, 8 | `sku` PK; `codigo` agrupador indexado NOT UNIQUE; `articulo_codigo→articulo_sku` rename en order/sale/purchase items, existencias, inventarios_articulos; `sku_anterior` column added; webhook payload bump v2. | P-01 (cutover), P-02 (trigger guard), P-05 (preflight), P-19 (webhook contract). |
| **4** | **Variantes UI** (split ArticuloForm + AtributoSelectField + listado agrupado + wizard 3 pasos) | 6 (parcial) | `VarianteForm` + `ModeloForm`, `AtributoSelectField`, `VariantesGroupedList`, rutas `/articulos/[codigo]/variantes/*`, edit variante / edit modelo cascada (app-level). | P-04, P-06 (codigo_barras unique), P-10 (model vs variant fields), P-12 (image ownership), P-15 (N+1). |
| **5** | **Cascade Engine + Audit History** (preview + transacción atómica + history) | — | `SkuRegenerationModule` con dry-run + execute, `articulo_sku_history` append-only (partitioned by month), advisory lock, idempotency via `sku_anterior`, undo last batch. **Tests obligatorios.** | P-02, P-03 (batching 500-1000 + advisory lock), P-13, P-16 (history bloat), P-18 (preview accuracy). |
| **6** | **Stock redesign** (rename `columna→ubicacion` + sectores + UIs) | 7 | `ubicaciones` + `sectores` + pivot `sector_ubicaciones` M:N, `UbicacionesModule`, rutas `/catalogos/ubicaciones` + `/catalogos/sectores`, filtros sector/ubicación, `UbicacionEditor` pivot table, `SectorBoard` dashboard. | P-07 (Drizzle rename interactive), P-08 (JSONB→pivot dedup). |
| **7** | **Migración histórica de existencias** (ejecución del plan Q8) | — | Script idempotente: por cada articulo con `unidades > 0`, INSERT/UPDATE existencia con `ubicacion` desde `sanchez.articulos.columna` (slugify match) o NULL/`SIN_UBICACION` sentinel. ~7,500 con match, ~80–400 sentinel. Reporte post-ejecución. | P-09 (revisar sentinel `'0'`). |
| **8** | **Tech Debt cleanup** (numeric monetario + drift TS↔DB + placeholder header) | — | `doublePrecision→numeric(10,2)`, índices renombrados en TS, `timestamp(6)` consistency, placeholder removido. Sin riesgo conceptual; riesgo técnico = serialización numeric→string en JS. | P-14 (schema parity post-manual SQL), P-20 (numeric returns string in Drizzle — audit `precio*cantidad` usages). |

### Phase ordering rationale

- **1+2 antes que 3:** los catálogos y la receta del SKU deben existir antes de la cutover, porque la cutover backfillea `sku=codigo` pero el cascade engine de Fase 5 ya necesita `composeSku()` funcional contra catálogos seeded.
- **3 es absolutamente bloqueante** para 4 (variantes UI), 5 (cascade), 8 (rename FK en comprobantes — incluido aquí). Sin `sku` PK y FKs renombradas no hay variantes con id distinto.
- **4 puede empezar parcialmente con 3** si Fase 3 deja el sistema funcional con `sku=codigo` (caso identidad inicial).
- **5 requiere 1+2+3+4** completas — es la integración de toda la mecánica.
- **6 paraleliza con 4+5** — stock redesign no toca `articulos`/comprobantes, solo `existencias`/`inventarios_articulos`/`sectores`. Aprovecha equipos paralelos.
- **7 depende solo de 6** (ubicaciones existen).
- **8 puede entrar antes/después/paralelo** a cualquiera, idealmente combinado con la transacción de Fase 3 para reducir downtime (TS-30 toca filas masivas igual que la cutover).

### Research flags (para `/gsd-plan-phase`)

- **Fase 3 (PK Swap):** patrones bien documentados (Postgres FK CASCADE, Drizzle custom migrations) — **skip research-phase**, pero requiere `/gsd-discuss-phase` cerrado de Q5, Q9.
- **Fase 5 (Cascade Engine):** advisory locks + idempotencia + history partitioning son patterns estándar — **skip research-phase**.
- **Fase 6 (Stock redesign):** patrón pivot M:N estándar — **skip research-phase**, pero validar Q11 (qué UIs entran).
- **Fase 7 (Migración histórica):** **research-phase recomendado** para validar mapping slugify(`sanchez.articulos.columna`) vs ubicaciones reales contra dataset actual (puede haber edge cases — guiones, espacios, `'0'`, NULL).
- **Resto (1, 2, 4, 8):** patterns bien establecidos en el codebase actual o en el research existente — `/gsd-discuss-phase` suficiente.

---

## Open Questions to Resolve in `/gsd-discuss-phase`

Detalle: [v1.3-design-notes.md §Gray areas](./v1.3-design-notes.md). Cada Q se resuelve **antes de planificar la fase** que la consume; **una decisión a la vez** (no batch).

| Q | Tema | Cierra qué | Fase que la consume | Recomendación tentativa |
|---|---|---|---|---|
| **Q1** | Modelo de columnas para atributos del rubro (A1 pivot extras / A2 slots / A3 wide / A4 tabla por template) | TS-06, TS-09 | Fase 1 (Catálogos) | A1: pocas columnas comunes en `articulos` + pivot `articulo_atributos` para extras del rubro. Evita AF-06 (inheritance). |
| **Q2** | Vincular atributos por id, slug, o nombre + cache (denormalización) | D-01, TS-29, P-11 | Fase 1 (Catálogos) | FK por id + storage de id+slug en `articulos`. JOIN para nombre cuando se necesita. NO trigger denorm en v1.3 (P-11). |
| **Q3** | Vehículos compatibles a v1.3 o v1.4 | AF-05 (anti-feature flip) | Antes de la Fase 1 (alcance milestone) | Diferir a v1.4 — alcance grande, justificado en PROJECT.md Out of Scope. |
| **Q4** | Atributos finales del template default automotor | TS-06, columnas FK exactas en `articulos` | Fase 2 (Templates) | Confirmar tabla propuesta en design-notes Q4 (objeto, calificador, marca, modelo, presentacion, talle, color, material, medida) — pero "este modelo no lleva variantes hoy". |
| **Q5** | `propAux1..5` keep / drop / rename | TS-31 + datos legacy | Fase 8 (Tech Debt) | Drop si no hay consumers; renombrar a tipos concretos si los hay. Audit primero. |
| **Q6** | `categoria/subcategoria/rubro/subrubro/adjetivo` taxonomía vs atributos | TS-04, TS-06 | Fase 2 (Templates) | Atributos del template (renombre `adjetivo→calificador`); taxonomía jerárquica fuera de scope v1.3 si no hace falta. |
| **Q7** | `codigo` manual o autogen | TS-15 | Fase 4 (Variantes UI) | Manual, alineado con `erp_codigo`. Validación de unicidad-por-grupo configurable. |
| **Q8** | Plan migración existencias revisado | TS-24 | Fase 7 (Migración histórica) | Confirmar sentinel: NULL o `'SIN_UBICACION'` (NO `'0'` — P-09). Validar contra dataset actual. |
| **Q9** | Drift TS↔DB (índices, precision, timestamp) | TS-31 | Fase 8 (Tech Debt) | Entra a v1.3 — bajo costo, alto valor en reviews futuros. |
| **Q10** | Qué tech debt entra a v1.3 (numeric, header placeholder, HOOK-03/06, POST /api/existencias huérfano) | TS-30, TS-31 | Antes de Fase 8 | Numeric SÍ (deferred desde v1.0); header placeholder SÍ (trivial); HOOK docs SÍ (info-level); POST huérfano evaluar. |
| **Q11** | Qué UIs nuevas entran (edición visual existencias, vista por sector, dashboards, ABM catálogos/templates/variantes) | TS-23, TS-26, TS-27, TS-09, TS-10, TS-11 | Antes de Fase 4 y 6 | Todas las P1 entran (ver tabla de prioridades en FEATURES.md). TS-27 (dashboard sector) puede ir como P2 si scope tight. |

**Pitfall-driven open questions (de PITFALLS.md):**
- P-09: confirmar sentinel `NULL` o `'SIN_UBICACION'` (no `'0'`).
- P-10: trigger SQL vs service-only enforcement para "model fields"?
- P-11: trigger vs view vs join puro para denorm de catálogos?
- P-12: ownership de imágenes — codigo-prefix folder o sku-prefix folder?

---

## Confidence Assessment

| Área | Confidence | Notas |
|---|---|---|
| **Stack** (lo nuevo) | HIGH | Context7 verified para `slugify`, `drizzle-kit --custom`, TanStack Table grouping, RHF + zod dynamic schema. Una sola dep nueva — ámbito acotado. |
| **Features** (table stakes + anti-features) | HIGH | Decisiones cerradas en design-notes + benchmarking de Shopify/Medusa/Saleor/WooCommerce/Vendure + patterns de WMS (Inventoryops, Katana). 11 gray areas Q1–Q11 explícitas. |
| **Architecture** (módulos, rutas, migration order) | HIGH | Verificado contra `schema.ts`, services y rutas web actuales. Migration order paso-a-paso con checkpoints SQL. Único punto MEDIUM: drift TS↔DB sin verificar columna por columna (Q9). |
| **Pitfalls** | HIGH | Postgres semantics + Drizzle behaviors verificados contra docs oficiales y issue tracker (drizzle-team/drizzle-orm#3826). 20 pitfalls con SQL/TS code patterns concretos. Único punto MEDIUM: comportamiento exacto del trigger `260429-rec` requiere validación contra DB live antes de Fase 5. |

**Overall confidence: HIGH** — el milestone está listo para REQUIREMENTS.md y ROADMAP.

### Gaps to address durante planning

- **Verificar TanStack Query en `apps/web`** antes de Fase 4: `grep -r "useQuery\|QueryClient" apps/web/src`. Si no está, decidir Server Actions + revalidate vs agregar `@tanstack/react-query ^5.90`. (STACK.md §Web)
- **Audit de `articulos.sku` en producción** antes de Fase 3 (P-05): `SELECT count(*) FILTER (WHERE sku IS NOT NULL AND sku != codigo)`. Triagear con usuario si hay data legacy.
- **Validar trigger `260429-rec` exacto** antes de Fase 5 (P-02): leer función, confirmar qué eventos dispara, qué tablas escribe.
- **Cierre de Q1–Q11** en `/gsd-discuss-phase` por fase, una decisión a la vez.
- **Validar mapping slugify vs ubicaciones reales** (Fase 7 research-phase): correr dry-run contra `sanchez.articulos.columna` para estimar match-rate real (estimado 7,500/7,873 ≈ 95%).

---

## Sources

### Primary (HIGH confidence)
- Context7: `/drizzle-team/drizzle-orm-docs`, `/tanstack/table`, `/react-hook-form/documentation`, `/simov/slugify` — verificación de APIs y patterns
- `apps/backend/src/db/schema.ts` — schema actual (lectura completa)
- `apps/backend/src/modules/{articulos,existencias,inventarios}/*` — services y patterns existentes
- `apps/web/src/components/articulos/{articulo-form,articulo-sheet}.tsx` — patterns RHF + Sheet
- [.planning/PROJECT.md](../PROJECT.md) — validated requirements + Key Decisions + Out of Scope
- [.planning/research/v1.3-design-notes.md](./v1.3-design-notes.md) — decisiones cerradas + Q1–Q11

### Secondary (MEDIUM-HIGH confidence)
- Postgres docs (explicit-locking, trigger-definition, partitioning), Unicode UAX #15 (slug normalization)
- Shopify ProductVariant, Medusa product module, Saleor variant creator, WooCommerce variable products, Vendure ProductVariant — feature benchmarking
- SKU best practices: Symbia, Eshopbox, OmniOrders, Nisum, Algolia, Elastic
- Warehouse/bin-location: Inventoryops, Katana, Linnworks
- Allstars / Practical Ecommerce / Microsoft — FK vs JSONB DB design
- drizzle-team/drizzle-orm issue #3826 — rename detection bug (verificado open)

### Tertiary (LOW confidence — needs validation during phase)
- Trigger exacto instalado por quick `260429-rec` — leer función pre-Fase 5
- Match-rate de slugify(`sanchez.articulos.columna`) vs ubicaciones reales — dry-run en Fase 7
- Drift columna-por-columna TS schema vs DB live — audit en Fase 8

---

*Research completed: 2026-04-29*
*Ready for REQUIREMENTS.md derivation: yes*
