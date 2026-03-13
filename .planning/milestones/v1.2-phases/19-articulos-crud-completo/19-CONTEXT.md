# Phase 19: Articulos CRUD Completo - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Completar el CRUD de articulos: crear, editar, soft-delete con confirmación, y búsqueda en la lista. El formulario ya existe con ~24 campos agrupados en secciones — esta fase lo completa con acciones por fila, AlertDialog de confirmación para toggle, búsqueda ampliada, y mejoras al sheet de detalle para campos JSONB. Las imágenes son Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Soft-delete UX

- AlertDialog modal (shadcn AlertDialog) para activar/desactivar artículos
- Mensajes diferenciados: "¿Desactivar artículo? No aparecerá en la lista principal" vs "¿Reactivar artículo? Volverá a aparecer en la lista"
- Botones con texto contextual (Desactivar/Reactivar, no genérico "Confirmar")
- Accesible desde dos puntos: página de edición (reemplazar Switch actual) Y menú contextual en la tabla
- Sin restricciones para desactivar — no importa si tiene stock o pedidos pendientes (es soft-delete, no borra datos)
- Al desactivar desde la tabla con filtro "Activos": la fila desaparece inmediatamente (optimistic update) + toast de confirmación

### Campos JSONB en el formulario

- `erpDatos` (JSONB): omitido del formulario de crear/editar — es data de sync con ERP, no edición manual
- `jsonArticulo` (JSONB): omitido del formulario — es data de integraciones/sync
- `etiquetasOcr` (array strings): omitido del formulario — data generada por OCR
- Los tres campos se muestran read-only en el sheet de detalle si contienen datos:
  - `erpDatos` y `jsonArticulo`: sección colapsable "Datos crudos" con JSON formateado
  - `etiquetasOcr`: lista de chips/tags read-only

### Alcance de búsqueda

- Ampliar búsqueda a TODOS los campos de texto: codigo, nombre, sku, codigoBarras, erpCodigo (actuales) + marca, modelo, talle, color, material, presentacion, medida, observaciones
- Placeholder genérico: "Buscar artículos..."
- Sin highlight de coincidencias en la tabla — solo filtrar resultados
- Debounce de 300ms (mantener actual)

### Acciones por fila en la tabla

- Menú contextual (⋮) al final de cada fila con DropdownMenu
- Dos acciones: "Editar" (navega a /articulos/[codigo]/editar) y "Activar/Desactivar" (abre AlertDialog)
- Click en la fila sigue abriendo el sheet lateral de detalle (comportamiento actual)
- El botón "Editar" dentro del sheet de detalle se mantiene como acceso alternativo

### Claude's Discretion

- Diseño exacto del AlertDialog (colores, iconos, spacing)
- Cómo manejar el JSON formatting en el sheet (syntax highlighting nivel)
- Nombre exacto de la sección colapsable en el sheet

</decisions>

<specifics>
## Specific Ideas

- El AlertDialog debe usar el componente AlertDialog de shadcn/ui que ya existe en `components/ui/alert-dialog.tsx`
- El menú contextual debe usar DropdownMenu de shadcn/ui que ya existe en `components/ui/dropdown-menu.tsx`
- Mantener la estética Tabler del proyecto (border-radius reducido, alturas compactas, text-sm base)

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ArticuloForm` (`components/articulos/articulo-form.tsx`): form completo con create/edit mode, React Hook Form + Zod
- `ArticuloSheet` (`components/articulos/articulo-sheet.tsx`): panel lateral de detalle con stock por depósito
- `ArticuloStatusFilter` (`components/articulos/articulo-status-filter.tsx`): filtro activo/inactivo/todos
- `articulos-columns.tsx`: definición de columnas para TanStack Table
- `ServerDataTable` (`components/tables/server-data-table.tsx`): tabla paginada server-side con onRowClick
- `AlertDialog` (`components/ui/alert-dialog.tsx`): componente de confirmación
- `DropdownMenu` (`components/ui/dropdown-menu.tsx`): menú contextual

### Established Patterns

- Forms: React Hook Form + Zod resolver + shadcn Form components
- API calls client: funciones en `lib/api.client.ts` (createArticulo, updateArticulo, toggleArticuloActivo, fetchArticulosClient)
- Toasts: `useToast()` hook para feedback
- Búsqueda: debounce con useRef/setTimeout en ArticulosClient
- Toggle actual: Switch + PATCH /articulos/:codigo/toggle en el backend

### Integration Points

- Backend articulos.service.ts: ilike search en findAll() — agregar campos al OR
- Backend articulos.controller.ts: POST, PATCH, PATCH toggle ya existen
- `articulos-client.tsx`: componente principal de la lista — agregar columna de acciones
- `articulo-sheet.tsx`: agregar secciones para JSONB read-only

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 19-articulos-crud-completo_
_Context gathered: 2026-03-10_
