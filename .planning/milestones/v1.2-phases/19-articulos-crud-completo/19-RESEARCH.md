# Phase 19: Articulos CRUD Completo - Research

**Researched:** 2026-03-10
**Domain:** CRUD frontend/backend completions, row actions, AlertDialog confirmation, JSONB display, expanded search
**Confidence:** HIGH

## Summary

Esta fase completa el CRUD de articulos que ya tiene la mayoria de la infraestructura construida. El formulario de crear/editar existe con ~24 campos agrupados en secciones (ArticuloForm), las rutas de backend (POST, PATCH, PATCH toggle) estan operativas, y la tabla con paginacion server-side funciona. Lo que falta es: (1) agregar una columna de acciones por fila con DropdownMenu, (2) reemplazar el Switch de toggle por AlertDialog con confirmacion contextual, (3) ampliar la busqueda backend a mas campos de texto, y (4) agregar secciones read-only en el sheet de detalle para campos JSONB (erpDatos, jsonArticulo, etiquetasOcr).

La complejidad es baja-media: todos los componentes UI necesarios ya existen (AlertDialog, DropdownMenu, Sheet), el patron de API calls con auth headers esta establecido, y la tabla server-side ya soporta onRowClick. El cambio mas delicado es agregar la columna de acciones sin romper el click de fila que abre el sheet.

**Primary recommendation:** Implementar en 3 bloques: (1) backend - ampliar search, (2) frontend tabla - columna acciones + AlertDialog, (3) frontend sheet - secciones JSONB read-only + reemplazar Switch en edit page.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- AlertDialog modal (shadcn AlertDialog) para activar/desactivar articulos
- Mensajes diferenciados: "Desactivar articulo? No aparecera en la lista principal" vs "Reactivar articulo? Volvera a aparecer en la lista"
- Botones con texto contextual (Desactivar/Reactivar, no generico "Confirmar")
- Accesible desde dos puntos: pagina de edicion (reemplazar Switch actual) Y menu contextual en la tabla
- Sin restricciones para desactivar — no importa si tiene stock o pedidos pendientes
- Al desactivar desde la tabla con filtro "Activos": la fila desaparece inmediatamente (optimistic update) + toast de confirmacion
- `erpDatos` (JSONB): omitido del formulario — data de sync con ERP
- `jsonArticulo` (JSONB): omitido del formulario — data de integraciones/sync
- `etiquetasOcr` (array strings): omitido del formulario — data generada por OCR
- Los tres campos se muestran read-only en el sheet de detalle si contienen datos
- `erpDatos` y `jsonArticulo`: seccion colapsable "Datos crudos" con JSON formateado
- `etiquetasOcr`: lista de chips/tags read-only
- Ampliar busqueda a TODOS los campos de texto: codigo, nombre, sku, codigoBarras, erpCodigo + marca, modelo, talle, color, material, presentacion, medida, observaciones
- Placeholder: "Buscar articulos..."
- Sin highlight de coincidencias — solo filtrar resultados
- Debounce 300ms (mantener actual)
- Menu contextual (3 puntos) al final de cada fila con DropdownMenu
- Dos acciones: "Editar" (navega a /articulos/[codigo]/editar) y "Activar/Desactivar" (abre AlertDialog)
- Click en fila sigue abriendo el sheet lateral
- El boton "Editar" dentro del sheet se mantiene

### Claude's Discretion

- Diseno exacto del AlertDialog (colores, iconos, spacing)
- Como manejar el JSON formatting en el sheet (syntax highlighting nivel)
- Nombre exacto de la seccion colapsable en el sheet

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                               | Research Support                                                                                                                                  |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART-01 | User can create a new articulo filling all ~30 fields grouped efficiently | Form ya existe (ArticuloForm) con create mode, POST endpoint operativo. Solo verificar que el form quede consistente con los cambios de esta fase |
| ART-02 | User can edit an existing articulo with the same form, pre-populated      | Edit page ya existe con ArticuloForm mode="edit". Cambio: reemplazar Switch por AlertDialog para toggle                                           |
| ART-03 | User can soft-delete (toggle activo/inactivo) with confirmation dialog    | Nuevo: AlertDialog con mensajes contextuales desde tabla y edit page. Backend toggle ya existe                                                    |
| ART-04 | User can search/filter articulos in real-time with debounce               | Ampliar ilike search en backend a 8 campos adicionales. Frontend debounce ya funciona                                                             |

</phase_requirements>

## Standard Stack

### Core (ya instalado en el proyecto)

| Library                | Purpose                                  | Why Standard                                                 |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| shadcn/ui AlertDialog  | Confirmacion modal destructiva           | Ya existe en `components/ui/alert-dialog.tsx`                |
| shadcn/ui DropdownMenu | Menu contextual por fila                 | Ya existe en `components/ui/dropdown-menu.tsx`               |
| shadcn/ui Collapsible  | Seccion colapsable para JSONB            | Necesita instalacion via `npx shadcn@latest add collapsible` |
| React Hook Form + Zod  | Form management                          | Patron establecido en ArticuloForm                           |
| TanStack Table         | Tabla con columnas                       | Patron establecido en ServerDataTable                        |
| Drizzle ORM ilike + or | Busqueda server-side                     | Ya usado en articulos.service.ts                             |
| lucide-react           | Iconos (MoreHorizontal, PencilIcon, etc) | Ya instalado y usado en todo el proyecto                     |

### Instalacion necesaria

```bash
cd apps/web && npx shadcn@latest add collapsible
```

### Alternativas Consideradas

| Instead of            | Could Use                   | Tradeoff                                                                                 |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| Collapsible (shadcn)  | Details/summary HTML nativo | Collapsible da animacion y consistencia con el design system                             |
| JSON.stringify pretty | react-json-view o similar   | Overkill para read-only display, `<pre>` con JSON.stringify(data, null, 2) es suficiente |

## Architecture Patterns

### Patron 1: Columna de acciones con stopPropagation

**What:** Agregar una columna de acciones al final de la tabla que contiene un DropdownMenu sin que el click se propague al onRowClick del sheet.
**When to use:** Siempre que una tabla tiene onRowClick y tambien necesita acciones inline.
**Example:**

```typescript
// En articulos-columns.tsx - nueva columna al final
{
  id: 'actions',
  enableHiding: false,
  cell: ({ row }) => {
    const articulo = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()} // CRITICO: evitar que abra el sheet
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* navigate */ }}>
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* open dialog */ }}>
            Desactivar/Reactivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}
```

### Patron 2: AlertDialog controlado con estado externo

**What:** Como la columna de acciones necesita abrir un AlertDialog, y el AlertDialog no puede estar dentro del DropdownMenu facilmente, usar estado en el componente padre (ArticulosClient) para controlar que articulo se esta toggling.
**When to use:** Cuando un dialogo de confirmacion se dispara desde una celda de tabla.
**Example:**

```typescript
// En articulos-client.tsx
const [toggleTarget, setToggleTarget] = useState<Articulo | null>(null)

// El AlertDialog vive a nivel del ArticulosClient, no dentro de la celda
<AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
  ...
</AlertDialog>
```

### Patron 3: Optimistic update en toggle desde tabla

**What:** Al desactivar un articulo con filtro "Activos", la fila desaparece inmediatamente del array local, se llama a la API, y si falla se revierte.
**When to use:** Cuando el toggle cambia la visibilidad del item segun el filtro activo.
**Example:**

```typescript
async function handleToggle(articulo: Articulo) {
  // Optimistic: remove from local data if filter is 'active' and we're deactivating
  const previousData = [...data]
  if (statusFilter === 'active' && articulo.activo) {
    setData(prev => prev.filter(a => a.codigo !== articulo.codigo))
  }
  try {
    await toggleArticuloActivo(articulo.codigo)
    toast({ title: articulo.activo ? 'Articulo desactivado' : 'Articulo activado' })
    // Refresh para actualizar meta.total
    fetchData(page, search, statusFilter)
  } catch {
    setData(previousData) // Revert on error
    toast({ title: 'Error', variant: 'destructive' })
  }
}
```

### Patron 4: Seccion JSONB colapsable en Sheet

**What:** Mostrar datos JSONB en una seccion colapsable con JSON formateado.
**When to use:** Para erpDatos y jsonArticulo en el sheet de detalle.
**Example:**

```typescript
// Solo renderizar si el campo tiene datos
{articulo.erpDatos && (
  <Collapsible>
    <CollapsibleTrigger className="flex items-center gap-2">
      <ChevronRight className="h-4 w-4 transition-transform" />
      <span className="text-sm font-medium">Datos crudos</span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <pre className="mt-2 rounded-sm bg-muted p-3 text-xs overflow-x-auto">
        {JSON.stringify(articulo.erpDatos, null, 2)}
      </pre>
    </CollapsibleContent>
  </Collapsible>
)}
```

### Anti-Patterns to Avoid

- **AlertDialog dentro de DropdownMenu:** Radix UI tiene problemas de focus trap cuando un Dialog se abre desde un DropdownMenu. Solucion: manejar el estado del dialog en el padre y renderizar el AlertDialog fuera del DropdownMenu.
- **Re-fetch completo en cada toggle:** No hacer fetch completo; usar optimistic update + fetch solo para actualizar el total.
- **Pasar callbacks a columnas via closures inline:** Las columnas se re-crean en cada render. Mejor: pasar el handler como meta en la tabla o usar el patron de estado elevado.

## Don't Hand-Roll

| Problem            | Don't Build                     | Use Instead                               | Why                                                  |
| ------------------ | ------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Confirmacion modal | Dialogo HTML custom             | shadcn AlertDialog                        | Focus trap, ESC handling, aria-labels, overlay click |
| Menu contextual    | Dropdown HTML custom            | shadcn DropdownMenu                       | Keyboard nav, positioning, portal                    |
| Seccion colapsable | div con display toggle          | shadcn Collapsible o HTML details         | Animacion, accesibilidad, estado abierto/cerrado     |
| JSON pretty print  | Libreria de syntax highlighting | `JSON.stringify(data, null, 2)` + `<pre>` | Read-only, no necesita interactividad                |

## Common Pitfalls

### Pitfall 1: Click en acciones abre el sheet

**What goes wrong:** El DropdownMenuTrigger propaga el click event al TableRow que tiene onRowClick.
**Why it happens:** Event bubbling - el click sube del button al td al tr.
**How to avoid:** `e.stopPropagation()` en el onClick del DropdownMenuTrigger Y en cada DropdownMenuItem.
**Warning signs:** Cada vez que haces click en el menu de 3 puntos, se abre el sheet detras.

### Pitfall 2: AlertDialog no se cierra al confirmar

**What goes wrong:** El AlertDialog queda abierto despues de confirmar la accion.
**Why it happens:** El estado controlado (`toggleTarget`) no se limpia.
**How to avoid:** Limpiar `setToggleTarget(null)` al inicio del handler de confirmacion, antes del await.

### Pitfall 3: ilike con muchos campos OR es lento

**What goes wrong:** La busqueda con 13 campos OR sin indices puede ser lenta con muchos registros.
**Why it happens:** PostgreSQL tiene que hacer sequential scan por cada campo sin indice.
**How to avoid:** Para el volumen actual (~500 articulos del seed) no es problema. Los campos principales (codigo, nombre, sku, codigoBarras, erpCodigo) ya tienen indices. Si crece a >10k, considerar pg_trgm o full-text search.
**Warning signs:** Latencia >200ms en busqueda.

### Pitfall 4: Optimistic update desincroniza meta.total

**What goes wrong:** Despues del optimistic remove, el total de la paginacion queda desactualizado.
**Why it happens:** Solo se actualizo el array `data` local, no `meta.total`.
**How to avoid:** Despues del toggle exitoso, hacer un re-fetch ligero para actualizar la paginacion.

### Pitfall 5: Collapsible no instalado

**What goes wrong:** Import falla porque el componente Collapsible no existe en components/ui.
**Why it happens:** shadcn/ui no instala todos los componentes por defecto.
**How to avoid:** Verificar existencia y correr `npx shadcn@latest add collapsible` como primer paso.

## Code Examples

### Backend: Ampliar campos de busqueda

```typescript
// articulos.service.ts - findAll()
if (query.search) {
  const pattern = `%${query.search}%`
  conditions.push(
    or(
      ilike(articulos.codigo, pattern),
      ilike(articulos.nombre, pattern),
      ilike(articulos.sku, pattern),
      ilike(articulos.codigoBarras, pattern),
      ilike(articulos.erpCodigo, pattern),
      // Nuevos campos:
      ilike(articulos.marca, pattern),
      ilike(articulos.modelo, pattern),
      ilike(articulos.talle, pattern),
      ilike(articulos.color, pattern),
      ilike(articulos.material, pattern),
      ilike(articulos.presentacion, pattern),
      ilike(articulos.medida, pattern),
      ilike(articulos.observaciones, pattern)
    )
  )
}
```

### Frontend: Comunicacion columna -> padre para acciones

```typescript
// Opcion recomendada: pasar callbacks via columnas como funcion factory
export function getColumns(handlers: {
  onEdit: (articulo: Articulo) => void
  onToggle: (articulo: Articulo) => void
}): ColumnDef<Articulo>[] {
  return [
    ...baseColumns,
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <RowActions articulo={row.original} {...handlers} />,
    },
  ]
}
```

### Frontend: RowActions component

```typescript
function RowActions({ articulo, onEdit, onToggle }: {
  articulo: Articulo
  onEdit: (a: Articulo) => void
  onToggle: (a: Articulo) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(articulo) }}>
          <PencilIcon className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onToggle(articulo) }}>
          {articulo.activo ? 'Desactivar' : 'Reactivar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Frontend: AlertDialog con mensajes contextuales

```typescript
<AlertDialog open={!!toggleTarget} onOpenChange={open => !open && setToggleTarget(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {toggleTarget?.activo ? 'Desactivar articulo?' : 'Reactivar articulo?'}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {toggleTarget?.activo
          ? `"${toggleTarget.nombre}" no aparecera en la lista principal.`
          : `"${toggleTarget?.nombre}" volvera a aparecer en la lista.`}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmToggle}>
        {toggleTarget?.activo ? 'Desactivar' : 'Reactivar'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## State of the Art

| Old Approach                             | Current Approach                        | Impact                                               |
| ---------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| Switch directo sin confirmacion (actual) | AlertDialog con confirmacion contextual | Previene toggles accidentales, UX mas clara          |
| Busqueda en 5 campos                     | Busqueda en 13 campos                   | Usuarios encuentran articulos por cualquier atributo |
| Sin menu de acciones en tabla            | DropdownMenu por fila                   | Acciones rapidas sin navegar                         |
| Sin visualizacion de JSONB               | Seccion colapsable read-only            | Transparencia de datos de integracion                |

## Open Questions

1. **Collapsible component availability**
   - What we know: No existe en `components/ui/` actualmente
   - What's unclear: Si shadcn latest lo tiene o necesita Radix @radix-ui/react-collapsible directo
   - Recommendation: Instalar via `npx shadcn@latest add collapsible`. Si falla, usar HTML `<details>/<summary>` nativo

2. **Columna acciones + columns como export estatico**
   - What we know: `articulos-columns.tsx` exporta `columns` como const estatica
   - What's unclear: Si cambiar a funcion factory rompe el memoizado en ServerDataTable
   - Recommendation: Cambiar a funcion factory `getColumns(handlers)` y usar useMemo en ArticulosClient para evitar re-renders

## Sources

### Primary (HIGH confidence)

- Codigo fuente del proyecto: schema.ts, articulos.service.ts, articulo-form.tsx, articulos-columns.tsx, articulos-client.tsx, articulo-sheet.tsx, server-data-table.tsx, edit page
- CONTEXT.md de Phase 19 (decisiones del usuario)

### Secondary (MEDIUM confidence)

- shadcn/ui AlertDialog, DropdownMenu, Collapsible patterns - basado en uso existente en el proyecto + conocimiento de la API de Radix UI

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - todo ya esta instalado excepto Collapsible
- Architecture: HIGH - los patrones estan claramente establecidos en el codebase existente
- Pitfalls: HIGH - los problemas de event propagation y AlertDialog dentro de DropdownMenu son bien documentados

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (codebase estable, sin dependencias fast-moving)
