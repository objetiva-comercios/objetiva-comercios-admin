# Quick Task 260410-ifc: Rediseño de imágenes de artículos - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Task Boundary

Rediseñar la representación visual de imágenes de artículos en tres vistas:
1. **Vista de lista**: Agregar iconos indicadores de imágenes de producto y etiqueta
2. **Panel detalle (sheet)**: Rediseñar la fila de placeholders/thumbnails para mostrar los 9 slots completos
3. **Vista edición**: Sin cambios — es la referencia de diseño correcta

No se modifica el backend de upload/delete ni la lógica de procesamiento de imágenes. Solo cambios de presentación visual y posiblemente agregar campos de conteo al endpoint de lista.

</domain>

<decisions>
## Implementation Decisions

### Posición de iconos en vista de lista
- Los iconos van **después del campo nombre**, antes de marca/modelo
- Una sola columna compacta con ambos iconos juntos

### Iconos Lucide elegidos
- **Producto**: `Image` (lucide-react)
- **Etiqueta**: `Tag` (lucide-react)

### Comportamiento de iconos en lista
- **Con imágenes**: Icono en color normal + número al lado (ej: 🖼 3 🏷️ 2)
- **Sin imágenes**: Icono gris/alpha bajo + punto medio "·" en lugar de número
- Número pequeño al lado del icono mostrando la cuenta exacta

### Layout del panel detalle
- **Fila única de 9 slots**: 6 producto + separador vertical + 3 etiqueta
- Separador: **línea vertical sutil** (1px, color muted, con gap extra)
- Tamaño thumbnails: **48x48px** (w-12 h-12)
- Labels por grupo: "Producto" y "Etiqueta" arriba de cada grupo

### Estilo de placeholders vacíos (detalle)
- **Borde dashed** + icono ImageIcon con opacity 30-40%
- Consistente entre slots vacíos y llenos
- Todos los 9 slots siempre visibles (vacíos como placeholder, llenos con thumbnail)

### Click en thumbnails del detalle
- Mantener comportamiento actual: **abre lightbox fullscreen** con navegación por flechas
- Extender para soportar los 9 slots (producto y etiqueta juntos o separados en el lightbox)

### Vista edición
- **Sin cambios** — el layout actual (grid 3x2 producto + grid 3x1 etiqueta) es la referencia correcta

### Datos para la lista
- **Verificar** si GET /api/articulos ya devuelve imagenesProducto/imagenesEtiqueta
- Si ya los devuelve: contar en frontend con .filter(Boolean).length
- Si no los devuelve: agregar campos de conteo al DTO de lista para evitar transferir arrays completos

### Claude's Discretion
- Decidir si el lightbox navega producto y etiqueta como una sola secuencia o como dos grupos separados
- Elegir el color exacto del icono activo vs inactivo (consistente con el theme actual)
- Border-radius de los thumbnails en detalle (rounded-sm o rounded-md)

</decisions>

<specifics>
## Specific Ideas

- El usuario mencionó que el panel de edición es "el reflejo claro de cómo deben ser organizadas de manera ideal las imágenes" — usar como referencia de diseño
- Los 6 placeholders actuales del detalle muestran w-10 h-10 con bg-muted, hay que cambiar a w-12 h-12 con borde dashed
- Actualmente el sheet solo muestra 6 placeholders genéricos cuando no hay imágenes, sin distinguir producto de etiqueta
- Cuando hay imágenes, el sheet filtra nulls y muestra solo las que existen en grids de 4 columnas separadas — hay que cambiar a fila de 9 con todos los slots

</specifics>

<canonical_refs>
## Canonical References

- `apps/web/src/components/articulos/articulo-sheet.tsx` — Panel detalle actual con placeholders
- `apps/web/src/components/articulos/articulos-columns.tsx` — Definición de columnas de la tabla
- `apps/web/src/components/articulos/imagen-slot.tsx` — Componente de slot individual (referencia para placeholders)
- `apps/web/src/components/articulos/imagen-slot-grid.tsx` — Grid de imagen (referencia para layout)
- `apps/web/src/components/articulos/imagen-lightbox.tsx` — Lightbox existente
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — Vista edición (no modificar)

</canonical_refs>
