# Roadmap: Objetiva Comercios Admin

## Milestones

- ✅ **v1.0 MVP** — Phases 1-13 (shipped 2026-03-04) — [Full details](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Modelo Articulos + Inventario** — Phases 14-18 (shipped 2026-03-10) — [Full details](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Articulos CRUD + Imagenes + API Keys + Webhooks** — Phases 19-28 (shipped 2026-03-13) — [Full details](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 Variantes y Modelo de Stock** — Phases 29-37 (in progress, started 2026-04-29)

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

<details>
<summary>✅ v1.1 Modelo Articulos + Inventario (Phases 14-18) — SHIPPED 2026-03-10</summary>

- [x] Phase 14: Schema Foundation + Articulos + Depositos (5/5 plans) — completed 2026-03-05
- [x] Phase 15: Existencias (3/3 plans) — completed 2026-03-05
- [x] Phase 16: Downstream Migration + Dashboard + Navigation (4/4 plans) — completed 2026-03-05
- [x] Phase 17: Inventarios (5/5 plans) — completed 2026-03-06
- [x] Phase 18: Fix Inventarios Article Count Display (1/1 plans) — completed 2026-03-06

</details>

<details>
<summary>✅ v1.2 Articulos CRUD + Imagenes + API Keys + Webhooks (Phases 19-28) — SHIPPED 2026-03-13</summary>

- [x] Phase 19: Articulos CRUD Completo (3/3 plans) — completed 2026-03-11
- [x] Phase 20: Image Upload Backend (1/1 plans) — completed 2026-03-12
- [x] Phase 21: Image Upload Frontend + Detalle (2/2 plans) — completed 2026-03-12
- [x] Phase 22: Vista Lista Configurable (2/2 plans) — completed 2026-03-12
- [x] Phase 23: API Keys (2/2 plans) — completed 2026-03-12
- [x] Phase 24: Webhooks (4/4 plans) — completed 2026-03-12
- [x] Phase 25: Wire Frontend Soft-Delete + Verify (1/1 plans) — completed 2026-03-12
- [x] Phase 26: Tech Debt Cleanup v1.2 (1/1 plans) — completed 2026-03-12
- [x] Phase 27: Add objeto to ArticuloForm (1/1 plans) — completed 2026-03-13
- [x] Phase 28: Add objeto to ArticuloSheet (1/1 plans) — completed 2026-03-13

</details>

### 🚧 v1.3 Variantes y Modelo de Stock (Phases 29-37) — IN PROGRESS

- [x] **Phase 29: Catálogos de Atributos** — ABM unificado de catálogos FK (marcas, colores, talles, materiales, presentaciones, objetos, calificadores) con slug autogenerado, soft-delete y create-on-the-fly (completed 2026-04-30)
- [x] **Phase 30: Templates + Composición SKU/Nombre** — Tablas `articulos_templates` + `template_atributos`, función pura `composeSku()` + `composeNombre()`, builder UI y seed del template default (completed 2026-05-17)
- [ ] **Phase 31: PK Swap codigo→sku + FK rename comprobantes** — Promoción de `sku` a PK de `articulos`, `codigo` agrupador NOT UNIQUE, rename FK en orders/sales/purchases/existencias/inventarios_articulos, webhook payload v2
- [ ] **Phase 32: Variantes UI** — Split `ArticuloForm` en `ModeloForm` + `VarianteForm`, `AtributoSelectField`, listado agrupado por `codigo`, wizard 3 pasos, edit modelo cascada app-level
- [ ] **Phase 33: Cascade Engine + Audit History** — Preview de impacto, transacción atómica con advisory lock + trigger guard, `articulo_sku_history` append-only particionada, idempotencia vía `sku_anterior`, undo last batch
- [ ] **Phase 34: Stock Schema (ubicaciones + sectores)** — Rename `columna→ubicacion`, CRUD ubicaciones físicas, sectores transversales con pivot M:N, deprecación de `inventario_sectores.columnas` JSONB
- [ ] **Phase 35: Stock UI (filtros + edición visual + dashboard)** — Filtros por ubicación/sector en existencias, pivot table de edición visual, dashboard de stock por sector
- [ ] **Phase 36: Migración Histórica de Existencias** — Ejecución idempotente del plan Q8: poblar `ubicacion` desde dump de `sanchez` (~7,500 filas estimadas), sentinel para sin-match, reporte post-migración
- [ ] **Phase 37: Tech Debt v1.3** — `doublePrecision→numeric(10,2)` en monetarios, alineación TS↔DB (índices, precision, timestamp), remoción de placeholder en `header.tsx`

## Phase Details (v1.3)

### Phase 29: Catálogos de Atributos

**Goal**: El admin puede gestionar los catálogos de valores (marcas, colores, talles, materiales, presentaciones, objetos, calificadores) que serán FK en `articulos`, sin tocar todavía el modelo de variantes ni la PK swap.

**Depends on**: Nothing (self-contained, no toca `articulos` aún)

**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04

**Success Criteria** (what must be TRUE):

1. Admin entra a `/catalogos` y ve listas paginadas de los 7 catálogos (marcas, colores, talles, materiales, presentaciones, objetos, calificadores) con CRUD completo (crear, editar, soft-delete)
2. Al crear un valor nuevo en un catálogo, el sistema autogenera el slug desde el nombre (NFD + lowercase + strip diacritics) y lo muestra en preview editable
3. Si el admin intenta crear un slug duplicado dentro del mismo catálogo, el sistema rechaza el alta con mensaje legible "slug ya existe en este catálogo"
4. El admin puede desactivar (soft-delete) un valor; el valor desaparece de los selectores nuevos pero se preserva en datos históricos (queries con `activo=true` por default)
5. Desde el formulario de artículo, el admin puede agregar un valor nuevo al catálogo sin salir del form (create-on-the-fly) y verlo disponible inmediatamente en el `AtributoSelectField`

**Plans**: 6 plans (en 6 waves)

Plans:

- [x] 29-01-PLAN.md — Schema Drizzle: 6 tablas prop\_\* + UNIQUE LOWER(nombre) + CHECK abrev regex + custom SQL trigger comentado (Wave 1)
- [x] 29-02-PLAN.md — [BLOCKING] Schema push: pnpm db:migrate aplica los 2 migrations contra Postgres + smoke tests de constraints (Wave 2)
- [x] 29-03-PLAN.md — Backend NestJS: PropiedadesModule parametrizado por :tipo (controller + service + 2 DTOs + constants) + RBAC + manejo 23505 + registro en AppModule (Wave 3)
- [x] 29-04-PLAN.md — Web infra: types + suggestAbrev TDD (Vitest) + 4 fetchers api.client + entry sidebar Tags (Wave 4)
- [x] 29-05-PLAN.md — Web UI: PropiedadCreateDialog standalone reusable (D-19) + Edit/Deactivate dialogs + PropiedadTable genérica + PropiedadesPage (Tabs lazy) + ruta /propiedades (Wave 5)
- [x] 29-06-PLAN.md — E2E Playwright cubriendo flujo completo + checkpoint humano UI-SPEC compliance (Wave 6)

**Note**: SC#5 está diferido a Phase 32 por D-19. Phase 29 entrega CAT-02 parcial — el componente PropiedadCreateDialog standalone listo, pero NO cableado al ArticuloForm.
**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 29`**: Q1 (modelo de columnas para atributos del rubro), Q2 (vincular por id/slug/nombre + cache), Q11 (qué UIs entran)
**Pitfalls**: P-04 (slug collisions cross-catalog → reglas de slug deterministas + CHECK constraint), P-11 (denorm trigger silent failure → preferir join puro o generated column)

---

### Phase 30: Templates + Composición SKU/Nombre

**Goal**: El admin tiene un sistema de templates configurables que define qué atributos aplican, cuáles van al SKU + en qué orden, cuáles van al nombre auto + en qué orden, y cuáles son ejes de variante. La función pura `composeSku()` + `composeNombre()` queda testeada y lista para alimentar Fase 32 y 33.

**Depends on**: Phase 29 (catálogos seedeados)

**Requirements**: TPL-01, TPL-02, TPL-03, TPL-04, TPL-05

**Success Criteria** (what must be TRUE):

1. Admin entra a `/templates` y ve la lista de templates; puede crear, editar y eliminar templates con nombre, descripción y flag `is_default`
2. Dentro de un template, admin define qué atributos aplican (drag-drop al builder), marca cada uno como "variante" o "no-variante", y asigna `orden_sku` y `orden_nombre` (NULL = no participa)
3. El builder muestra un preview WYSIWYG en vivo: ejemplo de SKU y nombre auto generado con valores de muestra del primer artículo del catálogo
4. Al crear un artículo nuevo, el sistema usa automáticamente el template marcado como `is_default` y deja el modelo preparado para multi-template (v1.4+)
5. La función pura `composeSku(codigo, atributos, template)` y `composeNombre(atributos, template)` están cubiertas por tests unitarios con casos de slug collision, NFD normalization y atributos faltantes

**Plans**: 4 plans (en 4 waves)

Plans:

- [x] 30-01-PLAN.md — Shared composer (types + utils + tests RED-GREEN) (Wave 0)
- [x] 30-02-PLAN.md — [BLOCKING] Migration 0008: prop_familia + prop_aplicacion + articulos_templates + template_atributos + DROP legacy (Wave 1)
- [x] 30-03-PLAN.md — Backend module templates + extensión propiedades (familia + aplicacion) (Wave 2)
- [x] 30-04-PLAN.md — Frontend tabs Familias + Aplicaciones + extensión PropiedadTable/Dialog (Wave 3)

**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 30`**: Q4 (atributos finales del template default), Q6 (`categoria/subcategoria/rubro/subrubro/adjetivo` taxonomía vs atributos)
**Pitfalls**: P-13 (cascade idempotency → mapping `{old→new}` antes de UPDATE), P-17 (`nombre_auto` vs manual edit interaction), P-18 (preview accuracy bajo edits concurrentes)

---

### Phase 31: PK Swap codigo→sku + FK rename en comprobantes

**Goal**: `articulos.sku` es PK desde el día siguiente al deploy; `codigo` queda como agrupador indexado NOT UNIQUE; las 5 tablas hijas (orders/sale/purchase items, existencias, inventarios_articulos) referencian `articulo_sku`; el webhook payload bumpea a v2 con `sku` y `codigo` ambos presentes para compat. Es la fase de mayor riesgo del milestone.

**Depends on**: Phase 29, Phase 30 (catálogos y templates deben existir antes de la cutover porque el cascade engine de Fase 33 ya necesita `composeSku()` funcional contra catálogos seeded; la cutover backfillea `sku=codigo` para datos existentes)

**Requirements**: VAR-10

**Success Criteria** (what must be TRUE):

1. `\d articulos` en psql muestra `sku` como PK y `codigo` con índice no único; `SELECT count(*) FROM articulos WHERE sku IS NULL` retorna 0
2. Las 5 tablas hijas (`order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`) tienen columna `articulo_sku` con FK válida hacia `articulos.sku`; `articulo_codigo` queda removida en deploy posterior
3. Backend split funciona: `findOne(sku)` retorna 1 fila, `findByCodigo(codigo)` retorna N filas (todas las hermanas), y la cutover preserva el comportamiento previo cuando `sku=codigo`
4. Webhooks `articulo.created/updated/deleted` siguen disparando con payload v2 que incluye tanto `sku` como `codigo`; los suscriptores existentes reciben "v1.3 cutover notice" antes del deploy
5. Tests de integridad referencial post-cutover pasan: `SELECT count(*) FROM order_items oi LEFT JOIN articulos a ON oi.articulo_sku=a.sku WHERE a.sku IS NULL` retorna 0 (idem para existencias, inventarios_articulos, sale_items, purchase_items)

**Plans**: TBD
**Open Qs to close in `/gsd-discuss-phase 31`**: Q5 (preflight: auditar `articulos.sku` actual — ver P-05), Q9 (drift TS↔DB en índices y precision afecta migration generada)
**Pitfalls**: P-01 (PK swap rompe 4 FK simultáneas → 7-step ordered transaction con LOCK ACCESS EXCLUSIVE), P-02 (trigger `260429-rec` feedback loop → DISABLE TRIGGER + recompute manual + ENABLE), P-05 (data legacy en `articulos.sku` → audit script obligatorio pre-migración), P-19 (webhook contract change → bump version + notice)

---

### Phase 32: Variantes UI

**Goal**: El admin puede crear, editar y listar variantes de artículos con un sistema flat single-table donde cada fila es una variante (o el artículo solo si no tiene variantes). El `ArticuloForm` queda particionado en `ModeloForm` (campos comunes, cascada por `codigo`) y `VarianteForm` (atributos variante, precio, stock, código de barras propio); la lista agrupa por `codigo` con expand row.

**Depends on**: Phase 29 (catálogos), Phase 30 (templates), Phase 31 (sku PK + `codigo` agrupador). Puede arrancar en paralelo a Phase 33+34 una vez Phase 31 esté firme.

**Requirements**: VAR-01, VAR-02, VAR-03, VAR-04, VAR-05, VAR-06, VAR-07, VAR-08, VAR-09

**Success Criteria** (what must be TRUE):

1. Admin crea un artículo nuevo sin variantes y el sistema setea `sku=codigo` automáticamente; la lista muestra una sola fila plana por ese `codigo`
2. Admin convierte un artículo en variantizado: clickea "agregar variante" desde la vista detalle, elige valores de atributos variante distintos, y el sistema genera el SKU concatenando `codigo + slug(atrib1) + slug(atrib2)…` según receta del template
3. Cuando un artículo tiene `nombre_auto=true`, el sistema regenera el nombre al guardar concatenando atributos según `orden_nombre`; al editar manualmente el campo `nombre`, el flag se flippea automáticamente a `false` y el nombre manual queda fijo
4. La lista `/articulos` ofrece toggle "Vista plana / Vista agrupada"; en agrupada cada `codigo` es una fila master expandible con count de variantes y stock total; expandir muestra las N variantes con sus SKUs y atributos diferenciadores
5. Admin abre "Editar datos del modelo" y modifica marca/categoría/etc.; el sistema confirma el count de variantes afectadas y propaga vía `UPDATE WHERE codigo=X`; "Editar datos de la variante" modifica solo `WHERE sku=Y`; cada variante tiene su propio `codigo_barras` UNIQUE y las nuevas NO heredan el de la origen

**Plans**: TBD
**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 32`**: Q7 (`codigo` manual o autogen), Q11 (qué UIs entran — wizard 3 pasos, edit cascada modelo, listado agrupado), P-12 (image ownership: codigo-prefix vs sku-prefix folder)
**Pitfalls**: P-04 (slug collisions en composición → validar SKU uniqueness pre-write), P-06 (`codigo_barras` UNIQUE constraint + UI enforce que nuevas no heredan), P-10 (divergencia silent entre hermanas → backend split `updateModel` vs `updateVariant` + nightly drift check), P-12 (image ownership por `codigo`-prefix folder, no mover archivos en cutover), P-15 (N+1 en grouped list → `jsonb_agg` server-side)

---

### Phase 33: Cascade Engine + Audit History

**Goal**: El admin puede modificar la receta del template (cambiar orden_sku, agregar/quitar atributos del SKU) y aplicar la regeneración masiva con preview previo, transacción atómica con cascade a las 5 tablas hijas, audit trail append-only e idempotencia. Incluye undo last batch.

**Depends on**: Phase 29, 30, 31, 32 — es la integración de toda la mecánica

**Requirements**: SKU-01, SKU-02, SKU-03, SKU-04, SKU-05

**Success Criteria** (what must be TRUE):

1. Admin abre `/templates/[id]/edit` y al modificar la receta clickea "Aplicar cambios"; el `SkuPreviewDialog` muestra un diff lado a lado (sku_viejo, sku_nuevo, nombre_viejo, nombre_nuevo) con count total afectado y muestra de hasta 20 filas
2. Al confirmar, el cascade ejecuta en una sola transacción: `INSERT articulo_sku_history` (append-only, particionado por mes) → `UPDATE articulos SET sku=nuevo, sku_anterior=sku_viejo` → `UPDATE` en order_items, sale_items, purchase_items, existencias, inventarios_articulos vía mapping; el trigger de `articulos.unidades` queda DISABLE durante la transacción y se recomputa manual al final
3. Si la cascade falla a media operación, ROLLBACK restaura el estado previo completo; tests de integridad post-rollback verifican que `SELECT count(*) FROM order_items WHERE articulo_sku NOT IN (SELECT sku FROM articulos)` retorna 0
4. Re-aplicar el mismo cambio dos veces es no-op idempotente: el cascade detecta `sku_anterior == old_sku_we_re_about_to_set` y skipea; la mapping `{old→new}` se construye ANTES del UPDATE y si `old==new` para todas las filas, no escribe nada
5. Admin puede deshacer el último batch desde `/templates/history`: el sistema lista los últimos 10 batches con timestamp + count + botón "Deshacer"; el rollback ejecuta `UPDATE articulos SET sku=sku_anterior WHERE batch_id=X` + cascade inverso, validando antes que no haya escrituras posteriores que rompan el rollback

**Plans**: TBD
**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 33`**: confirmación final del trigger `260429-rec` exact behavior (validar contra DB live antes de comenzar)
**Pitfalls**: P-02 (trigger feedback loop → 3-layer defense: DISABLE TRIGGER + `pg_trigger_depth()` guard + session GUC), P-03 (bulk UPDATE sin batching → chunks de 500-1000 con `FOR UPDATE SKIP LOCKED` + advisory lock por `codigo`), P-13 (idempotency via `sku_anterior` key), P-16 (history bloat → `PARTITION BY RANGE (created_at)` mensual + retención 12-24 meses), P-18 (preview accuracy bajo edits concurrentes → `LOCK TABLE … IN SHARE MODE` o snapshot timestamp)

---

### Phase 34: Stock Schema (ubicaciones + sectores)

**Goal**: El esquema de stock queda formalizado: `columna` se renombra a `ubicacion` en `existencias` e `inventarios_articulos` preservando datos; existe ABM de ubicaciones físicas por depósito y de sectores transversales que agrupan ubicaciones vía pivot M:N; la tabla legacy `inventario_sectores.columnas` JSONB se deprecada limpiamente.

**Depends on**: Phase 31 (FK rename en `existencias.articulo_sku` + `inventarios_articulos.articulo_sku`); paraleliza con Phase 32 y 33 dado que stock redesign no toca `articulos` ni comprobantes.

**Requirements**: STOCK-01, STOCK-02, STOCK-03, STOCK-04

**Success Criteria** (what must be TRUE):

1. La migración renombra `existencias.columna→ubicacion` e `inventarios_articulos.columna→ubicacion` preservando los datos existentes (RENAME COLUMN, no DROP+ADD); post-migración `SELECT count(*) FROM existencias WHERE ubicacion IS NOT NULL` ≥ count pre-migración
2. Admin entra a `/catalogos/ubicaciones` y gestiona ubicaciones físicas (CRUD) por depósito con `(id, deposito_id FK, nombre, codigo, activo)`
3. Admin entra a `/catalogos/sectores` y gestiona sectores transversales con `(id, deposito_id FK, nombre, descripcion, activo)`; al editar un sector puede asignar/des-asignar múltiples ubicaciones vía multi-select (tabla pivot `sector_ubicaciones` con PK compuesta)
4. La relación es M:N efectiva: una ubicación puede pertenecer a 2+ sectores simultáneamente; el query `SELECT s.nombre FROM sectores s JOIN sector_ubicaciones su ON su.sector_id=s.id WHERE su.ubicacion_id=X` retorna múltiples sectores cuando aplica
5. La tabla legacy `inventario_sectores.columnas` JSONB se deprecada: la migración UNNEST de los arrays existentes en filas pivot (con dedup explícito), valida count vs `SUM(jsonb_array_length(columnas))` y mantiene la columna JSONB por 1 deploy como fallback antes de DROP

**Plans**: TBD
**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 34`**: Q11 (qué UIs entran en stock); confirmar tipo de columna en `inventarios_articulos.columna` (integer) vs `existencias.columna` (text) — pueden requerir manejo distinto
**Pitfalls**: P-07 (Drizzle rename → DROP+ADD en CI no-TTY → hand-edit migration con `RENAME COLUMN` y verificar SQL diff antes de commit), P-08 (JSONB columnas → pivot dedup con `DISTINCT btrim()` + audit pre-migración)

---

### Phase 35: Stock UI (filtros + edición visual + dashboard)

**Goal**: El admin tiene una experiencia de stock completa: filtra existencias por ubicación y sector con URL state, edita visualmente las existencias en una pivot table 2D (artículo × ubicación), y ve un dashboard con totales agrupados por sector con drill-down.

**Depends on**: Phase 34 (ubicaciones y sectores existen en DB con CRUD)

**Requirements**: STOCK-05, STOCK-06, STOCK-07

**Success Criteria** (what must be TRUE):

1. Admin entra a `/articulos/existencias` y filtra por `ubicacion` (multi-select) y/o `sector` (multi-select); la URL refleja los filtros (deep-link) y el listado muestra solo existencias que matchean
2. Admin abre `/articulos/existencias/editor` (o similar) y ve una pivot table con filas=artículos, columnas=ubicaciones, celdas=cantidad editable inline; sticky headers, save explícito por celda con feedback visual
3. Admin entra a `/dashboard/stock-por-sector` y ve cards con KPIs por sector: total unidades, total SKUs distintos, low-stock count
4. Cada card del dashboard tiene drill-down: clickear "Ver existencias" filtra `/articulos/existencias` con `?sector=X` y muestra los detalles en la pivot table
5. La query backend `/api/existencias/by-sector` resuelve la agregación en una sola pasada (JOIN existencias × sector_ubicaciones × ubicaciones con `GROUP BY sector_id`) y retorna `[{sectorId, sectorNombre, totalUnidades, totalSkus, lowStockCount}]`

**Plans**: TBD
**UI hint**: yes
**Open Qs to close in `/gsd-discuss-phase 35`**: Q11 (alcance exacto del editor visual y dashboard — TS-26 y TS-27 P1 vs P2)
**Pitfalls**: P-15 (N+1 en pivot → server-side grouping con `jsonb_agg`)

---

### Phase 36: Migración Histórica de Existencias

**Goal**: La migración pendiente desde abril 2026 queda ejecutada: para cada artículo con `unidades > 0`, se crea/actualiza la existencia con `ubicacion` resuelta vía mapping de `sanchez.articulos.columna` (slugify match) o sentinel cuando no hay match; se produce reporte post-migración con counts validables.

**Depends on**: Phase 34 (tabla `ubicaciones` existe con datos seeded)

**Requirements**: MIG-01, MIG-02, MIG-03

**Success Criteria** (what must be TRUE):

1. El script de migración corre y procesa ~7,500 filas estimadas: por cada `articulo` activo con `unidades > 0`, INSERT/UPDATE en `existencias` con `cantidad=unidades` y `ubicacion_id` resuelto vía slugify match contra `sanchez.articulos.columna`; sin match → sentinel `ubicacion_id=NULL` (NO `'0'`, ver P-09)
2. El script produce reporte post-ejecución con counts validables: `match_real`, `sentinel_count`, `total_processed`, comparación contra `articulos.unidades`; el ratio `SUM(existencias.cantidad) / SUM(articulos.unidades WHERE activo=true)` está en rango 1.0 ± 5%
3. Re-ejecutar el script no duplica filas ni rompe el estado: la operación es idempotente vía UPSERT con `ON CONFLICT (articulo_sku, deposito_id) DO UPDATE` y el script detecta filas ya migradas (con `ubicacion_id NOT NULL` o `migrated_at` flag)
4. El reporte se guarda en `.planning/phases/<N>/MIGRATION-REPORT.md` con timestamp, counts, y queries de validación (incluyendo lista de SKUs que cayeron en sentinel) para review humano post-ejecución

**Plans**: TBD
**Open Qs to close in `/gsd-discuss-phase 36`**: Q8 (sentinel definitivo: NULL vs `'SIN_UBICACION'` — confirmar; NO `'0'` por P-09); validar mapping slugify(`sanchez.articulos.columna`) contra dataset actual (research-phase recomendado por SUMMARY)
**Pitfalls**: P-09 (sentinel ambiguity → usar NULL o string clearly-non-real, agregar CHECK constraint y view `vw_existencias_sin_ubicacion`)

---

### Phase 37: Tech Debt v1.3 (numeric monetario + drift TS↔DB + placeholder header)

**Goal**: Se cierra el tech debt acumulado: campos monetarios pasan de `doublePrecision` a `numeric(10,2)` (deferred desde v1.0); el schema TypeScript queda alineado con la realidad de la DB en nombres de índices, precision numeric y timestamp consistency; se remueve el placeholder en `header.tsx`.

**Depends on**: Phase 31 — Idealmente combinar `doublePrecision→numeric` con la transacción de la cutover si toca filas masivamente; en la práctica entra al final del milestone para no contaminar el riesgo de la cutover.

**Requirements**: DEBT-01, DEBT-02, DEBT-03

**Success Criteria** (what must be TRUE):

1. Los campos monetarios (`precio`, `costo`, `erp_precio`, `erp_costo`, `precio_lista` y otros identificados) en `articulos` y comprobantes pasan de `doublePrecision` a `numeric(10,2)` con migración hand-authored; tests unitarios de aritmética monetaria (`precio * cantidad`, sumas de subtotales) pasan post-migración
2. El schema TypeScript en `apps/backend/src/db/schema.ts` queda alineado con la DB en: (a) nombres de índices coinciden 1:1 (ej: `idx_articulos_marca` en TS y DB), (b) `numeric(10,2)` declarado explícitamente en TS, (c) `timestamp(6)` consistency entre TS y DB
3. `pnpm db:generate --check` corre limpio post-cleanup: no detecta diffs entre `schema.ts` y la DB (CI puede agregar este check como pre-deploy guard)
4. El comentario placeholder en `apps/web/src/components/header.tsx:20` queda removido; tests de smoke de la header siguen pasando

**Plans**: TBD
**Open Qs to close in `/gsd-discuss-phase 37`**: Q9 (drift TS↔DB final cleanup), Q10 (qué tech debt entra — `numeric SÍ`, `header placeholder SÍ`, HOOK-03/06 docs evaluables, POST `/api/existencias` huérfano evaluable)
**Pitfalls**: P-14 (TS↔DB drift post-manual SQL → schema parity check + `db:generate --check` en CI), P-20 (numeric retorna string en Drizzle → audit `grep -rE '(precio|costo|subtotal|total)\s*[\*\+\-]'` y choose: parse explícito vs custom Drizzle type vs revertir a doublePrecision)

---

## Phase Dependency Graph (v1.3)

```
29 Catálogos ─────────┐
                      ├──> 31 PK Swap ──> 32 Variantes UI ──> 33 Cascade Engine
30 Templates ─────────┘                       │
                                              │
31 PK Swap ──> 34 Stock Schema ──> 35 Stock UI
                       │
                       └──> 36 Migración Histórica

37 Tech Debt — independiente, ideal después de 31 (combina con cutover si scope permite)
```

**Critical path**: 29 → 30 → 31 → 32 → 33
**Paralelizable**: 34 puede arrancar en paralelo a 32+33 una vez 31 esté firme; 35 depende solo de 34; 36 depende solo de 34; 37 puede entrar antes/después/paralelo

## Coverage Summary (v1.3)

**Total v1.3 requirements:** 37
**Mapped to phases:** 37 (100%)
**Orphans:** 0 | **Duplicates:** 0

| Category                      | Count  | Phase |
| ----------------------------- | ------ | ----- |
| CAT (Catálogos)               | 4      | 29    |
| TPL (Templates)               | 5      | 30    |
| VAR (Variantes) — VAR-10      | 1      | 31    |
| VAR (Variantes) — VAR-01..09  | 9      | 32    |
| SKU (Regeneración Masiva)     | 5      | 33    |
| STOCK (Modelo) — STOCK-01..04 | 4      | 34    |
| STOCK (Modelo) — STOCK-05..07 | 3      | 35    |
| MIG (Migración Histórica)     | 3      | 36    |
| DEBT (Tech Debt)              | 3      | 37    |
| **Total**                     | **37** | —     |

## Notes (v1.3)

- **Phase numbering** continúa desde v1.2 (último phase fue 28). v1.3 abre con Phase 29.
- **Gray areas Q1–Q11** del `research/v1.3-design-notes.md` se cierran en `/gsd-discuss-phase N` por fase, una decisión a la vez (no batch). Cada fase indica qué Qs cierra.
- **Pitfalls** asignados por fase según `research/PITFALLS.md`. Cada fase debe revisarlos en `/gsd-discuss-phase` antes de planificar.
- **Research flags**: Phase 36 (Migración Histórica) tiene `research-phase recomendado` por SUMMARY — validar mapping slugify(`sanchez.articulos.columna`) contra dataset actual antes de planificar. El resto de fases pueden saltar a `/gsd-discuss-phase` directamente.
- **Differentiators (D-01..D-07)** del FEATURES.md no entran al ROADMAP base — se evalúan como patches v1.3.x post-launch o como ampliaciones de fase si scope lo permite.
- **Out of scope explícito v1.3** (ver REQUIREMENTS.md §Out of Scope): vehículos compatibles, variant matrix UI, multi-currency, JSONB atributos, pricing tiers relativos, sectores no transversales, image override por variante.

## Progress

| Phase                                               | Milestone | Plans Complete | Status                 | Completed                                |
| --------------------------------------------------- | --------- | -------------- | ---------------------- | ---------------------------------------- |
| 1. Foundation & Monorepo                            | v1.0      | 4/4            | Complete               | 2026-01-24                               |
| 2. Backend API with Mock Data                       | v1.0      | 5/5            | Complete               | 2026-03-01                               |
| 3. Web Application                                  | v1.0      | 8/8            | Complete               | 2026-01-26                               |
| 4. Mobile Application                               | v1.0      | 4/4            | Complete               | 2026-03-02                               |
| 5. Database Integration                             | v1.0      | 3/3            | Complete               | 2026-03-02                               |
| 6. Polish & Production                              | v1.0      | 4/4            | Complete               | 2026-03-02                               |
| 7. Fix Integration Bugs                             | v1.0      | 2/2            | Complete               | 2026-03-02                               |
| 8. Verify & Close Phases 3+4                        | v1.0      | 3/3            | Complete               | 2026-03-02                               |
| 9. Fix Mobile Purchase & Login Bugs                 | v1.0      | 2/2            | Complete               | 2026-03-02                               |
| 10. Code Quality & Type Safety Cleanup              | v1.0      | 4/4            | Complete               | 2026-03-03                               |
| 11. Fix Sales Detail View Crash                     | v1.0      | 1/1            | Complete               | 2026-03-03                               |
| 12. Fix Dashboard Links & Doc Sync                  | v1.0      | 1/1            | Complete               | 2026-03-03                               |
| 13. Tech Debt Cleanup                               | v1.0      | 1/1            | Complete               | 2026-03-03                               |
| 14. Schema + Articulos + Depositos                  | v1.1      | 5/5            | Complete               | 2026-03-05                               |
| 15. Existencias                                     | v1.1      | 3/3            | Complete               | 2026-03-05                               |
| 16. Downstream + Dashboard + Nav                    | v1.1      | 4/4            | Complete               | 2026-03-05                               |
| 17. Inventarios                                     | v1.1      | 5/5            | Complete               | 2026-03-06                               |
| 18. Fix Inventarios Article Count                   | v1.1      | 1/1            | Complete               | 2026-03-06                               |
| 19. Articulos CRUD Completo                         | v1.2      | 3/3            | Complete               | 2026-03-11                               |
| 20. Image Upload Backend                            | v1.2      | 1/1            | Complete               | 2026-03-12                               |
| 21. Image Upload Frontend + Detalle                 | v1.2      | 2/2            | Complete               | 2026-03-12                               |
| 22. Vista Lista Configurable                        | v1.2      | 2/2            | Complete               | 2026-03-12                               |
| 23. API Keys                                        | v1.2      | 2/2            | Complete               | 2026-03-12                               |
| 24. Webhooks                                        | v1.2      | 4/4            | Complete               | 2026-03-12                               |
| 25. Wire Frontend Soft-Delete + Verify              | v1.2      | 1/1            | Complete               | 2026-03-12                               |
| 26. Tech Debt Cleanup v1.2                          | v1.2      | 1/1            | Complete               | 2026-03-12                               |
| 27. Add objeto to ArticuloForm                      | v1.2      | 1/1            | Complete               | 2026-03-13                               |
| 28. Add objeto to ArticuloSheet                     | v1.2      | 1/1            | Complete               | 2026-03-13                               |
| 29. Catálogos de Atributos                          | v1.3      | 6/6            | Complete               | 2026-04-30                               |
| 30. Templates + Composición SKU/Nombre              | v1.3      | 4/4            | Complete               | 2026-05-17                               |
| 31. PK Swap codigo→sku + FK rename comprobantes     | v1.3      | 0/0            | Not started            | -                                        |
| 32. Variantes UI                                    | v1.3      | 0/0            | Not started            | -                                        |
| 33. Cascade Engine + Audit History                  | v1.3      | 0/0            | Not started            | -                                        |
| 34. Stock Schema (ubicaciones + sectores)           | v1.3      | 0/0            | Not started            | -                                        |
| 35. Stock UI (filtros + edición visual + dashboard) | v1.3      | 0/0            | Not started            | -                                        |
| 36. Migración Histórica de Existencias              | v1.3      | 0/0            | Not started            | -                                        |
| 37. Tech Debt v1.3                                  | v1.3      | 0/0            | Not started            | -                                        |
| 38. Reconciliar drift sistemico DB prod             | v1.3      | 1/6            | **ABORTED** 2026-05-15 | scope superado por 260502-tqf + e5358502 |

### Phase 38: Reconciliar drift sistemico de DB de produccion — ABORTADA (2026-05-15)

> **Estado:** ABORTED. Ver `.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/38-ABORTED.md` para detalle. El scope original quedó superado por las acciones reactivas al data wipe del 2026-05-01: quick task `260502-tqf` (restore selectivo), commit `e5358502` (migration 0006 categoria/subcategoria), y la sincronización del journal 0003 del 2026-05-15. Sólo se ejecutó Plan 38-01 (pre-flight backup, commit `e9557311`); Plans 38-02..38-06 NUNCA se ejecutaron y no se ejecutarán.

**Goal original:** Eliminar el drift entre `__drizzle_migrations` y el estado real del schema en la DB de producción del VPS. La tabla de migraciones registra hashes (0000-0002, 0004-0005) pero múltiples tablas no existen físicamente: `business_settings` (definida en 0002), `inv_articulos` (alterada en 0003), `prop_*` (creadas manualmente vía psql el 2026-05-01 durante smoke de phase 29). Probable causa: drift acumulado desde la migración Prisma→Drizzle (convive `_prisma_migrations` legacy). Cualquier `db:push` o `db:migrate` futuro skipea silenciosamente porque drizzle confía en los hashes registrados. **Prerequisito para futuras migraciones de DB.**

**Requirements**: TBD (no mapeado a v1.3 — phase reactiva post-detección, no parte del milestone original)

**Depends on:** Ninguna estricta. Phase 37 (tech debt v1.3) toca columnas/tipos pero no schema lifecycle. **Recomendación:** ejecutar Phase 38 ANTES de 37 para no aplicar tech debt sobre un DB inconsistente.

**Plans:** 6 plans (en 5 waves)

Plans:

- [ ] 38-01-PLAN.md — Pre-flight backup + restore-test (D-05) — autonomous: false (Wave 1)
- [ ] 38-02-PLAN.md — Local journal repair + 0006_baseline generation stamped-only (D-02) — autonomous: false (Wave 2)
- [ ] 38-03-PLAN.md — Prod audit + INSERT idempotente en drizzle.\_\_drizzle_migrations (D-03) — autonomous: false (Wave 3)
- [ ] 38-04-PLAN.md — Triple verification + drift residual report + non-destructive schema.ts patch (D-04, D-08) — autonomous: false (Wave 4)
- [ ] 38-05-PLAN.md — Healthcheck NestJS endpoint /api/health/db + docker-compose healthcheck (D-10) — autonomous: false (Wave 5)
- [ ] 38-06-PLAN.md — CI workflow drizzle drift check + ADR + CLAUDE.md (D-09, D-11) — autonomous: true (Wave 5)

**Plan tentativo (a refinar en plan-phase):**

1. **Pre-flight**: `pg_dump erp_sanchez` + verificar restore en DB temporal. Sin esto no se avanza.
2. **Diagnóstico**: comparar `\dt` real vs schema esperado (`apps/backend/src/db/schema.ts` + `meta/_journal.json`). Output: tabla `tabla_esperada | estado | acción`.
3. **Decisión** (consensuada con humano):
   - Catch-up incremental (aplicar SQL de cada migration faltante vía psql, preserva data)
   - Reset full (dump → drop schema → replay → restore data, más limpio si drift es grande)
4. **Aplicación + verificación**: ejecutar opción elegida, `\dt` debe matchear journal.
5. **Smoke playwright multi-módulo**: /articulos /orders /sales /purchases /propiedades /dispositivos /webhooks /api-keys /inventarios /settings — reporte verde/rojo por módulo.

**Detectado por:** smoke playwright `/propiedades` → 500 Internal server error (2026-05-01)
**Todo asociado:** [auditar-desfase-sistemico-db-de-produccion](../todos/pending/2026-05-01-auditar-desfase-sistemico-db-de-produccion.md)
**Antecedente:** quick task `260409-jwl Sync Drizzle schema with production DB` (2026-04-09) — resolución parcial; el drift volvió.

---

_Roadmap created: 2026-01-23_
_Last updated: 2026-04-29 — v1.3 milestone roadmap added (9 phases 29→37, 37 reqs mapped 100%)_
