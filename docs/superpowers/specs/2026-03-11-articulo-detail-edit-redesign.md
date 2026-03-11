# Rediseño: Panel de Detalle y Página de Edición de Artículos

## Contexto

Los componentes `ArticuloSheet` (panel lateral de detalle) y la página de edición (`/articulos/[codigo]/editar`) tienen una distribución plana sin jerarquía visual. Todos los campos tienen el mismo peso, la información importante (precios, stock) está enterrada, y hay mucho scroll innecesario. Además, la gestión de imágenes (6 producto + 3 etiquetas) necesita espacio dedicado.

## Alcance

- `apps/web/src/components/articulos/articulo-sheet.tsx` — rediseño completo del layout
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — rediseño del layout
- `apps/web/src/components/articulos/articulo-form.tsx` — reestructuración de secciones

No se toca: lógica de negocio, API calls, validación Zod, rutas. Solo distribución visual y componentes UI.

## Diseño

### 1. ArticuloSheet (Panel Lateral de Detalle)

**Layout: Cards hero + grid 2 columnas + collapsibles**

```
┌─────────────────────────────────────────┐
│ [Nombre del Artículo]                   │
│ COD-001 · SKU: ADI-REM-001    [Activo] [Editar] │
├─────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│ │  PRECIO   │ │   COSTO   │ │  STOCK  │ │
│ │ $1,250.00 │ │  $680.00  │ │   142   │ │
│ └───────────┘ └───────────┘ └─────────┘ │
├─────────────────────────────────────────┤
│ PROPIEDADES                             │
│ Marca    Adidas  │ Modelo  Originals    │
│ Talle    M       │ Color   Negro        │
│ Material Algodón │ Medida  —            │
├─────────────────────────────────────────┤
│ STOCK POR DEPÓSITO                      │
│ ┌─────────────────────────────────────┐ │
│ │ Central          98    Normal       │ │
│ │ Sucursal Norte   44    Normal       │ │
│ │ Total           142                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ESTADO                                  │
│ Activo · Creado 01/03/2026 · Act. hoy   │
├─────────────────────────────────────────┤
│ ▸ ERP                                   │
│ ▸ Origen                                │
│ ▸ Etiquetas OCR                         │
│ ▸ Datos crudos                          │
└─────────────────────────────────────────┘
```

**Cambios específicos:**

1. **Header**: Nombre como título + código/SKU como subtítulo + Badge estado + botón Editar. Todo en una línea.

2. **Cards hero (3 tarjetas inline)**: Precio, Costo, Stock Total. Fondo `bg-muted`, texto grande (`text-xl font-semibold`), label pequeño uppercase arriba. Esto es lo primero que el usuario ve después del nombre.

3. **Propiedades en grid 2 columnas**: Reemplazar `space-y-1.5` por `grid grid-cols-2 gap-x-6 gap-y-1`. Cada propiedad es un `FieldRow` con label left y valor right, pero ahora en 2 columnas para ser más compacto. Propiedades con valor nulo (`null`) se muestran como "—". La sección de Identificación (código, nombre, SKU, barras) se fusiona con el header — el código y SKU ya están en el subtítulo. Solo quedan cod. barras y observaciones como FieldRows debajo de las propiedades (sin sección propia, solo si tienen valor).

4. **Stock por depósito**: Se mantiene como tabla con las 5 columnas actuales (Depósito, Cantidad, Min, Max, Estado) dentro de un contenedor con borde (`border rounded-sm`). Sin cambios funcionales.

5. **Estado**: Compactar en una sola línea: Badge + fechas inline. No necesita ser una sección separada con 3 FieldRows.

6. **Secciones colapsables (siempre cerradas)**:
   - ERP — solo si `hasAnyErpField()` es true
   - Origen — solo si `hasAnyOriginField()` es true
   - Etiquetas OCR — solo si hay tags
   - Datos crudos — solo si hay JSON data
   - Usar `Collapsible` de shadcn/ui para todas
   - Trigger: texto + chevron, estilo consistente

**Componentes UI necesarios:**

- `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` (ya instalado)
- No se necesitan componentes nuevos

### 2. Página de Edición

**Layout: 50/50 dos columnas con header sticky**

```
┌─────────────────────────────────────────────────────────┐
│ ← Volver  Editar: Remera Adidas [Activo] [Desactivar] [Guardar] │  ← sticky
├────────────────────────────┬────────────────────────────┤
│ IDENTIFICACIÓN             │ IMÁGENES PRODUCTO (6)      │
│ ┌────────┐ ┌────────┐     │ ┌──┐┌──┐┌──┐              │
│ │Código🔒│ │ SKU    │     │ │📷││📷││📷│  [+ Subir]   │
│ └────────┘ └────────┘     │ └──┘└──┘└──┘              │
│ ┌──────────────────┐      │ ┌──┐┌──┐┌──┐              │
│ │ Nombre           │      │ │📷││📷││📷│              │
│ └──────────────────┘      │ └──┘└──┘└──┘              │
│ ┌──────────────────┐      │ ┌─────────────────────┐    │
│ │ Código barras    │      │ │ Arrastrá para subir  │    │
│ └──────────────────┘      │ └─────────────────────┘    │
│                            │                            │
│ PROPIEDADES                │ IMÁGENES ETIQUETAS (3)     │
│ ┌────────┐ ┌────────┐     │ ┌──┐┌──┐┌──┐  [+ Subir]  │
│ │ Marca  │ │ Modelo │     │ │🏷││🏷││🏷│              │
│ └────────┘ └────────┘     │ └──┘└──┘└──┘              │
│ ┌────────┐ ┌────────┐     │ ┌─────────────────────┐    │
│ │ Talle  │ │ Color  │     │ │ Arrastrá para subir  │    │
│ └────────┘ └────────┘     │ └─────────────────────┘    │
│ ┌────────┐ ┌────────┐     │                            │
│ │Material│ │Present.│     │                            │
│ └────────┘ └────────┘     │                            │
│ ┌──────────────────┐      │                            │
│ │ Medida           │      │                            │
│ └──────────────────┘      │                            │
│                            │                            │
│ PRECIOS                    │                            │
│ ┌────────┐ ┌────────┐     │                            │
│ │ Precio │ │ Costo  │     │                            │
│ └────────┘ └────────┘     │                            │
│                            │                            │
│ Observaciones              │                            │
│ ┌──────────────────┐      │                            │
│ │ Textarea         │      │                            │
│ └──────────────────┘      │                            │
│                            │                            │
│ ▸ ERP    ▸ Origen          │                            │
└────────────────────────────┴────────────────────────────┘
```

**Cambios específicos:**

1. **Header sticky**: `sticky top-0 z-10 bg-background border-b`. Contiene:
   - ← Volver (ghost button)
   - Título "Editar: {nombre}" — usar `truncate max-w-[300px]` para títulos largos
   - Badge de estado
   - Botón Desactivar/Reactivar (outline, destructive para desactivar)
   - Botón Guardar (primary) — usa `form="articulo-edit-form"` para conectar con el `<form>`. El `<form>` en `ArticuloForm` recibe `id="articulo-edit-form"`.
   - El botón Guardar al final del form se elimina en modo `edit`.
   - El botón Guardar muestra spinner `Loader2` durante submit. El estado `isLoading` se expone desde `ArticuloForm` via un callback `onLoadingChange?: (loading: boolean) => void` que la page consume con `useState`.

2. **Layout 2 columnas**: `grid grid-cols-1 lg:grid-cols-2 gap-6`. Responsive: en pantallas < lg es una sola columna (imágenes debajo del form). Columna izquierda: form fields. Columna derecha: galerías de imágenes.

3. **Modo create vs edit**: El layout 2 columnas y header sticky aplican solo al modo `edit`. En modo `create` (`/articulos/nuevo`), el `ArticuloForm` mantiene su estructura actual de una sola columna con el botón submit interno, ya que no hay imágenes que gestionar en un artículo que aún no existe. El `ArticuloForm` acepta un prop `showSubmitButton?: boolean` (default `true`), que la page de edición setea a `false`.

4. **Columna izquierda — Campos del form**:
   - Cada sección en un contenedor con borde: `border rounded-sm p-4`
   - **Identificación**: Código (disabled) + SKU en 2col, Nombre full-width, Código barras full-width
   - **Propiedades**: Grid de 2 columnas para los 7 campos
   - **Precios**: Precio y Costo en 2 columnas
   - **Observaciones**: Textarea full-width
   - **ERP y Origen**: Collapsibles en fila inline (`flex gap-2`), siempre cerrados. Al expandir, muestran los campos en grid 2col dentro del collapsible.

5. **Columna derecha — Imágenes**:
   - **Imágenes Producto**: Card con borde. Header con título + botón "+ Subir". Grid `grid-cols-3 gap-2` con thumbnails cuadrados (`aspect-square`). Cada thumbnail tiene botón X overlay para eliminar. Dropzone dashed debajo del grid.
   - **Imágenes Etiquetas**: Misma estructura, grid `grid-cols-3 gap-2` con 3 slots.
   - Las imágenes son solo placeholder por ahora (fase 20-21 del roadmap las implementa). Se muestra el esqueleto con el layout correcto.

6. **Sección ERP/Origen colapsable**:
   - Dos collapsibles lado a lado: `flex gap-2` al final de la columna izquierda
   - Cada uno es un `Collapsible` con trigger estilizado como botón outline
   - Al expandir: campos en grid 2col

**Estilos Tabler a aplicar:**

- `rounded-xl` → `rounded-sm` en cards/contenedores
- Padding `py-6` → `py-4`, `px-6` → `px-4`
- Gaps `gap-6` → `gap-4`
- Texto base `text-sm` (14px)
- Alturas de controles `h-10` → `h-9`
- Section headers: `text-xs font-medium text-muted-foreground uppercase tracking-wide` (unificado en ambos componentes: sheet y form)

### 3. Componentes reutilizables

**SectionCard** — contenedor con borde para agrupar campos:

```tsx
// No crear componente separado, usar directamente:
<div className="border rounded-sm p-4 space-y-3">
  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
  {children}
</div>
```

**StatCard** — tarjeta de KPI para el detail sheet:

```tsx
// Inline en ArticuloSheet:
<div className="flex-1 bg-muted rounded-sm p-3">
  <p className="text-xs text-muted-foreground uppercase">{label}</p>
  <p className="text-xl font-semibold tabular-nums">{value}</p>
</div>
```

## Qué NO cambia

- Schema Zod de validación
- Lógica de API calls (fetch, create, update, toggle)
- Rutas de navegación
- Componentes base de shadcn/ui (solo se ajustan clases CSS)
- Lógica de stock loading en el sheet
- AlertDialog de confirmación de toggle
- La sección de imágenes será solo placeholder/esqueleto (la implementación real es fase 20-21)

## Archivos a modificar

1. `apps/web/src/components/articulos/articulo-sheet.tsx` — rediseño completo del layout
2. `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — header sticky + layout 2 columnas + botón submit externo con `form="articulo-edit-form"`
3. `apps/web/src/components/articulos/articulo-form.tsx` — reestructuración de secciones con cards, collapsibles ERP/Origen, props `showSubmitButton` y `onLoadingChange`, atributo `id` en el form
4. `apps/web/src/app/(dashboard)/articulos/nuevo/page.tsx` — sin cambios de layout (solo hereda los cambios internos del form: cards, collapsibles)

## Criterios de éxito

- [ ] Detail sheet muestra precio/costo/stock como cards hero prominentes
- [ ] Propiedades del detail sheet están en grid 2 columnas
- [ ] ERP/Origen/OCR/JSON siempre colapsados en el detail sheet
- [ ] Página de edición tiene layout 50/50 (datos | imágenes)
- [ ] Header de edición es sticky con botón Guardar siempre visible
- [ ] Secciones ERP y Origen son collapsibles en la página de edición
- [ ] Placeholder de imágenes muestra el grid correcto (3x2 + 3x1)
- [ ] Estilos Tabler aplicados: rounded-sm, padding compacto, text-sm base
- [ ] Página de creación sigue funcionando con botón submit interno
- [ ] Botón Guardar del header muestra spinner durante submit
- [ ] Layout responsive: una columna en pantallas < lg
- [ ] Sin regresiones: toggle, navegación, guardado siguen funcionando
