# Phase 22: Vista Lista Configurable - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

El usuario puede personalizar qué columnas ve en la lista de artículos y ordenarlos por cualquier columna. La visibilidad de columnas se persiste globalmente en la base de datos (business_settings JSONB). Se agregan columnas faltantes (medida, presentacion, erpUnidades, objeto) y se crea el campo `objeto` en el schema.

</domain>

<decisions>
## Implementation Decisions

### Mecanismo de visibilidad de columnas

- Unificar en un solo mecanismo: el dropdown "Columnas" en la tabla es el punto principal de control
- Cada toggle en el dropdown persiste inmediatamente en DB (PATCH a business_settings) — sin botón "Guardar"
- La página de Settings/Artículos se mantiene como espejo: muestra los mismos toggles y también permite editarlos
- Ambos puntos (dropdown en tabla y Settings) persisten en DB y se sincronizan
- Invalidar cache de `useArticulosConfig` después de cada cambio
- Eliminar `defaultColumnVisibility` hardcodeado en `articulos-columns.tsx` — la visibilidad viene de DB

### Columnas fijas (no ocultables)

- `codigo` y `nombre`: siempre visibles, NO aparecen en el dropdown de visibilidad
- `activo` (Estado): siempre visible como badge, no se puede ocultar
- `actions` (menú ⋮): siempre visible, no se puede ocultar

### Columnas disponibles y defaults

- **Visibles por default:** codigo*, nombre*, modelo, medida, presentacion, precio, erpUnidades (label: "Unidades"), objeto, activo\*
- **Ocultas por default:** marca, sku, codigoBarras, talle, color, material, costo, erpCodigo
- (\*) = fijas, no aparecen en el dropdown

### Columnas nuevas a agregar

- `medida`: varchar, ya existe en schema — agregar columna a la tabla
- `presentacion`: varchar, ya existe en schema — agregar columna a la tabla
- `erpUnidades`: integer, ya existe en schema como `erp_unidades` — agregar columna con header "Unidades"
- `objeto`: varchar NUEVO — crear campo en schema de artículos (texto libre, describe tipo/categoría del artículo)

### Ordenamiento por columnas

- Click en header de columna para ordenar: sin orden → ascendente → descendente → sin orden
- Indicador visual (flecha ↑↓) en el header activo
- Columnas ordenables: codigo, nombre, precio, costo, createdAt, updatedAt (las 6 que ya soporta el backend)
- Columnas no ordenables: todas las demás (marca, modelo, medida, etc.)
- Sort NO se persiste en DB — solo por sesión, default: createdAt desc
- Al cambiar sort se resetea a página 1
- Sort es server-side (ya implementado en backend) — enviar sortBy + sortOrder como query params

### Claude's Discretion

- Diseño exacto del indicador de sort en los headers (flechas, color, animación)
- Cómo diferenciar visualmente headers ordenables de no ordenables
- Labels exactos en el dropdown de columnas (capitalización, abreviaciones)
- Manejo de errores al persistir visibilidad (retry silencioso, toast de error)

</decisions>

<specifics>
## Specific Ideas

- El dropdown de columnas ya existe en ServerDataTable — extenderlo para persistir en DB en vez de ser solo estado local
- useArticulosConfig ya tiene `invalidateArticulosConfig()` — usarlo después de cada toggle
- El campo `objeto` es texto libre tipo "Herramienta", "Insumo", "Repuesto" — similar a marca o material
- Actualizar CamposVisibles en types/articulos-config.ts para incluir los nuevos campos (medida, presentacion, erpUnidades, objeto)
- Actualizar DEFAULT_ARTICULOS_CONFIG para reflejar los nuevos defaults

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ServerDataTable` (`components/tables/server-data-table.tsx`): ya tiene dropdown de visibilidad con DropdownMenuCheckboxItem — extender para persistir
- `useArticulosConfig` (`hooks/use-articulos-config.ts`): hook con module-level cache + invalidateArticulosConfig()
- `getColumns()` en `articulos-columns.tsx`: ya filtra columnas por camposVisibles — unificar con el mecanismo de TanStack VisibilityState
- `CamposVisibles` type en `types/articulos-config.ts`: ya define toggles por campo — agregar nuevos campos
- Settings/Artículos page (`app/(dashboard)/settings/articulos/page.tsx`): ya tiene UI de toggles — sincronizar con dropdown de tabla
- Backend `ArticuloQueryDto`: ya tiene sortBy + sortOrder con validación IsIn

### Established Patterns

- Persistencia de config: PATCH a `/api/settings` con articulosConfig JSONB
- Module-level cache: patrón de `useArticulosConfig` (cachedConfig + fetchPromise)
- TanStack Table: manualPagination + manualSorting ya habilitados en ServerDataTable
- Estética Tabler: border-radius sm, alturas h-8, text-sm base

### Integration Points

- `apps/backend/src/db/schema.ts`: agregar campo `objeto` varchar al schema de artículos
- `apps/backend/src/modules/articulos/dto/articulo-query.dto.ts`: sortBy ya tiene 6 campos — no requiere cambios
- `apps/backend/src/modules/articulos/articulos.service.ts`: colMap ya tiene 6 campos — no requiere cambios
- `apps/web/src/lib/api.client.ts`: fetchArticulosClient necesita aceptar sortBy/sortOrder params
- `apps/web/src/types/articulos-config.ts`: agregar medida, presentacion, erpUnidades, objeto a CamposVisibles
- `apps/web/src/components/articulos/articulos-columns.tsx`: agregar 4 columnas nuevas + quitar defaultColumnVisibility

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 22-vista-lista-configurable_
_Context gathered: 2026-03-12_
