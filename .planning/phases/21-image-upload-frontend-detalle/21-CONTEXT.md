# Phase 21: Image Upload Frontend + Detalle - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

El usuario puede gestionar imágenes de artículos en slots etiquetados (3 etiqueta + 6 producto) desde el formulario de edición, con drag & drop y file picker. También puede ver el detalle completo de un artículo en el panel lateral (Sheet) con imágenes read-only y lightbox para preview. El backend de imágenes (upload, procesamiento, serving) ya está completo en Phase 20.

</domain>

<decisions>
## Implementation Decisions

### UI de slots de imagen

- Grid de cards cuadrados (aspect ratio 1:1), consistente con thumbnails 200x200 del backend
- 3 columnas para etiquetas, 3x2 (dos filas de 3) para productos
- Slot vacío: borde dashed con icono + y texto "Drop" / zona clickeable
- Slot lleno: thumbnail de la imagen con label del slot (Etiqueta 1, Producto 3)
- Botón eliminar (×): overlay semi-transparente en esquina superior, visible al hover
- Eliminación directa sin AlertDialog de confirmación — toast de feedback al eliminar
- Reemplazo directo: subir imagen a slot ocupado sobreescribe sin confirmar

### Drag & drop y upload flow

- Drop en slot específico: el archivo se arrastra sobre el slot exacto donde va
- El slot resalta visualmente cuando se hace hover con un archivo encima (drag over state)
- Click en slot vacío (o en el icono +) abre file picker del sistema como alternativa a D&D
- Feedback de upload: skeleton pulsante + spinner dentro del slot mientras sube y procesa
- Al completar, el skeleton se reemplaza por el thumbnail real

### Panel lateral de detalle (Sheet)

- Sección de imágenes ubicada después de los stat cards (Precio, Costo, Stock) y antes de los campos de texto
- Grid de thumbnails cuadrados read-only — solo visualización, no se puede subir desde el Sheet
- Solo muestra slots que tienen imagen (no muestra vacíos)
- Si el artículo no tiene ninguna imagen: grid de placeholders grises vacíos indicando los slots disponibles
- Separación visual entre Etiquetas y Productos con subtítulos

### Preview de imagen (Lightbox)

- Click en cualquier thumbnail abre lightbox con imagen detail (1000px)
- Navegación con flechas izquierda/derecha separada por tipo (si abriste etiqueta, navegás entre etiquetas; si abriste producto, entre productos)
- Indicador de posición (ej: 2/3)
- Atajos de teclado: flechas izq/der para navegar, Escape para cerrar
- Lightbox disponible en ambos contextos: formulario de edición y Sheet de detalle
- Mismo componente reutilizable para ambos contextos

### Claude's Discretion

- Implementación exacta del lightbox (Dialog custom vs librería)
- Animaciones y transiciones del drag & drop
- Diseño exacto del skeleton/spinner de carga
- Cómo mostrar errores de upload (toast con mensaje, tipo inválido, archivo muy grande)
- Organización de componentes (cuántos archivos, naming)

</decisions>

<specifics>
## Specific Ideas

- El edit page ya tiene `ImagePlaceholderGrid` placeholder (líneas 26-54 de editar/page.tsx) — reemplazar con componentes funcionales
- Layout actual del edit page es dos columnas: formulario (izquierda) + imágenes (derecha) — mantener esta estructura
- Las imágenes en el Sheet de detalle son thumbnails chicos, no ocupar mucho espacio vertical
- El lightbox separado por tipo permite que etiquetas y productos tengan contextos distintos (las etiquetas son fotos del empaque/sticker, los productos son fotos del artículo físico)

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ImagePlaceholderGrid` en `editar/page.tsx`: placeholder actual con grid dashed y botón disabled — reemplazar
- `ArticuloSheet` (`components/articulos/articulo-sheet.tsx`): panel lateral con stat cards y campos — agregar sección de imágenes
- `Dialog` (`components/ui/dialog.tsx`): base para el lightbox
- `Skeleton` (`components/ui/skeleton.tsx`): para estado de carga durante upload
- `Button`, `Badge`, `Card` en `components/ui/`: disponibles para el grid de slots
- `useToast()` hook: para feedback de upload/delete

### Established Patterns

- Forms: React Hook Form + Zod resolver + shadcn Form components
- API calls client: funciones en `lib/api.client.ts` con `getAuthHeaders()` — agregar `uploadArticuloImagen()` y `deleteArticuloImagen()`
- Estética Tabler: border-radius reducido, alturas compactas, text-sm base
- Backend image endpoints: `POST /api/articulos/:codigo/imagenes` (multipart: file + tipo + slot), `DELETE /api/articulos/:codigo/imagenes/:tipo/:slot`

### Integration Points

- `apps/web/src/lib/api.client.ts`: agregar funciones de upload/delete de imagen (FormData multipart)
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`: reemplazar ImagePlaceholderGrid con componentes funcionales
- `apps/web/src/components/articulos/articulo-sheet.tsx`: agregar sección de imágenes después de stat cards
- Backend response de upload/delete devuelve artículo completo actualizado — refrescar estado local sin fetch adicional
- URLs de thumbnail derivadas por convención: `_detail.webp` → `_thumb.webp`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 21-image-upload-frontend-detalle_
_Context gathered: 2026-03-12_
