# ARQUITECTURA — Integración v1.3 (Variantes + Stock Redesign)

**Proyecto:** Objetiva Comercios Admin
**Milestone:** v1.3 — Variantes y Modelo de Stock
**Researched:** 2026-04-29
**Confidence:** HIGH (verificado contra schema actual, services, controllers y rutas web)

## Resumen ejecutivo

La integración de variantes + rediseño de stock es una operación **de columna vertebral**: la promoción de `sku` como PK de `articulos` afecta 5 tablas hijas (orders/sale/purchase items, existencias, inventarios_articulos), 6 servicios NestJS, 6 grupos de rutas web y los DTOs/types compartidos. El rediseño de stock (`columna→ubicacion` + sectores transversales) es **independiente y aislado**: no toca `articulos` ni comprobantes, solo `existencias`, `inventarios_articulos` e `inventario_sectores`.

La arquitectura admite la integración con **bajo riesgo conceptual** — el monorepo ya separa concerns (auth/data, web/mobile/backend), Drizzle migrations + db:push permiten cambios incrementales con seed regenerable, RLS no aplica (Supabase es solo auth), y los patterns de UI ya consolidados (Sheet, ServerDataTable, react-hook-form + zod, TanStack Query) cubren los nuevos requerimientos sin necesidad de inventar primitivas.

El **mayor punto de fricción técnica** es la transacción atómica de cambios de schema de template: actualizar `articulos.sku` + cascade FK en 5 tablas hijo + escribir `articulo_sku_history` debe ser un solo `BEGIN/COMMIT` con preview previo. Esto requiere un servicio dedicado (`SkuRegenerationService`) con savepoint discipline y un endpoint con dry-run.

El **mayor punto de fricción conceptual** es preservar consistencia entre filas hermanas (mismo `codigo`, distintos `sku`) sin DB constraints: queda como app-level (UI con dos formularios, "Datos del modelo" vs "Datos de la variante"). El `ArticuloSheet` actual debe renombrarse a vista detalle de **variante**, y se necesita una vista nueva agrupada por `codigo`.

## Diagrama de capas

```
DB (PostgreSQL)
─────────────────────────────────────────────────
Catálogos atributos          Templates                  Articulos (single-table)
atributo_marcas              articulos_templates        sku PK
atributo_colores             template_atributos         codigo (idx)
atributo_talles                                         marca_id FK
…                                                       color_id FK
                                                        sku_anterior

articulo_sku_history (append-only)

Stock
─────
ubicaciones (renombre de "columnas físicas")
sectores_transversales
sector_ubicaciones (pivot N:M)
existencias (sku FK + ubicacion FK)
inventarios_articulos (sku FK + ubicacion FK)
                       ▲ Drizzle ORM
Backend (NestJS) — apps/backend
─────────────────────────────────────────────────
NUEVOS:
  CatalogosModule      — CRUD atributos
  TemplatesModule      — receta SKU/nombre
  SkuRegenerationModule — preview + cascade transaccional
  UbicacionesModule    — CRUD ubicaciones + sectores

MODIFICADOS:
  ArticulosModule (sku PK, *_id FK, nombre_auto)
  ExistenciasModule (sku FK, ubicacion_id, find by sector)
  InventariosModule (sku FK, ubicacion_id en items)
  Orders/Sales/Purchases (FK rename: articuloCodigo → articuloSku)
  Webhooks (events articulo.* siguen funcionando con sku PK)
                       ▲ REST + JWT/API Key (CompositeAuthGuard)
Web (Next.js) — apps/web
─────────────────────────────────────────────────
RUTAS NUEVAS:
  /catalogos                              ABM atributos
  /catalogos/ubicaciones                  ABM físicas
  /catalogos/sectores                     ABM transversales
  /templates                              ABM templates + builder
  /articulos/[codigo]/variantes           lista hermanas
  /articulos/[codigo]/variantes/nueva     crear variante
  /dashboard/stock-por-sector             cards por sector

RUTAS MODIFICADAS:
  /articulos                              agrupa por codigo, count variantes
  /articulos/sku/[sku]/editar             "datos de la variante"
  /articulos/[codigo]/editar              "datos del modelo"
  /articulos/existencias                  filtro sector + ubicacion
  /articulos/inventarios/[id]             ubicacion (no columna)

COMPONENTES NUEVOS:
  CatalogoForm + CatalogoTable, AtributoSelectField, SectorBoard,
  UbicacionEditor, TemplateBuilder, SkuPreview, SkuRegenerationDialog,
  VariantesGroupedList, VarianteForm, ModeloForm, sector-filter,
  ubicacion-filter
                       ▲ Capacitor WebView, mismo cliente API
Mobile (Vite + Capacitor) — apps/mobile
─────────────────────────────────────────────────
Lectura agrupada por codigo. Edición pesada queda solo en web.
```

## Boundaries de componentes

### Backend — módulos nuevos

| Módulo | Responsabilidad | Comunica con | Path destino |
|---|---|---|---|
| `CatalogosModule` | CRUD de atributos: marcas, colores, talles, materiales, presentaciones, objetos, calificadores. Cada catálogo es una tabla `atributo_<nombre>` con `(id, nombre, slug, activo)` | DrizzleService | `apps/backend/src/modules/catalogos/` |
| `TemplatesModule` | CRUD de `articulos_templates` y `template_atributos`. Expone `composeSku(template, articuloRow)` y `composeNombre(template, articuloRow)` | DrizzleService, CatalogosModule | `apps/backend/src/modules/templates/` |
| `SkuRegenerationModule` | Preview (dry-run) + execute cascade transaccional. Endpoint `POST /api/sku/regenerate?templateId=X&dryRun=true|false`. Escribe `articulo_sku_history` | DrizzleService, TemplatesModule | `apps/backend/src/modules/sku-regeneration/` |
| `UbicacionesModule` | CRUD ubicaciones físicas (renombre de `columnas`), CRUD sectores transversales, gestión pivot `sector_ubicaciones` | DrizzleService | `apps/backend/src/modules/ubicaciones/` |

### Backend — módulos a modificar

| Módulo | Cambios | Path |
|---|---|---|
| `ArticulosModule` | (1) `findOne(codigo)` → `findOne(sku)`, agregan `findByCodigo(codigo): Articulo[]` para grupos. (2) `create` valida que `sku` se compone vía template si `nombre_auto=true`. (3) Update tiene 2 modos: `updateModel(codigo, dto)` y `updateVariant(sku, dto)`. (4) Search reemplaza `ilike` sobre text-libre por `JOIN` con catálogos | `apps/backend/src/modules/articulos/` |
| `ExistenciasModule` | FK `articuloCodigo` → `articuloSku`. Reemplazar `columna` por `ubicacionId` FK. Endpoints nuevos: `findBySector(sectorId)`, `findByUbicacion(ubicacionId)` | `apps/backend/src/modules/existencias/` |
| `InventariosModule` | FK `articuloCodigo` → `articuloSku` en `inventarios_articulos`. Renombre `columna` → `ubicacionId` FK. `inventario_sectores` se desacopla (deprecación a evaluar en Q11) | `apps/backend/src/modules/inventarios/` |
| `Orders/Sales/Purchases` | En `*_items` la columna `articulo_codigo` se renombra `articulo_sku` y la FK apunta a `articulos.sku`. `articuloNombre` snapshot sigue tal cual | `apps/backend/src/modules/{orders,sales,purchases}/` |
| `WebhooksModule` | Sin cambios estructurales. Eventos `articulo.created/updated/deleted` siguen disparando — payload incluirá `sku` como id principal y `codigo` como agrupador | `apps/backend/src/modules/webhooks/` |

### Web — rutas nuevas y componentes nuevos

| Ruta / Componente | Propósito |
|---|---|
| `/catalogos` | ABM unificado: marcas, colores, talles, materiales, presentaciones, objetos, calificadores |
| `/catalogos/ubicaciones` | ABM ubicaciones físicas |
| `/catalogos/sectores` | ABM sectores transversales + asignación pivot |
| `/templates` | ABM templates + builder |
| `/articulos/[codigo]/variantes` | Lista hermanas |
| `/articulos/[codigo]/variantes/nueva` | Crear variante |
| `/articulos/sku/[sku]/editar` | Edición datos de la variante |
| `/dashboard/stock-por-sector` | Cards por sector |
| `CatalogoTable<T>` genérico | Para los 7+ catálogos |
| `AtributoSelectField` | FK select con búsqueda + create-on-the-fly |
| `TemplateBuilder` | Drag-drop atributos a slots SKU/nombre |
| `SkuPreviewDialog` | Tabla diff + confirm antes del cascade |
| `VariantesGroupedList` | Tabla agrupada por codigo con expand row |
| `VarianteForm` / `ModeloForm` | Particionamiento del actual `ArticuloForm` |
| `SectorBoard` | Cards/dashboard por sector |
| `UbicacionEditor` | Edición visual de existencias |

### Web — componentes a modificar

| Componente | Cambio |
|---|---|
| `articulo-form.tsx` | Particionar en `ModeloForm` + `VarianteForm`; reemplazar text inputs por `AtributoSelectField`; quitar/migrar `propAux1..5` |
| `articulo-sheet.tsx` | Mostrar `codigo` (agrupador) + `sku` (id) + lista compacta de hermanos |
| `articulos-columns.tsx` | Columna SKU prominente, codigo secundario, columnas FK (marca.nombre vía join) |
| `existencias-*.tsx` | Nueva columna `ubicacion`, FK lookup; key del row pasa a sku |
| `inventarios/conteo-table.tsx` | Buscar por SKU; columna ubicacion FK |
| `sidebar.tsx` | Nueva sección "Catálogos" con sub-items (Atributos, Ubicaciones, Sectores, Templates) |
| `api.client.ts` | Endpoints nuevos: `fetchCatalogos`, `fetchTemplates`, `regenerateSkus`, `fetchUbicaciones`, `fetchSectores` |
| `types/articulo.ts` | Add `sku`, `marcaId`, `colorId`, `talleId`, etc.; deprecar `propAux*` |
| `types/existencia.ts`, `types/inventario.ts` | `articuloCodigo` → `articuloSku`, `columna` → `ubicacionId` |

### Mobile

| Archivo | Cambio |
|---|---|
| `pages/Articulos*.tsx` | Lectura agrupada por codigo. Edición delegada a web (read-only de variantes para v1.3 si scope tight) |
| `pages/Inventarios*.tsx` | Conteo asigna ubicacion FK; selector |
| `pages/Existencias*.tsx` | Lectura con ubicacion mostrada |
| `types/` | Mirror de cambios del web |

## Data flow para operaciones nuevas

### Crear variante

```
UI: /articulos/[codigo]/variantes/nueva
  → fetch /api/articulos?codigo=X (lee modelo del primer sibling)
  → react-hook-form (VarianteForm con AtributoSelectFields)
  → POST /api/articulos { codigo, marcaId, colorId, talleId, precio, nombre_auto }
  → ArticulosService.create(dto)
    - si nombre_auto: composeSku + composeNombre via TemplatesService
    - INSERT articulos
    - emit articulo.created
  → Webhook fire
  → TanStack Query invalidate ['articulos', codigo]
```

### Mass SKU regeneration

```
UI: /templates/[id]/edit  →  click "Aplicar cambios"
  → POST /api/sku/regenerate?templateId=X&dryRun=true
    - SELECT articulos WHERE templateId=X
    - compone nuevo sku/nombre por fila (sin escribir)
    - returns [{codigo, sku_viejo, sku_nuevo, nombre_viejo, nombre_nuevo}]
  → SkuPreviewDialog muestra tabla diff con count afectado
  → user confirma
  → POST /api/sku/regenerate?templateId=X&dryRun=false
    BEGIN TRANSACTION
      1. INSERT INTO articulo_sku_history (sku_viejo, sku_nuevo, ...)
      2. UPDATE articulos SET sku=nuevo, sku_anterior=sku_viejo
      3. UPDATE order_items SET articulo_sku=nuevo WHERE articulo_sku=viejo
      4. UPDATE sale_items / purchase_items / existencias / inventarios_articulos
    COMMIT
  → Toast "X SKUs regenerados"
```

### Edición de existencias por ubicación

```
UI: /catalogos/ubicaciones/[id] o /articulos/existencias?ubicacion=X
UbicacionEditor: grid filas=articulos, col=cantidad
  → click cell → InlineEditCell input
  → PATCH /api/existencias/{sku}/{depositoId} { cantidad, ubicacionId }
  → ExistenciasService.update
  → TanStack Query invalidate ['existencias', ubicacionId]
```

### Dashboard por sector

```
UI: /dashboard/stock-por-sector
  → GET /api/existencias/by-sector
  → ExistenciasService.findBySector()
    SQL: JOIN existencias × sector_ubicaciones × ubicaciones
         WHERE sector_id = X
         GROUP BY sku
  → returns aggregated [{sectorId, sectorNombre, totalUnidades, totalSkus}]
  → SectorBoard renderiza cards
```

## Patterns existentes a reusar

| Pattern existente | Path | Uso v1.3 |
|---|---|---|
| `Sheet` para vista detalle | `apps/web/src/components/articulos/articulo-sheet.tsx` | Vista detalle de variante; reusar para sectores y templates |
| `ServerDataTable` | `apps/web/src/components/tables/server-data-table.tsx` | Listas variantes, catálogos, ubicaciones, sectores |
| `react-hook-form + zod + shadcn Form` | `articulo-form.tsx` | TODOS los formularios nuevos |
| `InlineEditCell` | `existencias/inline-edit-cell.tsx` | UbicacionEditor |
| `AlertDialog` | `articulos-client.tsx` | SkuPreviewDialog |
| `RolesGuard + @Roles('admin')` | `common/guards/roles.guard.ts` | Mutations protegidas |
| `CompositeAuthGuard` | global | Endpoints nuevos heredan |
| `EventEmitter2` | `articulos.service.ts` | Eventos `articulo.created/updated/deleted` con sku como id; opcional: `template.changed`, `sku.regenerated` |
| `PaginatedResponseDto` | `common/dto/paginated-response.dto.ts` | Listas paginadas server-side |
| Drizzle migration files | `apps/backend/drizzle/` | Cada cambio destructivo es una migration |
| `useArticulosConfig` | `hooks/use-articulos-config.ts` | Patrón replicable para config de columnas visibles en catálogos |

## Migration order — schema (DB)

Orden estricto. Cada paso debe pasar `pnpm db:generate && pnpm db:migrate` sin error y dejar el sistema funcional.

### Fase A — Infraestructura de catálogos

1. **CREATE catálogos** — `atributo_marcas`, `atributo_colores`, `atributo_talles`, `atributo_materiales`, `atributo_presentaciones`, `atributo_objetos`, `atributo_calificadores` (todos `(id serial PK, nombre text, slug text unique, activo bool)`).
2. **CREATE templates** — `articulos_templates` (id, nombre unique, default_flag), `template_atributos` (template_id FK, tipo enum, orden_sku int null, orden_nombre int null, es_variante bool, es_obligatorio bool, catalogo_table text).
3. **SEED** — un template `default` con atributos del rubro. Seed catálogos con valores existentes hoy: `DISTINCT` de `articulos.marca, color, talle, material, presentacion, objeto, adjetivo`.
4. **Backfill FK** — agregar `marca_id`, `color_id`, `talle_id`, etc. NULLABLE; copiar via `UPDATE articulos a SET marca_id = (SELECT id FROM atributo_marcas WHERE slug=slugify(a.marca))`.
   - **Checkpoint:** validar que ≥99% de filas matchearon. Filas sin match → log y `marca_id=NULL` permitido.

### Fase B — SKU PK promotion

5. **Backfill `sku`** — `UPDATE articulos SET sku = codigo WHERE sku IS NULL`.
6. **Add `sku_anterior` column** (nullable text, sin FK).
7. **Drop FK constraints** en orders/sale/purchase items, existencias, inventarios_articulos.
8. **Drop PK** `articulos_pkey` sobre `codigo`.
9. **Add unique constraint** sobre `articulos.sku` y promote a PK.
10. **Add index** sobre `articulos.codigo` (no único — agrupador).
11. **Rename FK columns** en tablas hijas: `articulo_codigo` → `articulo_sku`.
    - **Checkpoint:** `SELECT count(*) FROM order_items WHERE articulo_sku NOT IN (SELECT sku FROM articulos)` debe ser 0.
12. **Re-add FK constraints** apuntando a `articulos.sku`.

### Fase C — Stock redesign

13. **CREATE `ubicaciones`** `(id serial PK, deposito_id FK, nombre text, codigo text)`.
14. **Seed ubicaciones** desde valores `DISTINCT columna` que existen en `inventarios_articulos` y datos históricos de `sanchez.articulos.columna`.
15. **Add `ubicacion_id` column** a `existencias` (nullable inicialmente).
16. **Rename `inventarios_articulos.columna` → `ubicacion_id`** + cambiar tipo a FK. Backfill mapeo número→id.
17. **CREATE `sectores_transversales`** `(id, nombre, deposito_id FK, descripcion)`.
18. **CREATE `sector_ubicaciones`** pivot `(sector_id FK, ubicacion_id FK, PK compuesta)`.
19. **Migrar `inventario_sectores`**: deprecar (la tabla actual tiene `columnas: jsonb`). Si hay data, migrar a filas pivot.

### Fase D — Migración histórica de existencias

20. **Ejecutar migración pendiente Q8**: por cada `articulos` con `unidades > 0` sin existencia, INSERT existencia con `cantidad=unidades`, `ubicacion_id` resuelto vía mapping de `sanchez.articulos.columna`. Sentinel `ubicacion_id=NULL` o ubicacion `0` para sin-match.
    - **Estimado:** ~7,500–7,800 con ubicación real, ~80–400 con sentinel.
    - **Checkpoint:** validar `SUM(existencias.cantidad)` ≈ `SUM(articulos.unidades WHERE activo=true)` con tolerancia ±5%.

### Fase E — `articulo_sku_history`

21. **CREATE `articulo_sku_history`** `(id serial PK, articulo_codigo text, sku_anterior text, sku_nuevo text, nombre_anterior text, nombre_nuevo text, template_id FK, user_email text, created_at timestamp)`.

### Fase F — Tech debt

22. **`numeric()` con precisión** en monetarios (orders, sales, purchases, existencias si aplica costo).
23. **TS↔DB drift** — alinear nombres de índices y `numeric(10,2)` en TS schema.
24. **Placeholder `header.tsx`** — quitar.

## Suggested build order — fases del milestone

| Fase | Nombre sugerido | Bloquea a | Notas |
|---|---|---|---|
| 1 | Catálogos de atributos (DB + Backend + UI ABM) | 2, 3, 4 | Self-contained. Genera `/catalogos` page + endpoints + tablas catálogo seed. No toca articulos todavía. |
| 2 | Templates + composición SKU/nombre | 4 | Crea tablas templates, TemplatesService, `/templates` page con builder. Composición SKU es función pura testeable. |
| 3 | SKU como PK + FK migration en tablas hijas | 4, 5, 6, 7 | Schema-heavy. Backfill `sku=codigo`, drop/recreate FKs, rename columnas. Fase de mayor riesgo. |
| 4 | Variantes UI + ArticuloForm split + AtributoSelectField | 6 (parcial) | Modifica `articulo-form.tsx`, agrega rutas `/variantes/*`, lista agrupada por codigo. |
| 5 | SKU regeneration (preview + cascade transaccional) | — | Feature crítica técnicamente. Tests obligatorios. |
| 6 | Stock redesign (ubicaciones + sectores transversales) | 7 | Renombre columna→ubicacion, schema sectores, UI por ubicacion/sector, dashboard. |
| 7 | Migración histórica de existencias | — | Solo si Fase 6 está completa (ubicaciones existen). |
| 8 | Tech debt cleanup | — | numeric(), drift, placeholder. Sin riesgo. |

**Dependencias clave:**

- Fase 3 bloquea Fase 4 (sin sku PK no hay variantes con id distinto).
- Fase 1+2 bloquean Fase 3 desde el lado de UX, pero schema-wise Fase 3 es ejecutable antes (sku=codigo es identidad inicial).
- Fase 5 requiere Fases 1–4 completas.
- Fase 6 puede empezarse en paralelo a Fase 4.
- Fase 7 depende solo de Fase 6.
- Fase 8 puede entrar antes/después/paralelo.

## Integration points (donde meet new ↔ existing)

| Punto | Existente | Nuevo | Cómo se conectan |
|---|---|---|---|
| `articulos-client.tsx` lista | `data` plana | Agrupar por `codigo`, mostrar count variantes | Reutilizar `ServerDataTable`; query con `groupBy(codigo)` |
| `ArticuloSheet` detalle | `articulo: Articulo \| null` | Articulo + siblings | Fetch siblings dentro del sheet, lista colapsable |
| `ArticuloForm` | Campos text libres | `AtributoSelectField` con FK | Reemplazo 1:1 en JSX, mantener `Controller` pattern |
| `existencias-por-articulo.tsx` | Filas indexadas por articuloCodigo | Indexadas por sku | Cambiar `articuloCodigo` → `sku`; opcional collapse rows por codigo |
| `inventarios/conteo-table.tsx` | columna integer | ubicacion FK | Cambiar payload, usar UbicacionSelect |
| `sidebar.tsx` | `Articulos`, `Existencias`, `Inventarios` | + sección "Catálogos" arriba | Edit JSX + iconos lucide |
| `api.client.ts` | Funciones existentes | Nuevos endpoints catalogos/templates/regenerate/ubicaciones/sectores | Mismo patrón fetch + AbortController |
| `webhooks` events | payload con `codigo` PK | Mismo evento, payload con `sku` como id | Bump version del payload schema |
| `dashboard` KPIs | KPIs basados en articulos | Sumar: total variantes, total catálogos, stock por sector | Append cards |
| Mobile pages | `articuloCodigo` en types | `articuloSku` en types | `packages/types` source of truth |

## Data integrity checkpoints

| Checkpoint | Query | Pasa si |
|---|---|---|
| Backfill catálogos completo | `SELECT count(*) FROM articulos WHERE marca IS NOT NULL AND marca_id IS NULL` | < 1% del total |
| sku≠NULL antes de PK promotion | `SELECT count(*) FROM articulos WHERE sku IS NULL` | = 0 |
| sku unique antes de PK | `SELECT sku, count(*) FROM articulos GROUP BY sku HAVING count(*) > 1` | 0 filas |
| FK rename consistente | `SELECT count(*) FROM order_items oi LEFT JOIN articulos a ON oi.articulo_sku=a.sku WHERE a.sku IS NULL` | = 0 |
| ubicacion backfill | `SELECT count(*) FROM existencias WHERE ubicacion_id IS NULL AND cantidad > 0` | 0 (sentinel debe estar asignado) |
| Migración histórica | `SELECT sum(cantidad) FROM existencias / sum(unidades) FROM articulos WHERE activo` | ratio ≈ 1.0 ± 5% |
| sku regeneration round-trip | post-cascade: `SELECT count(*) FROM order_items WHERE articulo_sku NOT IN (SELECT sku FROM articulos)` | = 0 |

## Riesgos arquitecturales y mitigación

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Cascade SKU regeneration parcial | Alta | Toda la operación dentro de un único `BEGIN/COMMIT` + savepoints; en error → ROLLBACK y restaurar `sku_anterior` |
| Inconsistencia entre filas hermanas | Media | App-level: `updateModel(codigo, dto)` UPDATE WHERE codigo=X. Lint test que UI nunca emita "datos del modelo" para sku-único |
| Performance de queries con joins de catálogos | Media | (a) Indexar marca_id, color_id, talle_id; (b) Considerar denormalizar marca_nombre vía trigger; (c) materialized view si dashboard se vuelve lento |
| Mobile vs Web desfase de types | Baja | `packages/types` shared types entre web/mobile/backend |
| Webhooks downstream rompiendo | Media | Documentar payload v2; mantener `codigo` y `sku` ambos en payload por compat |
| `propAux1..5` huérfanos | Baja | Q5 abierta — decisión: drop columns o renombrar a tipos concretos |
| Drizzle no soporta cambiar PK in-place | Media | Generar migration manual SQL (drop pkey + add pkey) — confirmar con `drizzle-kit generate` y editar SQL si es necesario |
| `inventario_sectores.columnas: jsonb` legacy | Baja | Quick task previa creó la tabla; deprecar limpiamente en Fase 6 con migration de data si hay |

## Sources

- `apps/backend/src/db/schema.ts` — schema actual (verificado en lectura completa)
- `apps/backend/src/modules/articulos/{service,controller}.ts` — patterns
- `apps/backend/src/modules/existencias/existencias.service.ts` — queries y joins
- `apps/web/src/components/articulos/{articulo-form,articulo-sheet}.tsx` — patterns RHF + Sheet
- `apps/web/src/components/existencias/existencias-por-articulo.tsx` — InlineEditCell
- `apps/web/src/lib/api.client.ts` — cliente API
- `.planning/research/v1.3-design-notes.md` — decisiones cerradas y gray areas
- `.planning/PROJECT.md` — contexto del milestone

**Confidence assessment**

| Área | Confianza | Razón |
|---|---|---|
| Schema migration order | HIGH | Verificado contra schema.ts y FKs explícitas |
| Backend module structure | HIGH | Verificado contra estructura de carpetas y services existentes |
| Web routes/components | HIGH | Verificado contra App Router + components dirs |
| Mobile adaptaciones | MEDIUM | Estructura de pages confirmada, scope depende de decisión |
| SKU regeneration tx semantics | HIGH | Drizzle soporta `db.transaction()`; pattern estándar |
| Stock redesign aislamiento | HIGH | No hay FK desde articulos hacia existencias |
| Drift TS↔DB | LOW | Sin verificar columna por columna contra DB live; design notes lo lista como gray area Q9 |
