# Phase 29: Catálogos de Atributos - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Crear las 6 tablas de propiedades (`prop_marca`, `prop_color`, `prop_talle`, `prop_material`, `prop_presentacion`, `prop_objeto`) con su ABM web standalone bajo `/propiedades`. Phase 29 es **self-contained**: NO toca `articulos`, NO crea FK desde `articulos.*_id`, NO modifica el form de artículo, NO implementa templates ni composer de SKU. Solo entrega los catálogos editables y un componente reusable para create-on-the-fly que Phase 32 cableará al form rediseñado.

**Renombre conceptual importante:** el roadmap usa la palabra "Catálogos de Atributos" como nombre de la fase, pero en el código y la UI **NO usamos "catálogo"** (reservado para "catálogo de proveedores" futuro). Naming canónico: **"propiedades"** y prefijo de tabla **`prop_`**.

</domain>

<decisions>
## Implementation Decisions

### Schema: shape de tablas y FK

- **D-01: Una tabla por propiedad, NO genérica polimórfica.** 6 tablas independientes (`prop_marca`, `prop_color`, `prop_talle`, `prop_material`, `prop_presentacion`, `prop_objeto`) en vez de una sola `atributo_valores` con campo `tipo`. Razón: tipado fuerte a nivel DB, vista cruda elocuente, integridad referencial estructural cuando Phase 30/31 agregue FK desde `articulos`. Cierra Q1 + Q2 del design-notes.
- **D-02: Identificador y FK por `id` (INT) + cache de nombre denormalizado vía trigger.** Cuando Phase 30/31 agregue FK desde `articulos`, será `articulos.marca_id INT REFERENCES prop_marca(id) ON DELETE RESTRICT` + columna `articulos.marca TEXT` cacheada por trigger AFTER INSERT/UPDATE en `prop_marca`. Phase 29 deja el trigger preparado pero NO lo conecta a `articulos` todavía (queda como SQL en el migration, comentado o aplicado pero sin FK fuente). Cierra Q2.
- **D-03: Schema mínimo por tabla:** `(id SERIAL PK, nombre TEXT NOT NULL, abrev TEXT NOT NULL, activo BOOLEAN DEFAULT true, created_at TIMESTAMP, updated_at TIMESTAMP)`. SIN `slug` (decisión cerrada — el slug no tenía aplicación útil porque `id` es la FK y `abrev` es lo que va al SKU).
- **D-04: Naming de tabla con prefijo `prop_`.** `prop_marca`, `prop_color`, `prop_talle`, `prop_material`, `prop_presentacion`, `prop_objeto`. Nota: convivirá visualmente con los actuales `articulos.prop_aux_1..5` hasta su deprecación en Phase 31/37 — overlap aceptado.
- **D-05: `nombre` UNIQUE case-insensitive** vía `CREATE UNIQUE INDEX … ON prop_marca (LOWER(nombre))` (o `CITEXT` si se prefiere). Evita duplicados como "Shimano" + "shimano" + "SHIMANO".
- **D-06: `abrev` UNIQUE per tabla** con CHECK `abrev ~ '^[A-Z0-9]{1,8}$'`. ASCII mayúsculas + dígitos, 1 a 8 chars. Cross-prop NO se valida — `prop_talle.abrev='XL'` y `prop_color.abrev='XL'` pueden coexistir; el SKU sigue siendo globalmente único porque el composer de Phase 30 respeta el orden fijo del template.

### Set de propiedades

- **D-07: 6 tablas, NO 7.** El roadmap original listaba 7 incluyendo `prop_calificador`. **`calificador` queda como TEXT libre** (no entra a tabla). Razón: se trata de un valor descriptivo ad-hoc por artículo, no un set acotado de valores reusables.
- **D-08: Implicación para Phase 30 (templates):** el composer y el TemplateBuilder deben distinguir entre propiedades **con catálogo** (FK lookup → `abrev`) y propiedades **text-libre** como `calificador` (slugificación en runtime del valor escrito por el usuario al armar SKU/nombre auto).
- **D-09: NO agregamos `prop_modelo`, `prop_medida`, `prop_aplicacion` ahora.** Diferidos a fases futuras cuando aparezca el template del rubro que los necesite (anti-prematuro).
- **D-10: `prop_aux_1..5` actuales en `articulos` quedan out of scope de Phase 29.** Su deprecación es naturalmente parte de Phase 31 (PK swap + cutover) o Phase 37 (tech debt). Acá solo se documenta el overlap visual aceptado con el prefijo `prop_`.

### Composición de SKU (afecta Phase 30, decidido acá)

- **D-11: SKU separator = `-` (guión).** Mantenemos el guión como separador clásico de SKU.
- **D-12: `codigo` queda intacto en `articulos.codigo` (puede contener guiones u otros símbolos).** El composer aplica `stripSep(codigo)` SOLO al armar el SKU. Función pura: `stripSep(s)` reemplaza `[-_.\s]+` por `''`. Ejemplos: `ABC-123` → `ABC123`, `XYZ.001` → `XYZ001`, `FOO_42` → `FOO42`.
- **D-13: Reabre decisión #4 del design-notes.** Era "sin variantes: sku = codigo (misma cadena)". Pasa a: **"sin variantes: sku = stripSep(codigo)"**. Con variantes: `sku = stripSep(codigo) + '-' + abrev1 + '-' + abrev2 + …` según orden del template. Esto debe propagarse a la migración de cutover en Phase 31 (backfill de `sku` desde `codigo` aplica `stripSep`).
- **D-14: Composer NO necesita slugificar valores de catálogo.** Las `abrev` ya están garantizadas ASCII por el CHECK constraint. La única transformación textual es el `stripSep(codigo)`. Esto simplifica `composeSku()` en Phase 30 — `slugify` solo sería necesario para propiedades text-libre (ej: `calificador`).

### UI

- **D-15: Una sola página `/propiedades` con tabs.** Sidebar entry: "Propiedades". Dentro: 6 tabs (Marcas, Colores, Talles, Materiales, Presentaciones, Objetos). Cada tab carga lazy. Razón: 1 entrada compacta en el sidebar, comparación rápida entre props.
- **D-16: Componente `PropiedadTable` genérico parametrizado por config.** Un solo componente React + un solo backend service genérico parametrizado por nombre de tabla. 6 configuraciones (~10 LOC c/u) en vez de 6 componentes copia-pega. Cualquier mejora futura (bulk import, etc.) aplica a las 6.
- **D-17: `PropiedadCreateDialog` componente reusable standalone.** Form modal con auto-suggest de `abrev` (primeras 3-4 letras mayúsculas sin diacritics del nombre, editable libremente por el usuario). Testeado standalone en Phase 29. Phase 32 lo reusa desde el `AtributoSelectField`.
- **D-18: Soft-delete vía `activo=false`.** Listado por defecto filtra `activo=true`; toggle "Mostrar inactivos" para ver el set completo. Reactivar es flip del flag (no recrear).

### Resolución de la tensión SC#5 ↔ "no toca articulos"

- **D-19: Diferir Success Criteria #5 a Phase 32.** Phase 29 entrega: ABM completo + endpoints API + `PropiedadCreateDialog` standalone listo. **NO cabla nada al `ArticuloForm`.** Phase 32 (Variantes UI) crea `AtributoSelectField` que reusa `PropiedadCreateDialog`. **CAT-02 marca como "parcial" (componente listo) en Phase 29 y "completo" (cableado) en Phase 32.** El roadmap necesita reflejar este split — aclarar en planning de Phase 29 y de Phase 32.

### Claude's Discretion

- Estructura de carpetas web/backend (qué módulo NestJS, qué shape de DTOs, naming exacto de archivos): research/planner deciden.
- Detalle de validación frontend (zod schema, mensajes de error): planner decide.
- UX micro: si los tabs van arriba, abajo, o como sidebar lateral; si el form de edit es Sheet o Dialog: ui-researcher decide siguiendo Tabler.
- Auto-sugerencia de `abrev`: algoritmo exacto (primeras 3 vs 4 chars; qué hacer con palabras compuestas como "Continental Europa"). Planner decide; usuario puede editar libremente.
- Si el migration de Phase 29 incluye un seed inicial de marcas/colores/talles para no arrancar vacío. Sugerencia: NO seed por defecto (admin las crea según necesidad real); planner valida.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements

- `.planning/ROADMAP.md` §"Phase 29: Catálogos de Atributos" — Goal, Success Criteria, Pitfalls asignados (P-04, P-11), Open Qs originales (Q1, Q2, Q11). Nota: SC#5 se difiere a Phase 32 según D-19.
- `.planning/REQUIREMENTS.md` §CAT — CAT-01, CAT-02, CAT-03, CAT-04. CAT-02 queda parcial en Phase 29 (componente listo, no cableado).
- `.planning/PROJECT.md` §"Current Milestone: v1.3" — overview del milestone.
- `.planning/STATE.md` — estado actual del proyecto.

### Research del milestone v1.3

- `.planning/research/v1.3-design-notes.md` — captura literal de la discusión exploratoria de `/gsd-new-milestone`. Decisiones cerradas #1-23 son insumo. Ver Q1, Q2, Q11 (cerradas en este CONTEXT.md). **Importante: Decisión cerrada #4 ("sin variantes: sku=codigo") queda revisada por D-13 a "sku = stripSep(codigo)".**
- `.planning/research/STACK.md` — `slugify ^1.6.6` como única dep nueva (Phase 30 lo necesita; Phase 29 NO porque `abrev` es ASCII puro). Drizzle Kit `--custom` SQL migrations obligatorio para renames y CHECK constraints. Phase 29 NO necesita advisory locks.
- `.planning/research/FEATURES.md` §1 (TS-05, TS-09) — catálogos FK + CRUD catálogos.
- `.planning/research/ARCHITECTURE.md` §"Migration order DB" Fase A — orden de creación. **Para Phase 29 aplica solo "CREATE atributo_*"** (renombrado a `prop_*` por D-04). Las FK desde `articulos` quedan para Phase 30/31.
- `.planning/research/PITFALLS.md` §P-04 — slug collisions cross-catalog. Mitigado por D-06 (CHECK ASCII + UNIQUE per tabla, sin cross-prop). §P-11 — denorm trigger silent failure: aplica al trigger de cache de nombre cuando se conecte a `articulos` en Phase 30/31; en Phase 29 NO hay trigger conectado a `articulos`.

### Quick tasks relevantes (contexto histórico)

- `.planning/quick/260409-lik-auditar-modelo-stock-depositos-unidades-/` — auditoría del modelo de stock que originó parte del trabajo de v1.3.
- `.planning/quick/260429-rec-recuperar-datos-inventarios-existencias/` — instaló trigger `articulos.unidades` que será relevante en Phase 33 (no Phase 29).

### Codebase reference

- `apps/backend/src/db/schema.ts` — schema actual de Drizzle. Phase 29 agrega 6 tablas nuevas SIN tocar `articulos`. Bloque "Properties" (líneas 199-213) muestra los TEXT actuales que serán reemplazados por FK en Phase 30/31.
- `apps/backend/drizzle.config.ts` — config Drizzle. Migration con `pnpm db:generate` + revisión manual (Drizzle Kit no detecta CHECK constraints — habrá que escribirlas en custom SQL).
- `apps/web/src/components/articulos/` — `ArticuloForm` (NO se toca en Phase 29).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ServerDataTable`** (apps/web): tabla con paginación + sorting + filtros server-side. `PropiedadTable` la envuelve con columnas estándar (id, nombre, abrev, activo, acciones).
- **TanStack Table v8.21**: `getGroupedRowModel`, `getExpandedRowModel` ya disponibles (no se usan en Phase 29 — son para Phase 32 listado agrupado).
- **shadcn-tabler-mcp**: para mantener Sheet/Dialog/Table consistentes con el resto del admin (Tabler radius, padding, h-9, text-sm).
- **`@objetiva/types`**: package compartido para los tipos de propiedades (`PropMarca`, `PropColor`, etc.). Generar tipos exportables para usar en mobile en milestones futuros si hace falta.
- **NestJS module pattern**: cada módulo existente (`ArticulosModule`, `ExistenciasModule`, etc.) sigue el mismo shape (controller + service + dto + entity). Replicar para `PropiedadesModule`.
- **JWT guard + RBAC** (`JwtAuthGuard`, `RolesGuard`): write endpoints solo para `admin`, read para `viewer` también. Aplicar en endpoints CRUD de propiedades.

### Established Patterns

- **Soft-delete con `activo` boolean**: ya usado en `articulos`, `depositos`, etc. Listado default `WHERE activo=true`.
- **Drizzle Kit `--custom` SQL** para CHECK constraints, triggers, índices funcionales (`UNIQUE LOWER(nombre)`). `pnpm db:generate` no genera CHECK por sí solo.
- **Naming**: tablas `snake_case`, columnas TS `camelCase`, columnas DB `snake_case` (Drizzle map). Los nuevos `prop_*` siguen esto.
- **Forms con React Hook Form + zod**: ya en uso en `ArticuloForm`. `PropiedadForm` usa el mismo patrón.

### Integration Points

- **Sidebar web** (`apps/web/src/components/sidebar.tsx` o equivalente): agregar entry "Propiedades" con icon Tabler.
- **Backend routes**: `POST/GET/PATCH/DELETE /api/propiedades/:tabla` (RESTful). Implementación genérica reutilizando service base por tabla.
- **NO hay integración con `articulos` en Phase 29** — esa integración la hace Phase 30/31 (FK + cache trigger conectado).

</code_context>

<specifics>
## Specific Ideas

- **Auto-suggest de `abrev`**: usuario tipea "Shimano" → UI sugiere "SHI" o "SHIM" en el campo abrev. Editable libremente. Algoritmo concreto lo decide planner; razonable: primeras 3-4 letras del nombre, mayúsculas, NFD + strip diacritics, máximo 8.
- **Tabs lazy-loaded**: cada tab dentro de `/propiedades` carga su data solo cuando se selecciona (no las 6 en paralelo al montar la página).
- **Toggle "mostrar inactivos"**: opcional en cada tab. Default oculto. Útil para reactivar un valor previamente soft-deleted.
- **Mensajes de error en español (es-MX)**: "Esta abreviación ya existe en marcas" / "El nombre no puede repetirse" / "La abreviación debe ser de 1 a 8 caracteres en mayúsculas o dígitos".
- **Confirmación de soft-delete**: dialog con texto del tipo "Vas a desactivar 'Shimano'. Los artículos existentes que la usan no se modifican. ¿Confirmás?"

</specifics>

<deferred>
## Deferred Ideas

- **`prop_calificador` como tabla**: rechazado por D-07 — calificador queda TEXT libre.
- **`prop_modelo`, `prop_medida`, `prop_aplicacion`**: D-09 — diferido a fases futuras cuando aparezca el template que los necesite.
- **Auditoría de uso real de `prop_aux_1..5`**: out of scope de Phase 29 (D-10). Si se necesita, capturar como quick-task antes de Phase 31.
- **Rename `articulos.adjetivo → articulos.calificador`**: NO entra en Phase 29 (no toca articulos). Decidir en Phase 30/31 o tech debt.
- **Cableado de `PropiedadCreateDialog` al `ArticuloForm`**: difiere a Phase 32 (D-19). Phase 29 entrega solo el componente standalone.
- **FK desde `articulos.*_id` a `prop_*.id` + trigger de cache de nombre conectado**: NO en Phase 29; Phase 30/31 lo arma junto con los templates y la cutover de SKU.
- **Bulk import** (CSV/Excel) de valores de catálogo: nice-to-have futuro, no en Phase 29.
- **Renombre de la fase en el roadmap** ("Catálogos de Atributos" → "Propiedades de Artículos") para alinear con la decisión de naming: opcional, baja prioridad. Si se hace, actualizar `.planning/ROADMAP.md` + `.planning/REQUIREMENTS.md`.

</deferred>

---

*Phase: 29-Catalogos de Atributos*
*Context gathered: 2026-04-29*
