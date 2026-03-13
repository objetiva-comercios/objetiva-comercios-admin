# Phase 21: Image Upload Frontend + Detalle - Research

**Researched:** 2026-03-12
**Domain:** React drag & drop file upload, image slot management, lightbox, Next.js image rendering
**Confidence:** HIGH

## Summary

Esta fase es puramente frontend: el backend de imágenes ya está 100% operativo desde Phase 20. El trabajo consiste en reemplazar el `ImagePlaceholderGrid` placeholder del edit page con un grid funcional de slots que soporte drag & drop y file picker, agregar la sección de imágenes al `ArticuloSheet`, e implementar un lightbox reutilizable para preview.

El dominio técnico central es manejo de drag & drop en React. El ecosistema ofrece dos rutas: usar la HTML5 Drag and Drop API nativa directamente (sin dependencias extra), o usar `react-dropzone` que encapsula la API nativa y también el file picker con una interfaz unificada. Para este caso de "drop en slot específico" la API nativa es perfectamente viable y evita una dependencia, pero `react-dropzone` por slot es igualmente limpio.

El lightbox más simple se implementa con el `Dialog` de Radix ya disponible en el proyecto — no requiere librería externa. El patrón de imagen en Next.js requiere configurar `remotePatterns` en `next.config.mjs` si se usa el componente `<Image>`, o usar `<img>` HTML estándar para URLs del mismo origen (backend en `localhost:3001`/`API_BASE_URL`).

**Primary recommendation:** Implementar drag & drop con HTML5 API nativa por slot (sin dependencias extra), lightbox con Dialog de Radix ya instalado, imágenes con `<img>` tag estándar apuntando a `API_BASE_URL` para evitar configuración de `next/image`.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**UI de slots de imagen:**

- Grid de cards cuadrados (aspect ratio 1:1), consistente con thumbnails 200x200 del backend
- 3 columnas para etiquetas, 3x2 (dos filas de 3) para productos
- Slot vacío: borde dashed con icono + y texto "Drop" / zona clickeable
- Slot lleno: thumbnail de la imagen con label del slot (Etiqueta 1, Producto 3)
- Botón eliminar (×): overlay semi-transparente en esquina superior, visible al hover
- Eliminación directa sin AlertDialog de confirmación — toast de feedback al eliminar
- Reemplazo directo: subir imagen a slot ocupado sobreescribe sin confirmar

**Drag & drop y upload flow:**

- Drop en slot específico: el archivo se arrastra sobre el slot exacto donde va
- El slot resalta visualmente cuando se hace hover con un archivo encima (drag over state)
- Click en slot vacío (o en el icono +) abre file picker del sistema como alternativa a D&D
- Feedback de upload: skeleton pulsante + spinner dentro del slot mientras sube y procesa
- Al completar, el skeleton se reemplaza por el thumbnail real

**Panel lateral de detalle (Sheet):**

- Sección de imágenes ubicada después de los stat cards (Precio, Costo, Stock) y antes de los campos de texto
- Grid de thumbnails cuadrados read-only — solo visualización, no se puede subir desde el Sheet
- Solo muestra slots que tienen imagen (no muestra vacíos)
- Si el artículo no tiene ninguna imagen: grid de placeholders grises vacíos indicando los slots disponibles
- Separación visual entre Etiquetas y Productos con subtítulos

**Preview de imagen (Lightbox):**

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                            | Research Support                                                                                             |
| ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| IMG-01  | User can upload images to labeled slots (3 etiqueta + 6 producto) stored on filesystem | Slot grid component con upload via FormData a `POST /api/articulos/:codigo/imagenes`                         |
| IMG-02  | User can preview uploaded images as thumbnails and remove individual images            | Slot lleno muestra `<img>` con URL thumb; botón × llama `DELETE /api/articulos/:codigo/imagenes/:tipo/:slot` |
| IMG-04  | User can drag & drop images into the corresponding slot in the form                    | HTML5 DnD API en cada slot con `onDragOver`, `onDrop`, `dragenter`/`dragleave` para highlight                |
| VIEW-02 | User can view articulo detail in a lateral panel/sheet showing all fields and images   | Sección de imágenes en `ArticuloSheet` con thumbnails read-only y lightbox                                   |

</phase_requirements>

---

## Standard Stack

### Core

| Library                  | Version                   | Purpose                                     | Why Standard                                             |
| ------------------------ | ------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| HTML5 Drag and Drop API  | nativa                    | Drop en slots individuales                  | Sin dependencias, control total por slot, bien soportada |
| `@radix-ui/react-dialog` | ya instalado (via shadcn) | Lightbox fullscreen                         | Ya presente en el proyecto, accesible por defecto        |
| `next/image` o `<img>`   | next 14                   | Renderizar thumbnails                       | `<img>` evita configuración extra para mismo origen      |
| `lucide-react`           | ya instalado              | Iconos (X, ZoomIn, ChevronLeft/Right, Plus) | Ya en uso en el proyecto                                 |

### Supporting

| Library                 | Version      | Purpose                              | When to Use                            |
| ----------------------- | ------------ | ------------------------------------ | -------------------------------------- |
| `useToast` hook         | ya instalado | Feedback upload/delete               | Ya en uso en editar/page.tsx           |
| `Skeleton` component    | ya instalado | Loading state durante upload         | Ya en uso en articulo-sheet.tsx        |
| `useCallback`, `useRef` | React nativo | Gestión de file input ref + handlers | Necesario para input[type=file] hidden |

### Alternatives Considered

| Instead of             | Could Use                    | Tradeoff                                                                                                                          |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| HTML5 DnD nativa       | `react-dropzone`             | react-dropzone unifica DnD + file picker elegantemente pero agrega dependencia; para slot-per-drop, DnD nativa funciona igual     |
| Dialog custom lightbox | `yet-another-react-lightbox` | La librería agrega ~20KB pero tiene navegación, zoom, touch ya hecho; Dialog custom es suficiente para el caso de uso simple aquí |
| `<img>` HTML           | `next/image`                 | next/image requiere `remotePatterns` en config para URLs externas; `<img>` funciona sin config para el API_BASE_URL               |

**Installation:**

```bash
# No hay nuevas dependencias requeridas — todo ya está instalado
```

---

## Architecture Patterns

### Recommended Component Structure

```
apps/web/src/components/articulos/
├── imagen-slot.tsx          # Un slot individual (vacío o con imagen, DnD, upload, delete)
├── imagen-slot-grid.tsx     # Grid de slots por tipo (etiqueta | producto)
├── imagen-lightbox.tsx      # Dialog fullscreen con navegación por tipo
└── articulo-sheet.tsx       # (existente) — agregar sección de imágenes
```

### Pattern 1: Slot con HTML5 Drag & Drop

**What:** Cada slot es su propia zona de drop con estado local `isDraggingOver` + `isUploading`
**When to use:** Drop por slot específico (no drop en zona global)

```tsx
// Source: HTML5 DnD API + React state
function ImagenSlot({ tipo, slot, url, articuloCodigo, onUpdated }) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()           // Necesario para habilitar drop
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Solo si el cursor salió del elemento (no de un hijo)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }

  function handleClick() {
    if (!isUploading) inputRef.current?.click()
  }

  async function uploadFile(file: File) {
    setIsUploading(true)
    try {
      const updated = await uploadArticuloImagen(articuloCodigo, tipo, slot, file)
      onUpdated(updated)
      toast({ title: 'Imagen subida correctamente' })
    } catch (err) {
      toast({ title: 'Error al subir imagen', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className={cn(
        'aspect-square relative rounded-sm border-2 cursor-pointer overflow-hidden',
        isDraggingOver ? 'border-primary bg-primary/10' : 'border-dashed border-muted-foreground/30',
        isUploading && 'pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {isUploading ? (
        <Skeleton className="w-full h-full animate-pulse" />
      ) : url ? (
        <SlotFull url={url} tipo={tipo} slot={slot} onDelete={...} onPreview={...} />
      ) : (
        <SlotEmpty tipo={tipo} slot={slot} />
      )}
      <input ref={inputRef} type="file" className="sr-only" accept="image/*" onChange={...} />
    </div>
  )
}
```

### Pattern 2: Thumb URL derivada por convención

**What:** La URL almacenada en DB es siempre la `_detail.webp`. El thumb se deriva reemplazando `_detail.webp` → `_thumb.webp`
**When to use:** Al renderizar thumbnails en el slot (200x200) y para el lightbox (1000px)

```ts
// Source: State.md decision + articulos-imagenes.service.ts línea 56-57
function getThumbUrl(detailUrl: string): string {
  return detailUrl.replace('_detail.webp', '_thumb.webp')
}

// Thumb para slots/sheet: usar getThumbUrl(detailUrl)
// Detail para lightbox: usar detailUrl directamente
// Prefijo: las URLs en DB son relativas (/api/uploads/...) — prepend API_BASE_URL para <img src>
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const thumbSrc = `${API_BASE_URL}${getThumbUrl(detailUrl)}`
```

### Pattern 3: Lightbox con Dialog de Radix

**What:** Dialog fullscreen que recibe un array de imágenes del mismo tipo y el índice inicial
**When to use:** Click en cualquier thumbnail tanto desde edit page como desde Sheet

```tsx
// Source: Dialog ya instalado en components/ui/dialog.tsx
interface LightboxProps {
  images: string[] // detail URLs del mismo tipo
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ImagenLightbox({ images, initialIndex, open, onOpenChange }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex)

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setCurrent(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, images.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95">
        {/* imagen + flechas + contador */}
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern 4: API functions en api.client.ts

**What:** Dos funciones nuevas siguiendo el patrón existente de `uploadLogo`
**When to use:** Cualquier llamada al backend de imágenes

```ts
// Source: api.client.ts uploadLogo como referencia
export async function uploadArticuloImagen(
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number,
  file: File
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tipo', tipo)
  formData.append('slot', slot.toString())
  const response = await fetch(
    `${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}/imagenes`,
    { method: 'POST', headers, body: formData }
  )
  await throwIfError(response)
  return response.json()
}

export async function deleteArticuloImagen(
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}/imagenes/${tipo}/${slot}`,
    { method: 'DELETE', headers }
  )
  await throwIfError(response)
  return response.json()
}
```

### Anti-Patterns to Avoid

- **No pasar `Content-Type: application/json` en el fetch de upload**: FormData requiere que el browser setee el boundary automáticamente — pasar Content-Type manualmente lo rompe. Ver patrón de `uploadLogo` que solo pasa `headers` (sin Content-Type).
- **No usar `next/image` para las URLs del backend**: Requeriría agregar `remotePatterns` a next.config.mjs y el backend no tiene la misma URL en dev vs prod. Usar `<img>` HTML estándar.
- **No derivar índice de slot desde el array index**: Los arrays en DB pueden tener `null` en posiciones vacías (e.g., `[null, "/api/uploads/...", null]`). Índice de slot = índice del array + 1 (1-based).
- **DragLeave falso positivo**: `dragLeave` se dispara cuando el cursor pasa sobre elementos hijos del slot. Verificar `!e.currentTarget.contains(e.relatedTarget)` antes de quitar el highlight.

---

## Don't Hand-Roll

| Problem              | Don't Build                   | Use Instead                                                          | Why                                                                               |
| -------------------- | ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lightbox accesible   | Custom modal desde cero       | `Dialog` de Radix ya instalado                                       | Radix maneja focus trap, Escape, aria-modal, portal                               |
| File type validation | Validación manual en frontend | Combinar `accept="image/*"` en input + mensajes de error del backend | Backend ya valida con `ALLOWED_MIME_TYPES` y devuelve 400 con mensaje descriptivo |
| Image processing     | sharp en frontend             | El backend ya procesa con sharp (Phase 20)                           | Frontend solo sube el File crudo                                                  |

**Key insight:** El backend ya es el source of truth de los arrays de imágenes. Tras cualquier upload o delete, el backend devuelve el artículo actualizado completo — el frontend solo necesita `setArticulo(updated)` sin fetch adicional.

---

## Common Pitfalls

### Pitfall 1: `dragLeave` se dispara en elementos hijos

**What goes wrong:** Al mover el cursor dentro del slot hacia un hijo (ej: el icono), se dispara `dragLeave` y el highlight visual desaparece.
**Why it happens:** `dragLeave` es un evento que se bubbles desde el elemento que el cursor abandonó, incluyendo hijos del contenedor.
**How to avoid:** `if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false)`
**Warning signs:** El highlight parpadea al mover el mouse dentro del slot.

### Pitfall 2: Content-Type en FormData upload

**What goes wrong:** El browser no puede calcular el multipart boundary si se pasa `Content-Type: multipart/form-data` manualmente.
**Why it happens:** El header debe incluir el boundary generado automáticamente por el browser.
**How to avoid:** Pasar solo el header Authorization, nunca Content-Type en uploads con FormData. Ver `uploadLogo` como referencia.
**Warning signs:** Backend devuelve 400 "Unexpected end of form" o "Missing boundary".

### Pitfall 3: Null slots en el array de imágenes

**What goes wrong:** `articulo.imagenesProducto` puede ser `[null, "/api/...", null, "/api/..."]` — los nulls representan slots vacíos entre slots ocupados.
**Why it happens:** El backend escribe en posiciones específicas del array (1-based index → 0-based) y puede dejar nulos en posiciones vacías.
**How to avoid:** Siempre iterar de 0 a maxSlot-1 fijo (no `array.length`), y verificar `array[i] != null` antes de mostrar imagen.
**Warning signs:** Slots que "desaparecen" cuando hay huecos en el array.

### Pitfall 4: URL relativa del backend sin prefijo API_BASE_URL

**What goes wrong:** Las URLs en DB son relativas (`/api/uploads/articulos/...`) — usarlas directamente en `<img src>` hace fetch al mismo origen del frontend (Next.js), no al backend.
**Why it happens:** El backend almacena URLs relativas por portabilidad.
**How to avoid:** Siempre prepend `API_BASE_URL` al renderizar: `src={${API_BASE_URL}${url}}`
**Warning signs:** Imágenes 404 en desarrollo (Next.js en 3000, backend en 3001).

### Pitfall 5: Sincronización de estado tras upload/delete

**What goes wrong:** El edit page tiene `articulo` en state local. El Sheet también puede tener el artículo desde la lista de articulos. Si se sube desde el edit page, el Sheet no se actualiza automáticamente.
**Why it happens:** Estado local no compartido entre componentes no relacionados.
**How to avoid:** El edit page llama `setArticulo(updated)` tras upload/delete. El Sheet se re-abre con datos frescos desde la lista (que tiene su propio fetch). No requiere estado global para este caso.

---

## Code Examples

### Derivar thumb URL

```ts
// Source: articulos-imagenes.service.ts buildFileName pattern
// Detail: CODIGO_1_detail.webp → Thumb: CODIGO_1_thumb.webp
function getThumbUrl(detailUrl: string): string {
  return detailUrl.replace('_detail.webp', '_thumb.webp')
}
```

### Iterar slots correctamente

```tsx
// Source: análisis del schema — arrays JSONB indexados 1-based
const MAX_SLOTS = { etiqueta: 3, producto: 6 }

function renderSlots(tipo: 'etiqueta' | 'producto', urls: (string | null)[]) {
  return Array.from({ length: MAX_SLOTS[tipo] }, (_, i) => {
    const slotNumber = i + 1 // 1-based
    const url = urls[i] ?? null // null si vacío
    return <ImagenSlot key={slotNumber} slot={slotNumber} url={url} tipo={tipo} />
  })
}
```

### Input file oculto con ref

```tsx
// Source: patrón estándar React para file picker programático
const inputRef = useRef<HTMLInputElement>(null)

// Click handler en el slot:
function handleClick() {
  if (!isUploading) inputRef.current?.click()
}

// En el JSX:
;<input
  ref={inputRef}
  type="file"
  className="sr-only"
  accept="image/jpeg,image/png,image/webp"
  onChange={e => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = '' // Reset para permitir reseleccionar el mismo archivo
  }}
/>
```

### Lightbox con useEffect para keyboard

```tsx
// Source: patrón estándar React + Radix Dialog
useEffect(() => {
  if (!open) return
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setCurrent(prev => Math.max(0, prev - 1))
    if (e.key === 'ArrowRight') setCurrent(prev => Math.min(images.length - 1, prev + 1))
    // Escape ya lo maneja Radix Dialog internamente
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [open, images.length])
```

---

## State of the Art

| Old Approach                        | Current Approach                | When Changed | Impact                                                    |
| ----------------------------------- | ------------------------------- | ------------ | --------------------------------------------------------- |
| Drop zone global + selector de slot | Drop en slot específico         | 2023+        | UX más directa, sin paso intermedio                       |
| `<img>` con src directo             | `next/image` con remotePatterns | Next.js 13+  | Para este caso con API local, `<img>` sigue siendo válido |

**Deprecated/outdated:**

- `onDragEnter` para highlight: menos confiable que `onDragOver` — usar `onDragOver` para el highlight y `onDragLeave` para quitar.

---

## Open Questions

1. **¿Cómo trata el ArticuloSheet el artículo actualizado tras un upload desde el edit page?**
   - What we know: El Sheet se abre desde la lista de artículos y recibe `articulo` como prop. El edit page tiene su propio state local.
   - What's unclear: Si el usuario navega: lista → abre Sheet → hace click en Editar → sube imagen → vuelve a lista → abre Sheet de nuevo, ¿el Sheet tiene los datos frescos?
   - Recommendation: El Sheet se alimenta desde la lista, que debe re-fetchear al montar. No es responsabilidad de esta fase — la lista ya tiene su propio ciclo de fetch.

2. **¿El Articulo type ya soporta `(string | null)[]` para imagenesProducto/imagenesEtiqueta?**
   - What we know: El tipo actual declara `imagenesProducto: string[]` y `imagenesEtiqueta: string[]` (sin null).
   - What's unclear: El backend puede devolver `[null, "/api/...", null]` pero el tipo no lo refleja.
   - Recommendation: Actualizar el tipo a `(string | null)[]` o hacer type assertion al iterar. Sin este cambio TypeScript dará errores al verificar `url != null`.

---

## Validation Architecture

> `workflow.nyquist_validation` no está definido en config.json — se trata como habilitado.

### Test Framework

| Property           | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| Framework          | No detectado en `apps/web` (no hay jest.config, vitest.config, ni carpeta tests) |
| Config file        | Wave 0 — crear si necesario                                                      |
| Quick run command  | N/A — no existe framework de tests en apps/web actualmente                       |
| Full suite command | N/A                                                                              |

### Phase Requirements → Test Map

| Req ID  | Behavior                                    | Test Type    | Automated Command                                                               | File Exists?          |
| ------- | ------------------------------------------- | ------------ | ------------------------------------------------------------------------------- | --------------------- |
| IMG-01  | Upload via FormData a backend endpoint      | manual/smoke | Playwright: navegar a edit page, drop file en slot, verificar thumbnail aparece | ❌ Wave 0 si se añade |
| IMG-02  | Thumbnail visible + botón eliminar funciona | manual/smoke | Playwright: click × en slot lleno, verificar slot vuelve a vacío                | ❌ Wave 0 si se añade |
| IMG-04  | Drag & drop file en slot                    | manual/smoke | Playwright: simular drag & drop con `page.dispatchEvent`                        | ❌ Wave 0 si se añade |
| VIEW-02 | Sheet muestra imágenes read-only            | manual/smoke | Playwright: abrir sheet desde lista, verificar sección imágenes                 | ❌ Wave 0 si se añade |

### Sampling Rate

- **Per task commit:** Verificación manual visual en el browser (no hay runner automatizado)
- **Per wave merge:** Playwright smoke test manual o via MCP playwright del proyecto
- **Phase gate:** Verificación visual completa antes de `/gsd:verify-work`

### Wave 0 Gaps

- No existe infraestructura de tests en `apps/web` — esta fase puede proceder con verificación manual + Playwright MCP
- Si se quiere testing automatizado: `pnpm add -D vitest @testing-library/react @testing-library/user-event` en `apps/web`

_(Recomendación: Verificar manualmente con Playwright MCP — esta es una fase de componentes UI, no lógica de negocio compleja)_

---

## Sources

### Primary (HIGH confidence)

- Código fuente del proyecto — `articulos-imagenes.controller.ts`, `articulos-imagenes.service.ts` (API contract verificado)
- `apps/web/src/types/articulo.ts` — schema de tipos verificado
- `apps/web/src/lib/api.client.ts` — patrón de `uploadLogo` como referencia para FormData
- `apps/web/src/components/ui/dialog.tsx` — Dialog de Radix disponible y verificado
- `apps/web/src/components/articulos/articulo-sheet.tsx` — estructura actual verificada
- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — `ImagePlaceholderGrid` verificado

### Secondary (MEDIUM confidence)

- HTML5 Drag and Drop API — comportamiento de `dragLeave` con hijos verificado por conocimiento del spec + patrón `contains(relatedTarget)` ampliamente documentado
- Patrón de `input[type=file]` hidden con ref — patrón estándar React

### Tertiary (LOW confidence)

- Ninguno — todo se verificó contra código fuente existente

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — todo verificado contra código existente, sin nuevas dependencias
- Architecture: HIGH — API contract completo del backend disponible, patrones existentes del proyecto como referencia
- Pitfalls: HIGH — identificados directamente del código del backend (null arrays, URL relativas, FormData boundary)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stack estable, no hay cambios esperados)
