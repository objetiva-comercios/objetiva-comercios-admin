# Phase 30: Templates + Composición SKU/Nombre - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Sistema de templates de articulos: define qué atributos aplican, cuáles van al SKU + orden, cuáles van al nombre auto + orden, y cuáles son ejes de variante. Phase 30 también CIERRA la taxonomía jerárquica de productos (`categoria → subcategoria → familia`, 3 niveles fijos) y MODELA las propiedades custom por template (3 slots) junto con la primera tabla custom (`prop_aplicacion`).

**Incluye:**

1. Schema: `articulos_templates` + `template_atributos` (receta de SKU y nombre por atributo, marcado variante/no-variante)
2. Schema: nueva tabla `prop_familia` (3er nivel jerárquico, FK a `prop_subcategoria`)
3. Schema: nueva tabla `prop_aplicacion` (primera tabla custom; usada por template default automotor)
4. Schema: `articulos.familia` + `articulos.custom_1` + `articulos.custom_2` + `articulos.custom_3` como TEXT cacheado
5. Schema cleanup: DROP `articulos.rubro` + `articulos.subrubro` + `articulos.adjetivo` + `articulos.prop_aux_1..5` (los 8 vacíos en 101.021 filas, 0 datos perdidos)
6. Backend: funciones puras `composeSku(codigo, atributos, template)` y `composeNombre(atributos, template)` con tests
7. Backend: endpoints CRUD para templates + template_atributos
8. Backend: endpoints CRUD para `prop_familia` y `prop_aplicacion` (reutiliza factory genérico de propiedades de Phase 29)
9. Seed: 1 template default registrado con receta de nombre `[objeto, marca, modelo, medida, custom_1=aplicacion]` y receta de SKU vacía (sku = stripSep(codigo))

**NO incluye (scope de otras phases):**

- Cableado al `ArticuloForm` con autocomplete a `prop_*` → Phase 32 (Variantes UI)
- Rediseño UX del panel `/propiedades` + simplificación de switches habilitado/visible en `/settings/articulos` → Phase 32 (absorbe rediseño UX)
- PK swap `codigo → sku` en `articulos` y FKs hijas → Phase 31
- TemplateBuilder UI con drag-drop visual → out of scope salvo planner decida incluir form simple para edición; el template default se inserta vía seed
- Seed de los catálogos de propiedades (`prop_marca`, `prop_color`, `prop_aplicacion`, etc.) → admin pobla vía `/propiedades` cuando crea artículos
- `prop_modelo`, `prop_medida` como tablas catálogo → Phase 29 D-09 las difiere; siguen TEXT libre

</domain>

<decisions>
## Implementation Decisions

### Modelo de propiedades del artículo (Q4 cerrado, parcial)

- **D-01: Las 6 propiedades fijas con catálogo se mantienen exactamente como en Phase 29:** `marca`, `color`, `talle`, `material`, `presentacion`, `objeto`. `objeto` está DENTRO del set fijo (no separado) — su rol en armar el nombre dinámico es funcionalidad del composer, no justifica entidad aparte.
- **D-02: `modelo` y `medida` continúan como TEXT libre en `articulos` (sin tabla catálogo).** Confirma Phase 29 D-09: diferidas hasta que un rubro lo requiera.
- **D-03: Eliminación definitiva de campos legacy.** DROP COLUMN `articulos.rubro`, `articulos.subrubro`, `articulos.adjetivo` y `articulos.prop_aux_1..5`. Verificado: 0 filas con valor no-null entre los 101.021 artículos en prod. Sin migración de datos, sin riesgo. Schema queda limpio desde día 1 del nuevo modelo. Reemplaza Phase 31 D-10 y Phase 37 tech-debt para estos campos.
- **D-04: `calificador` NO entra al modelo.** El milestone Q4 lo planteaba como renombre de `adjetivo`. Decisión: `adjetivo` se elimina sin reemplazo. Si en el futuro se necesita un descriptor libre, se usa uno de los `custom_*` o se agrega como columna nueva.

### Taxonomía jerárquica (Q6 cerrado)

- **D-05: Jerarquía de 3 niveles fijos: `categoria → subcategoria → familia`.** Todos los rubros usan los 3 niveles; valores vacíos admitidos (un artículo puede tener solo categoria, o categoria+subcategoria sin familia). FK chain: `prop_subcategoria.categoria_id REFERENCES prop_categoria(id) ON DELETE RESTRICT`; `prop_familia.subcategoria_id REFERENCES prop_subcategoria(id) ON DELETE RESTRICT`. Las primeras dos tablas ya existen (creadas en commit `e5358502` del 2026-05-15); Phase 30 agrega `prop_familia`.
- **D-06: Naming del 3er nivel = `familia`.** Suena natural en es-MX para autopartes ("Mecánica → Suspensión → Amortiguadores delanteros") y es la convención más usada en retail. Renombrar a `linea` o `tipo` se descartó: `tipo` choca con `objeto` (que también es "tipo de producto"); `linea` es más comercial-marketing que técnico.
- **D-07: Columnas en `articulos` para taxonomía cacheada:** `articulos.categoria` + `articulos.subcategoria` + `articulos.familia` (TEXT, nullable). Sin FK estructural desde `articulos` (consistente con Phase 29 D-02 sobre las 6 fijas). Cache vía trigger queda preparado pero NO conectado a `articulos` todavía (igual que las 6 fijas). Conexión FK + trigger activado se difiere a Phase 31 cuando ocurra el PK swap.
- **D-08: UNIQUE compuesto (categoria_id, lower(nombre)) en `prop_subcategoria` y (subcategoria_id, lower(nombre)) en `prop_familia`.** Permite reuso de nombres entre ramas distintas ("Amortiguadores" puede existir bajo "Suspensión" y bajo "Dirección" sin colisión). Patrón Phase 29 D-05 extendido a jerarquía. CHECK `abrev ~ '^[A-Z0-9]{1,8}$'` y UNIQUE `(parent_id, abrev)` para `abrev` también compuesto.

### Propiedades custom por template (Q5 cerrado, parcial)

- **D-09: 3 slots fijos en `articulos` para propiedades custom del rubro:** `custom_1`, `custom_2`, `custom_3` (TEXT, nullable, cacheado). Cada template DEFINE qué tabla catálogo mapea cada slot. Esto reemplaza conceptualmente a `prop_aux_1..5` (que se dropean en D-03) con semántica clara: cada slot tiene tabla mapeada por template, no es un slot "anónimo".
- **D-10: Mapping slot → tabla es POR TEMPLATE, no global.** El template "automotor" mapea `custom_1 → prop_aplicacion`; un template futuro "indumentaria" podría mapear `custom_1 → prop_temporada`. Trade-off: NO hay FK estructural desde `articulos.custom_*` a las tablas catálogo (porque la tabla depende del template). La validación de que `custom_N` contiene un valor válido del catálogo mapeado se hace a nivel app (al guardar el articulo, el backend lookup en la tabla correspondiente según `articulo.template_id`). Esta es la misma postura que Phase 29 D-02 sobre las 6 fijas (cache TEXT + trigger sin FK fuente hasta Phase 31).
- **D-11: Set inicial de tablas custom v1 = solo `prop_aplicacion`.** Caso inicial de uso es automotor. Las 3 columnas `custom_1/2/3` quedan reservadas en `articulos`, pero solo `custom_1` tiene tabla mapeada en el template default. `custom_2` y `custom_3` quedan disponibles sin tabla — un template futuro puede mapearlas (ej `prop_lado`, `prop_anio`) creando esa tabla vía migration en una phase posterior. Anti-prematuro, alineado con Phase 29 D-09.
- **D-12: `prop_aplicacion` sigue el mismo factory que las 6 fijas de Phase 29.** Schema mínimo: `(id SERIAL PK, nombre TEXT NOT NULL, abrev TEXT NOT NULL, activo BOOLEAN DEFAULT true, created_at, updated_at)` + UNIQUE `lower(nombre)` + UNIQUE `abrev` + CHECK `abrev ~ '^[A-Z0-9]{1,8}$'` + index `activo`. Reutiliza `definePropTable` factory de `apps/backend/src/db/schema.ts`. Backend CRUD genérico de `propiedades.controller.ts` agrega `aplicacion` a `PROP_TIPOS` (ahora 7 tipos).

### Templates + composer (TPL-01..05)

- **D-13: 1 template `default` registrado en seed de Phase 30** con configuración hardcoded para el caso autopartes. Schema de `articulos_templates`: `(id SERIAL PK, nombre TEXT UNIQUE NOT NULL, descripcion TEXT, activo BOOLEAN DEFAULT true, timestamps)`. Schema de `template_atributos`: `(template_id FK, atributo_tipo TEXT, orden_nombre INT NULL, orden_sku INT NULL, es_variante BOOLEAN DEFAULT false, custom_slot SMALLINT NULL, PRIMARY KEY (template_id, atributo_tipo))`. Phase 30 NO entrega TemplateBuilder UI; el template default se inserta directo en migration. Edición visual se difiere a phase futura si se confirma la necesidad.
- **D-14: Receta del NOMBRE auto del template default:** `[objeto, marca, modelo, medida, custom_1]` en ese orden, separados por espacio. Ej: artículo con `objeto='Amortiguador'`, `marca='Sachs'`, `modelo='C24-A'`, `medida='345mm'`, `custom_1='Fiat Cronos 1.3'` → nombre auto = `'Amortiguador Sachs C24-A 345mm Fiat Cronos 1.3'`. Atributos vacíos se omiten (no dejan doble espacio). **`categoria`, `subcategoria` y `familia` NO entran al nombre** — son taxonomía de navegación/búsqueda, no descriptor del producto. Tampoco `color`, `talle`, `material`, `presentacion` por defecto (rara vez aplican a autopartes; el admin puede agregarlos por template si su rubro los necesita).
- **D-15: Receta del SKU del template default = `[]` (vacío). SKU del template default = `stripSep(codigo)`.** Para autopartes 99% de los casos no usan variantes; cada repuesto tiene su código único. El template default NO marca atributos como variante. Resultado: `sku = stripSep(codigo)`. Ej: codigo `'AMOR-001'` → sku `'AMOR001'`. La mecánica de variantes EXISTE en el schema (Phase 29 D-13) y un template futuro puede activarla, pero el default no lo hace hasta que aparezca el rubro que lo necesite (ej indumentaria con talle/color como variantes).
- **D-16: `composeSku(codigo, atributos, template)` función pura testeada.** Algoritmo: `stripSep(codigo) + (template.atributos_variante.length > 0 ? '-' + template.atributos_variante.map(a => abrevOf(atributos[a])).join('-') : '')`. Para template default: shortcut → return `stripSep(codigo)` (template sin variantes). Para propiedades text-libre marcadas como variante (futuro): se aplica `slugify(valor)` siguiendo Phase 29 D-08.
- **D-17: `composeNombre(atributos, template)` función pura testeada.** Algoritmo: `template.atributos_nombre.map(a => atributos[a]).filter(Boolean).join(' ')`. Sin slugificación (es texto humano). Atributos vacíos se filtran (no dejan dobles espacios). Sin separador entre clasificador y descriptor; admin puede agregar separador a futuro si lo necesita.
- **D-18: Flag `nombre_auto` por artículo** (declarado en design notes #18 del milestone). NO se agrega en Phase 30 al schema de `articulos` — es Phase 32 (Variantes UI) la que cablea el toggle y la regeneración al editar. Phase 30 deja `composeNombre()` como función pura lista para que Phase 32 la consuma.

### Claude's Discretion

- **Naming exacto de las tablas y columnas** dentro de las decisiones (ej `custom_1` vs `custom_slot_1`, etc.) — convención repo manda. Los nombres mostrados arriba son guía, no contrato.
- **Forma exacta de la migration drop** (orden de DROPs, transacción única o múltiple, naming del archivo `.sql`) — planner/executor deciden siguiendo el patrón del repo.
- **Si el template default se inserta como SQL seed inline en la migration o como script `seed-templates.ts`** — planner decide según el patrón del repo.
- **Estructura interna del backend para el composer** (carpeta `templates/`, `composer/`, funciones en utils) — planner decide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 30 scope y requirements

- `.planning/ROADMAP.md` §"Phase 30: Templates + Composición SKU/Nombre" (líneas 108-127) — goal, success criteria 1-5, open Qs cerradas en este CONTEXT.
- `.planning/REQUIREMENTS.md` §TPL — TPL-01 a TPL-05 (requirements activos del milestone v1.3 mapeados a Phase 30).
- `.planning/PROJECT.md` §"Current Milestone: v1.3" — overview del milestone + Key Decisions.

### Decisiones cerradas previas que aplican

- `.planning/phases/29-catalogos-de-atributos/29-CONTEXT.md` — D-01 a D-19, especialmente:
  - D-01 (1 tabla por propiedad, no polimorfismo)
  - D-02 (FK por id INT + cache vía trigger)
  - D-03 (schema mínimo de las tablas prop_*: id, nombre, abrev, activo, timestamps)
  - D-05/D-06 (UNIQUE lower(nombre) + CHECK abrev ~ '^[A-Z0-9]{1,8}$')
  - D-08 (composer distingue propiedades con catálogo vs text-libre)
  - D-09 (`prop_modelo`, `prop_medida` diferidas — sigue vigente para Phase 30)
  - D-11/D-12/D-13/D-14 (separator '-', stripSep(codigo), sku composition)
  - D-19 (`PropiedadCreateDialog` reusable, cableado en Phase 32)
- `.planning/research/v1.3-design-notes.md` §"Decisiones cerradas" (#1 a #23) — modelo single-table flat, atributos columnas estructuradas (no JSONB), templates en DB desde día 1, flag `nombre_auto`, preview+cascade+history del SKU schema change.
- `.planning/research/v1.3-design-notes.md` §"Q4" y §"Q6" — gray areas que este CONTEXT cierra.

### Estado actual de la DB (post-operativo 2026-05-15)

- `apps/backend/drizzle/0006_categorias_subcategorias.sql` — crea `prop_categoria` y `prop_subcategoria` con FK jerárquica. Phase 30 extiende con `prop_familia`.
- `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql` — patrón de migration DROP COLUMN aplicada exitosamente; Phase 30 lo repite para las 8 columnas legacy (rubro, subrubro, adjetivo, prop_aux_1..5).
- `apps/backend/src/db/schema.ts` (línea ~518) — factory `definePropTable` reusable. Phase 30 lo aplica a `prop_familia` (con FK extra) y `prop_aplicacion` (factory estándar).

### Quick task que evidencia el patrón de cleanup legacy

- `.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md` §Addendum 2026-05-15 — documenta el drift residual conocido y las acciones del operativo nocturno (migration 0006, drop sector_id, journal sync). Phase 30 continúa la limpieza con drop de rubro/subrubro/adjetivo/prop_aux_*.

### Reporte de auditoría del estado actual

- `.planning/2026-05-15-REPORTE-HECHO-VS-FALTANTE.md` — estado completo del codebase + admin al 2026-05-15, métricas, recomendaciones priorizadas (Phase 30 es la "estratégica #6").

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`apps/backend/src/db/schema.ts` `definePropTable(tableName, indexPrefix)`** (línea ~518): factory para tablas catálogo (id, nombre, abrev, activo, timestamps + indices + check abrev). Aplicar tal cual para `prop_aplicacion`. Para `prop_familia` extender con `subcategoria_id` integer NOT NULL REFERENCES `prop_subcategoria(id)` ON DELETE RESTRICT y UNIQUE compuesto.
- **`apps/backend/src/modules/propiedades/`** (controller + service + DTO): parametrizado por `PropTipo`. Phase 30 agrega 2 tipos nuevos a `PROP_TIPOS`: `'familia'` y `'aplicacion'`. Backend CRUD aparece automáticamente — sin código nuevo en el controller.
- **`apps/web/src/components/propiedades/PropiedadCreateDialog.tsx`** y **`PropiedadTable.tsx`**: componentes genéricos reusables (Phase 29 D-16, D-17). El frontend del nuevo tab `Familia` y `Aplicación` se monta con configuración ~10 LOC, igual que las otras 6 tabs.
- **`apps/web/src/types/propiedad.ts` `copyFor(tipo)`**: helpers para gramática de género. Para `familia` (femenino: "Nueva familia") y `aplicacion` (femenino: "Nueva aplicación") agregar registros en `PROP_LABELS`.
- **`apps/web/src/lib/abrev.ts` `suggestAbrev(nombre, takeChars=4)`**: ya cubierto por tests; reutilizable para los nuevos catálogos.
- **`apps/backend/drizzle/0006_categorias_subcategorias.sql`**: patrón para `prop_familia` (estructura similar con FK + UNIQUE compuesto + CHECK abrev).

### Established Patterns

- **`stripSep(codigo)`** patrón de Phase 29 D-12: función pura que reemplaza `[-_.\s]+` por `''`. El composer de Phase 30 la consume sin necesidad de re-implementar.
- **Migration `--single-transaction --set ON_ERROR_STOP=1`** con backup safety net previo (patrón del operativo 2026-05-15) — Phase 30 aplica el mismo flujo: backup → apply en transacción atómica → registrar en `__drizzle_migrations` + `_journal.json`.
- **6 entries en `_journal.json`** (0000-0007 con 0003 sincronizada). La nueva migration de Phase 30 sería 0008.
- **TS `definePropTable` requiere extender** para `prop_familia` porque tiene FK extra (`subcategoria_id`); no es factory pura. Usar `pgTable()` custom siguiendo el patrón de `prop_subcategoria` en `schema.ts`.

### Integration Points

- **`articulos` table**: agrega `familia`, `custom_1`, `custom_2`, `custom_3`; dropea `rubro`, `subrubro`, `adjetivo`, `prop_aux_1..5`. Schema TS debe sincronizarse en el mismo commit (lección de operativo 2026-05-15 — schema drift silencioso documentado en memoria global `feedback_schema_drift_silencioso.md`).
- **Endpoint `/api/articulos`** (POST/PATCH): backend valida que `articulo.custom_N` existe en la tabla mapeada por `articulo.template_id.template_atributos.custom_slot=N` (lookup a nivel servicio).
- **`articulos.template_id`** (nuevo) FK a `articulos_templates(id)`. Default `NULL` o seed con `template_default.id` (planner decide).
- **Backend `propiedades` module**: agregar `'familia'` y `'aplicacion'` al enum `PROP_TIPOS`. CRUD aparece automáticamente.
- **Frontend `/propiedades`**: agregar 2 tabs (Familias, Aplicaciones) con configuración mínima. La tab Familias necesita un select de subcategoria como columna extra (foreign field) — no es trivial, puede requerir variante del PropiedadTable genérico.

</code_context>

<specifics>
## Specific Ideas

- **Caso de uso inicial: rubrería de repuestos automotor.** El template default debe servir para "Amortiguador Sachs C24-A 345mm Fiat Cronos 1.3" y similares. El propietario del comercio prefiere ese orden de nombre (objeto-marca-modelo-medida-aplicacion).
- **El admin (no developer) gestiona las tablas catálogo vía `/propiedades`.** Phase 30 mantiene esa promesa: las 2 tablas nuevas (`prop_familia`, `prop_aplicacion`) aparecen como tabs en el mismo panel, ABM completo, soft-delete vía `activo`, sin requerir migration manual.
- **Nivel 3 ("familia") debe permitir nombres reusables entre subcategorías.** "Amortiguadores" puede existir bajo "Suspensión" Y bajo "Dirección" sin colisión. El UNIQUE compuesto `(subcategoria_id, lower(nombre))` lo garantiza.
- **El template default es 1.** El usuario no quiere armar templates múltiples desde día 1; el schema los soporta pero `seed-templates.ts` inserta solo el default. Phase 30 cierra TPL-05 (template default automático) sin entregar UI para crear más templates (eso es phase futura cuando aparezca el segundo rubro).
- **Composer funciones puras, sin side effects.** Tests unitarios obligatorios. Casos de borde: codigo con guiones (`AMOR-001`), atributos vacíos (no dejar dobles espacios en nombre), variantes con abrev colisionando entre tipos (`XL` puede existir en `prop_talle` y `prop_color` sin colisión gracias a Phase 29 D-06).

</specifics>

<deferred>
## Deferred Ideas

- **TemplateBuilder UI visual (drag-drop)** — Phase 30 entrega el template default vía seed SQL. Edición visual del template se difiere a phase futura si aparece el caso de uso real (>1 template a gestionar).
- **`prop_modelo`, `prop_medida`** como tablas catálogo — siguen TEXT libre (Phase 29 D-09). Promoción a tabla cuando un rubro lo justifique.
- **`prop_lado`, `prop_anio`** como tablas custom — Phase 30 crea solo `prop_aplicacion` para automotor. Si el caso de uso evoluciona y se necesitan más slots para autopartes (lado izq/der, año desde-hasta), las tablas se agregan en una phase posterior aprovechando los slots `custom_2`/`custom_3` ya reservados.
- **Calificador / adjetivo libre** — descartado del modelo (D-04). Si en el futuro emerge una necesidad de descriptor ad-hoc, se evalúa agregar un campo `articulos.calificador TEXT` independiente.
- **Cableado del `ArticuloForm` con autocomplete a `prop_*` y validación de catálogo** — Phase 32 (Variantes UI absorbe rediseño UX según operativo 2026-05-15).
- **Rediseño UX de `/propiedades` (mover del sidebar a "Catálogos" o similar) + simplificación de switches habilitado/visible en `/settings/articulos`** — Phase 32.
- **Trigger AFTER UPDATE en `prop_*` que sincroniza `articulos.<prop>`** — Phase 29 D-02 lo deja preparado; Phase 31 (PK swap) lo conecta cuando exista FK fuente.
- **Vehículos compatibles / fitment (`vehiculos` + pivot `articulo_vehiculos`)** — Q3 del milestone, fuera de v1.3. Es la solución estructural para "aplicación con múltiples vehículos por artículo"; el slot `custom_1=prop_aplicacion` es solución provisional 1:1 (un artículo, una aplicación principal).
- **Migración masiva de articulos a categorías/familias** — fuera de scope porque los 101.021 artículos en prod tienen TODAS las columnas de clasificación vacías. Cuando se necesite poblar masivamente, será trabajo aparte (probablemente script ad-hoc con mapping desde alguna fuente externa).

### Reviewed Todos (not folded)

- (No hubo todos pendientes matched para Phase 30 — `gsd-sdk query todo.match-phase 30` devolvió 0 matches.)

</deferred>

---

*Phase: 30-Templates + Composición SKU/Nombre*
*Context gathered: 2026-05-16*
